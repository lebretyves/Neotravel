import type { ExtractionDelta, LeadQualification } from "../domain/schemas";

export function sanitizeExtractionDelta(
  raw: ExtractionDelta,
  deterministicFacts: Partial<LeadQualification>,
  existing: LeadQualification,
): ExtractionDelta {
  const sanitized: ExtractionDelta = { ...raw };

  if (!sanitized.trip_type) return sanitized;

  if (deterministicFacts.trip_type) {
    sanitized.trip_type = deterministicFacts.trip_type;
    return sanitized;
  }

  const hasReturnDate =
    hasTextValue(sanitized.return_date) || hasTextValue(existing.return_date);

  if (hasReturnDate) {
    sanitized.trip_type = "round_trip";
    return sanitized;
  }

  delete sanitized.trip_type;
  return sanitized;
}

function hasTextValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
