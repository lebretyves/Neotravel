import type { LeadQualification } from "../domain/schemas";

const NEGATED_STOP_PATTERN =
  /\b(?:sans\s+(?:aucun\s+)?(?:faire\s+d['’]?)?(?:arr[eê]t|arret|stop|[ée]tape|pause)|pas\s+d['’]?(?:arr[eê]t|arret|stop|[ée]tape|pause))\b/iu;

const STOP_PATTERNS = [
  /\b(?:un\s+|une\s+|des\s+)?(?:arr[eê]t|arret|stop|[ée]tape|pause)\s+(?:à|a|au|aux|dans|via|par)\s+(?<stop>[\p{L}][\p{L}'’\-]*(?:\s+[\p{L}][\p{L}'’\-]*){0,3})/iu,
  /\b(?:via|en\s+passant\s+par|passer\s+par|(?:un\s+)?d[eé]tour\s+par)\s+(?<stop>[\p{L}][\p{L}'’\-]*(?:\s+[\p{L}][\p{L}'’\-]*){0,3})/iu,
];

const ROUTE_COMPLEXITY_PATTERN =
  /(?:^|[^\p{L}])(?:arr[eê]t|arret|stop|[ée]tape|pause|via|passer\s+par|en\s+passant\s+par|d[eé]tour|ramasser|r[eé]cup[eé]rer)\b/iu;

/**
 * Marks multi-step requests as manual-review-only. The direct-route pricing
 * engine has no safe way to price an intermediate stop, so this guardrail is
 * deterministic and independent from the model extraction.
 */
export function detectIntermediateStops(message: string): Partial<LeadQualification> {
  if (NEGATED_STOP_PATTERN.test(message) || !ROUTE_COMPLEXITY_PATTERN.test(message)) {
    return {};
  }

  const stops = STOP_PATTERNS.flatMap((pattern) => {
    const match = pattern.exec(message);
    const stop = match?.groups?.stop ? normalizeStop(match.groups.stop) : undefined;
    return stop ? [stop] : [];
  });

  return {
    has_intermediate_stop: true,
    ...(stops.length > 0 ? { intermediate_stops: uniqueStops(stops) } : {}),
  };
}

function normalizeStop(value: string): string | undefined {
  const withoutFillers = value
    .replace(/\b(?:en\s+fait|enfte|svp|s['’]il\s+vous\s+pla[iî]t)\b.*$/iu, "")
    .trim();

  if (!withoutFillers) return undefined;

  return withoutFillers
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s\-'])[\p{L}]/gu, (character) => character.toLocaleUpperCase("fr-FR"));
}

function uniqueStops(stops: string[]): string[] {
  const seen = new Set<string>();

  return stops.filter((stop) => {
    const normalized = stop.toLocaleLowerCase("fr-FR");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
