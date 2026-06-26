import type { LeadQualification } from "../domain/schemas";

export function normalizeExtraction(
  raw: Partial<LeadQualification>,
  existing: LeadQualification,
): Partial<LeadQualification> {
  const out = { ...raw };

  // Year inference for return_date when LLM returns a partial date (MM-DD without YYYY).
  if (typeof out.return_date === "string" && out.return_date.length > 0) {
    const depDate =
      (typeof out.departure_date === "string" && out.departure_date) ||
      existing.departure_date;
    out.return_date = inferYear(out.return_date, depDate);
  }

  // Derive trip_type from return_date when not explicitly set.
  const hasNewReturnDate =
    typeof out.return_date === "string" && out.return_date.length > 0;
  const hasExistingReturnDate =
    typeof existing.return_date === "string" && existing.return_date.length > 0;

  if ((hasNewReturnDate || hasExistingReturnDate) && out.trip_type === undefined) {
    out.trip_type = "round_trip";
  }

  return out;
}

function inferYear(dateStr: string, referenceDate: string | undefined): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (!referenceDate) return dateStr;

  const yearMatch = referenceDate.match(/^(\d{4})/);
  if (!yearMatch) return dateStr;
  const year = yearMatch[1];

  const partial = dateStr.match(/^(\d{1,2})-(\d{1,2})$/);
  if (partial) {
    return `${year}-${partial[1].padStart(2, "0")}-${partial[2].padStart(2, "0")}`;
  }

  return dateStr;
}
