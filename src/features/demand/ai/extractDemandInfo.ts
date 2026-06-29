import type { DemandDraft, TripType } from "@/shared/types/lead";

const cityPairPattern = /\b([A-ZÀ-Ÿ][\p{L} -]{1,40})\s*(?:->|→|vers|a|à)\s*([A-ZÀ-Ÿ][\p{L} -]{1,40})\b/u;
const passengerPattern = /(\d{1,3})\s*(?:passagers?|personnes?|pax)\b/i;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const isoDatePattern = /\b(20\d{2}-\d{2}-\d{2})\b/;
const frenchDatePattern =
  /\b(\d{1,2})\s+(janvier|fevrier|f[eé]vrier|mars|avril|mai|juin|juillet|aout|ao[uû]t|septembre|octobre|novembre|decembre|d[eé]cembre)\s+(20\d{2})\b/i;

const frenchMonths: Record<string, string> = {
  janvier: "01",
  fevrier: "02",
  février: "02",
  mars: "03",
  avril: "04",
  mai: "05",
  juin: "06",
  juillet: "07",
  aout: "08",
  août: "08",
  septembre: "09",
  octobre: "10",
  novembre: "11",
  decembre: "12",
  décembre: "12"
};

function cleanCity(value: string) {
  return value
    .replace(/\s+(aujourd'hui|aujourdhui|demain)\b.*$/i, "")
    .replace(/\s+(le|pour|avec)\s*$/i, "")
    .replace(/\s+(le|pour|avec)\s.+$/i, "")
    .trim();
}

function detectTripType(message: string): TripType | null {
  if (/aller[- ]?retour|retour/i.test(message)) return "round_trip";
  if (/aller simple|one way/i.test(message)) return "one_way";
  return null;
}

function detectOptions(message: string) {
  return [
    /guide|accompagnateur/i.test(message) ? "guide" : null,
    /nuit chauffeur/i.test(message) ? "nuit_chauffeur" : null
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

  if (/\bdemain\b/i.test(message)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }

  if (/\b(aujourd'hui|aujourdhui)\b/i.test(message)) {
    return new Date().toISOString().slice(0, 10);
  }

  const frenchMatch = message.match(frenchDatePattern);
  if (!frenchMatch) return null;

  const day = frenchMatch[1].padStart(2, "0");
  const month = frenchMonths[frenchMatch[2].toLowerCase()];
  const year = frenchMatch[3];
  return month ? `${year}-${month}-${day}` : null;
}

export async function extractDemandInfo(message: string): Promise<DemandDraft> {
  const routeMatch = message.match(cityPairPattern);
  const passengerMatch = message.match(passengerPattern);
  const emailMatch = message.match(emailPattern);

  return {
    rawMessage: message,
    organization: detectOrganization(message, emailMatch?.[0]),
    email: emailMatch?.[0] ?? null,
    departureCity: routeMatch?.[1] ? cleanCity(routeMatch[1]) : null,
    arrivalCity: routeMatch?.[2] ? cleanCity(routeMatch[2]) : null,
    departureDate: detectDepartureDate(message),
    returnDate: null,
    passengerCount: passengerMatch ? Number(passengerMatch[1]) : null,
    tripType: detectTripType(message),
    options: detectOptions(message)
  };
}
