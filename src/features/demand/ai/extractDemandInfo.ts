import type { DemandDraft, TripType } from "@/shared/types/lead";

const passengerPattern = /(\d{1,3})\s*(?:passagers?|personnes?|pax)\b/i;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const isoDatePattern = /\b(20\d{2}-\d{2}-\d{2})\b/;
const frenchDatePattern =
 /\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(20\d{2})\b/i;
const frenchDateWithoutYearPattern =
 /\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/i;

const frenchMonths: Record<string, string> = {
 janvier: "01",
 fevrier: "02",
 mars: "03",
 avril: "04",
 mai: "05",
 juin: "06",
 juillet: "07",
 aout: "08",
 septembre: "09",
 octobre: "10",
 novembre: "11",
 decembre: "12"
};

const ignoredSingleWords = new Set([
 "bonjour",
 "salut",
 "hello",
 "merci",
 "ok",
 "oui",
 "non",
 "depart",
 "arrivee",
 "destination",
 "date",
 "passager",
 "passagers",
 "personne",
 "personnes"
]);

const cityNamePrefixes = new Set(["la", "le", "les", "saint", "sainte", "new", "aix"]);

function normalizeForParsing(value: string) {
 return value
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .replace(/[’`]/g, "'")
  .replace(/[→➜➡]/g, "->")
  .toLowerCase();
}

function cleanCity(value: string) {
 return value
  .replace(/^(ville de depart|point de depart|depart|depuis|ville d'arrivee|arrivee|destination|vers|de|a)\s+/i, "")
  .replace(/\s+(aujourd'hui|aujourdhui|demain)\b.*$/i, "")
  .replace(/\s+(le|pour|avec|date|passagers?|personnes?|pax|retour|aller|option|options)\s*$/i, "")
  .replace(/\s+(le|pour|avec|date|passagers?|personnes?|pax|retour|aller|option|options)\s.+$/i, "")
  .replace(/[.,;:!?]+$/g, "")
  .replace(/\s+/g, " ")
  .trim();
}

function titleCity(value: string) {
 return value
  .trim()
  .toLowerCase()
  .replace(/(^|[\s'-])(\p{L})/gu, (_match, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

function toCity(value: string) {
 const city = cleanCity(value);
 if (!city || ignoredSingleWords.has(city.toLowerCase())) return null;
 return titleCity(city);
}

function isCityOnlyLine(value: string) {
 const cleaned = cleanCity(value);
 if (!cleaned || ignoredSingleWords.has(cleaned.toLowerCase())) return false;
 if (/\d|@|https?:\/\//i.test(cleaned)) return false;
 if (/\b(passagers?|personnes?|pax|date|retour|aller|devis|option|options)\b/i.test(cleaned)) return false;
 return /^[\p{L}' -]{2,60}$/u.test(cleaned);
}

function extractPairFromLine(line: string) {
 const normalized = normalizeForParsing(line);
 const cityPart = "([\\p{L}' -]{2,60}?)";
 const patterns = [
  new RegExp(`\\b(?:depart|ville de depart|point de depart)\\s*:?\\s*${cityPart}\\s+(?:arrivee|ville d'arrivee|destination|vers|a|->)\\s*:?\\s*${cityPart}\\b`, "iu"),
  new RegExp(`\\b(?:de|depuis)\\s+${cityPart}\\s+(?:a|vers|jusqu'a|jusqua|->)\\s+${cityPart}\\b`, "iu"),
  new RegExp(`\\b${cityPart}\\s*(?:->|vers|a)\\s*${cityPart}\\b`, "iu")
 ];

 for (const pattern of patterns) {
  const match = normalized.match(pattern);
  const departureCity = match?.[1] ? toCity(match[1]) : null;
  const arrivalCity = match?.[2] ? toCity(match[2]) : null;
  if (departureCity && arrivalCity) return { departureCity, arrivalCity };
 }

 const words = normalized.split(/\s+/).filter(Boolean);
 if (
  words.length === 2 &&
  words.every((word) => /^[\p{L}'-]{2,40}$/u.test(word)) &&
  !cityNamePrefixes.has(words[0]) &&
  !ignoredSingleWords.has(words[0]) &&
  !ignoredSingleWords.has(words[1])
 ) {
  return {
   departureCity: titleCity(words[0]),
   arrivalCity: titleCity(words[1])
  };
 }

 return null;
}

function extractLabelledCity(line: string) {
 const normalized = normalizeForParsing(line);
 const departureMatch = normalized.match(/\b(?:depart|ville de depart|point de depart|depuis)\s*:?\s*([\p{L}' -]{2,60})\b/iu);
 if (departureMatch?.[1]) return { type: "departure" as const, city: toCity(departureMatch[1]) };

 const arrivalMatch = normalized.match(/\b(?:arrivee|ville d'arrivee|destination)\s*:?\s*([\p{L}' -]{2,60})\b/iu);
 if (arrivalMatch?.[1]) return { type: "arrival" as const, city: toCity(arrivalMatch[1]) };

 return null;
}

function detectRoute(message: string) {
 const route: Pick<DemandDraft, "departureCity" | "arrivalCity"> = {
  departureCity: null,
  arrivalCity: null
 };
 const lines = message
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

 for (const line of lines) {
  const pair = extractPairFromLine(line);
  if (pair) {
   route.departureCity = pair.departureCity;
   route.arrivalCity = pair.arrivalCity;
   continue;
  }

  const labelledCity = extractLabelledCity(line);
  if (labelledCity?.city) {
   if (labelledCity.type === "departure") route.departureCity = labelledCity.city;
   if (labelledCity.type === "arrival") route.arrivalCity = labelledCity.city;
   continue;
  }

  if (!isCityOnlyLine(normalizeForParsing(line))) continue;
  const city = toCity(normalizeForParsing(line));
  if (!city) continue;

  if (!route.departureCity) {
   route.departureCity = city;
  } else if (!route.arrivalCity && route.departureCity.toLowerCase() !== city.toLowerCase()) {
   route.arrivalCity = city;
  }
 }

 return route;
}

function detectTripType(message: string): TripType | null {
 const normalized = normalizeForParsing(message);
 if (/aller[- ]?retour|retour/.test(normalized)) return "round_trip";
 if (/aller simple|one way/.test(normalized)) return "one_way";
 return null;
}

function detectOptions(message: string) {
 const normalized = normalizeForParsing(message);
 return [
  /guide|accompagnateur/.test(normalized) ? "guide" : null,
  /nuit chauffeur/.test(normalized) ? "nuit_chauffeur" : null,
  /peage/.test(normalized) ? "peages" : null
 ].filter((option): option is string => Boolean(option));
}

function detectOrganization(message: string, email?: string) {
 if (!email) return null;
 const beforeEmail = message.slice(0, message.indexOf(email)).trim();
 if (!beforeEmail || beforeEmail.length > 80) return null;
 return beforeEmail.replace(/^(bonjour|salut|hello)[, ]+/i, "").trim() || null;
}

function detectDepartureDate(message: string) {
 const isoMatch = message.match(isoDatePattern);
 if (isoMatch?.[1]) return isoMatch[1];

 const normalized = normalizeForParsing(message);
 if (/\bdemain\b/i.test(normalized)) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
 }

 if (/\b(aujourd'hui|aujourdhui)\b/i.test(normalized)) {
  return new Date().toISOString().slice(0, 10);
 }

 const frenchMatch = normalized.match(frenchDatePattern);
 if (frenchMatch) {
  const day = frenchMatch[1].padStart(2, "0");
  const month = frenchMonths[frenchMatch[2].toLowerCase()];
  const year = frenchMatch[3];
  return month ? `${year}-${month}-${day}` : null;
 }

 const dateWithoutYearMatch = normalized.match(frenchDateWithoutYearPattern);
 if (!dateWithoutYearMatch) return null;

 const day = dateWithoutYearMatch[1].padStart(2, "0");
 const month = frenchMonths[dateWithoutYearMatch[2].toLowerCase()];
 if (!month) return null;

 const today = new Date();
 const currentYear = today.getFullYear();
 const candidate = `${currentYear}-${month}-${day}`;
 const candidateDate = new Date(`${candidate}T12:00:00`);
 return candidateDate.getTime() < today.getTime() ? `${currentYear + 1}-${month}-${day}` : candidate;
}

export async function extractDemandInfo(message: string): Promise<DemandDraft> {
 const route = detectRoute(message);
 const passengerMatch = message.match(passengerPattern);
 const emailMatch = message.match(emailPattern);

 return {
  rawMessage: message,
  organization: detectOrganization(message, emailMatch?.[0]),
  email: emailMatch?.[0] ?? null,
  departureCity: route.departureCity,
  arrivalCity: route.arrivalCity,
  departureDate: detectDepartureDate(message),
  returnDate: null,
  passengerCount: passengerMatch ? Number(passengerMatch[1]) : null,
  tripType: detectTripType(message),
  options: detectOptions(message)
 };
}
