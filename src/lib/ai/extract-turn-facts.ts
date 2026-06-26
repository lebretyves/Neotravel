import type { LeadQualification } from "../domain/schemas";

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
): Partial<LeadQualification> {
  const facts: Partial<LeadQualification> = {};

  if (!existing.departure_date) {
    const departureDate = parseDepartureDate(message, referenceDate);
    if (departureDate) facts.departure_date = departureDate;
  }

  if (!existing.passenger_count && existing.departure_date) {
    const passengerCount = parseStandalonePassengerCount(message);
    if (passengerCount) facts.passenger_count = passengerCount;
  }

  return facts;
}

function parseDepartureDate(message: string, referenceDate: Date): string | undefined {
  const normalized = message.trim().toLocaleLowerCase("fr-FR");
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

  const isoDate = /^(\d{4}-\d{2}-\d{2})$/u.exec(normalized);
  if (isoDate) return isoDate[1];

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

function parseStandalonePassengerCount(message: string): number | undefined {
  const match = /^(\d{1,3})\s*(?:passagers?|personnes?|pax)?\s*[.!?]?$/iu.exec(message.trim());
  if (!match) return undefined;

  const passengerCount = Number(match[1]);
  return passengerCount > 0 ? passengerCount : undefined;
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
