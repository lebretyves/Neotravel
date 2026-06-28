import type { LeadQualification } from "../domain/schemas";

const ROUND_TRIP_PATTERN =
  /\baller[- /]retour\b|\baller\s+et\s+retour\b|\bon\s+reviendra\b|\btrajet\s+retour\b|\bvoyage\s+aller[- ]retour\b/iu;

const ONE_WAY_PATTERN =
  /\baller\s+simple\b|\bsans\s+retour\b|\bjuste\s+l['']aller\b|\btrajet\s+simple\b/iu;

function parseTripType(message: string): LeadQualification["trip_type"] | undefined {
  const normalized = normalizeUserText(message);
  if (ROUND_TRIP_PATTERN.test(normalized)) return "round_trip";
  if (ONE_WAY_PATTERN.test(normalized)) return "one_way";
  return undefined;
}

const MONTHS: Record<string, number> = {
  janvier: 0,
  février: 1,
  fevrier: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  août: 7,
  aout: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  décembre: 11,
  decembre: 11,
};

export function extractTurnFacts(
  message: string,
  existing: LeadQualification,
  referenceDate: Date,
  lastAssistantText = "",
): Partial<LeadQualification> {
  const facts: Partial<LeadQualification> = {};
  const cityMentions = parseCityMentions(message);
  const contextualCity = parseContextualCityAnswer(message);

  if (!existing.departure_city && cityMentions.departure_city) {
    facts.departure_city = cityMentions.departure_city;
  }

  if (!existing.arrival_city && cityMentions.arrival_city) {
    facts.arrival_city = cityMentions.arrival_city;
  }

  if (contextualCity) {
    if (!existing.departure_city && !facts.departure_city && asksForDepartureCity(lastAssistantText)) {
      facts.departure_city = contextualCity;
    } else if (!existing.arrival_city && !facts.arrival_city && asksForArrivalCity(lastAssistantText)) {
      facts.arrival_city = contextualCity;
    }
  }

  if (!existing.departure_date) {
    const departureDate = parseDepartureDate(message, referenceDate);
    if (departureDate) facts.departure_date = departureDate;
  }

  if (!existing.passenger_count && existing.departure_date) {
    const passengerCount = parsePassengerCount(message);
    if (passengerCount) facts.passenger_count = passengerCount;
  }

  if (!existing.trip_type) {
    const tripType = parseTripType(message);
    if (tripType) facts.trip_type = tripType;
  }

  return facts;
}

function parseCityMentions(message: string): Pick<LeadQualification, "departure_city" | "arrival_city"> {
  const facts: Pick<LeadQualification, "departure_city" | "arrival_city"> = {};
  const normalized = normalizeUserText(message);
  const compactRoute = /(?:^|\b)(?:je|on|nous)?\s*(?:pars?|part|partons|dépars?|depart|suis|sommes|habite)\s+(?:de|depuis|à|a)\s+(.+?)\s+(?:et\s+)?(?:je|on|nous)?\s*(?:vais|va|allons|allez|aller|partons|arrivons|veux\s+aller|souhaite\s+aller)\s+(?:à|a|vers|sur|pour)\s+(.+?)(?:$|[.!?])/iu.exec(normalized);

  if (compactRoute) {
    facts.departure_city = cleanCity(compactRoute[1]);
    facts.arrival_city = cleanCity(compactRoute[2]);
    return compactFacts(facts);
  }

  const directRoute = /(?:^|\b)(?:de|depuis)\s+(.+?)\s+(?:à|a|vers|pour)\s+(.+?)(?:$|[.!?])/iu.exec(normalized);

  if (directRoute) {
    facts.departure_city = cleanCity(directRoute[1]);
    facts.arrival_city = cleanCity(directRoute[2]);
    return compactFacts(facts);
  }

  const departure = /(?:^|\b)(?:je|on|nous)?\s*(?:pars?|part|partons|dépars?|depart|suis|sommes|habite|départ|depart)\s+(?:de|depuis|à|a)\s+(.+?)(?:$|[.!?]|,|;|\s+et\s+|\s+pour\s+|\s+vers\s+)/iu.exec(normalized);
  if (departure) facts.departure_city = cleanCity(departure[1]);

  const arrival = /(?:^|\b)(?:je|on|nous)?\s*(?:vais|va|allons|allez|aller|veux\s+aller|souhaite\s+aller|arrivons|destination)\s+(?:à|a|vers|sur|pour)\s+(.+?)(?:$|[.!?]|,|;|\s+et\s+)/iu.exec(normalized);
  if (arrival) facts.arrival_city = cleanCity(arrival[1]);

  return compactFacts(facts);
}

function asksForDepartureCity(message: string) {
  return /ville\s+de\s+d[eé]part|d['’]o[uù]\s+.*partez|d['’]o[uù]\s+.*part|point\s+de\s+d[eé]part/iu.test(message);
}

function asksForArrivalCity(message: string) {
  return /ville\s+d['’]arriv[eé]e|destination|o[uù]\s+.*allez|o[uù]\s+.*souhaitez.*aller/iu.test(message);
}

function parseContextualCityAnswer(message: string): string | undefined {
  const normalized = message.trim().replace(/[.!?]+$/u, "");
  if (!normalized || normalized.length > 80) return undefined;
  if (/\d|@|https?:|,|;|\/|\\|→/u.test(normalized)) return undefined;
  if (/\b(passagers?|personnes?|aller|retour|devis|date|demain|semaine|mois|bonjour|salut|hello|merci)\b/iu.test(normalized)) {
    return undefined;
  }

  const city = normalized.replace(/\s+/gu, " ");
  if (!/^[\p{L}][\p{L}'’ -]*$/u.test(city)) return undefined;

  return cleanCity(city);
}

function parseDepartureDate(message: string, referenceDate: Date): string | undefined {
  const normalized = normalizeUserText(message).toLocaleLowerCase("fr-FR");
  if (/^(?:demain|dem1)\b/u.test(normalized)) return addDays(referenceDate, 1);

  const relativeDays = /^dans\s+(\d+)\s+jours?\b/u.exec(normalized);

  if (relativeDays) {
    return addDays(referenceDate, Number(relativeDays[1]));
  }

  if (/^d[’']ici\s+une\s+semaine\b/u.test(normalized)) {
    return addDays(referenceDate, 7);
  }

  if (/^d[’']ici\s+deux\s+semaines\b/u.test(normalized)) {
    return addDays(referenceDate, 14);
  }

  if (/^(?:la\s+)?semaine\s+prochaine\b/u.test(normalized)) {
    return addDays(referenceDate, 7);
  }

  const isoDate = /^(\d{4}-\d{2}-\d{2})$/u.exec(normalized);
  if (isoDate) return isoDate[1];

  const slashDate = /^(?:le\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?[.!?]?$/u.exec(normalized);
  if (slashDate) {
    const day = Number(slashDate[1]);
    const month = Number(slashDate[2]) - 1;
    let year = slashDate[3] ? Number(slashDate[3]) : referenceDate.getUTCFullYear();
    if (year < 100) year += 2000;
    let candidate = calendarDate(year, month, day);
    if (!candidate) return undefined;
    if (!slashDate[3] && candidate < startOfUtcDay(referenceDate)) {
      candidate = calendarDate(year + 1, month, day);
      if (!candidate) return undefined;
    }
    return candidate.toISOString().slice(0, 10);
  }

  const explicitDate = /^(?:le\s+)?(\d{1,2})\s+([a-zéû]+)(?:\s+(\d{4}))?[.!?]?$/u.exec(normalized);
  if (!explicitDate) return undefined;

  const month = MONTHS[explicitDate[2]];
  if (month === undefined) return undefined;

  const day = Number(explicitDate[1]);
  let year = explicitDate[3] ? Number(explicitDate[3]) : referenceDate.getUTCFullYear();
  let candidate = calendarDate(year, month, day);
  if (!candidate) return undefined;

  if (!explicitDate[3] && candidate < startOfUtcDay(referenceDate)) {
    year += 1;
    candidate = calendarDate(year, month, day);
    if (!candidate) return undefined;
  }

  return candidate.toISOString().slice(0, 10);
}

function parsePassengerCount(message: string): number | undefined {
  const match = /(?:^|\b)(?:on\s+est|nous\s+sommes|nous\s+serons|on\s+sera|nous\s+seront|environ|à\s+peu\s+près|a\s+peu\s+pres|~)?\s*(\d{1,3})\s*(?:passagers?|personnes?|pers\.?|pax)?\b/iu.exec(message.trim());
  if (!match) return undefined;

  const passengerCount = Number(match[1]);
  return passengerCount > 0 ? passengerCount : undefined;
}

function normalizeUserText(value: string) {
  return value
    .trim()
    .replace(/[’`]/gu, "'")
    .replace(/\s+/gu, " ")
    .replace(/\bj\s*(?:vais|vai|vé|ve|v)\b/giu, "je vais")
    .replace(/\bj\s*(?:pars|part|par)\b/giu, "je pars")
    .replace(/\bj\s*(?:suis|sui|s)\b/giu, "je suis")
    .replace(/\bchui\b/giu, "je suis")
    .replace(/\bjsuis\b/giu, "je suis")
    .replace(/\bjveux\b|\bjve\b|\bj\s*veux\b/giu, "je veux")
    .replace(/\bje\s+part\b/giu, "je pars")
    .replace(/\bje\s+sui\b/giu, "je suis")
    .replace(/\bsainté\b/giu, "Saint Étienne")
    .replace(/\ba\b/giu, "à");
}

function cleanCity(value: string | undefined): string | undefined {
  const city = value
    ?.trim()
    .replace(/[.!?]+$/u, "")
    .replace(/\b(?:svp|stp|merci|s'il vous plait|s’il vous plaît)$/iu, "")
    .trim();

  if (!city || city.length > 60) return undefined;
  if (!/^[\p{L}][\p{L}'’ -]*$/u.test(city)) return undefined;

  return city
    .split(/([\s'’ -])/u)
    .map((part) => (/^[\p{L}]/u.test(part) ? part.charAt(0).toLocaleUpperCase("fr-FR") + part.slice(1) : part))
    .join("");
}

function compactFacts<T extends Record<string, unknown>>(facts: T): T {
  return Object.fromEntries(Object.entries(facts).filter(([, value]) => value !== undefined)) as T;
}

function addDays(date: Date, days: number): string {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function calendarDate(year: number, month: number, day: number): Date | undefined {
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return undefined;
  }

  return date;
}
