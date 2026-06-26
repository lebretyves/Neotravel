/**
 * Pure, dependency-free lead field validators.
 * Shared between the server validation layer (src/lib/ai/validate-lead.ts)
 * and the client side panel (DemandConversation.tsx) so the rules live once.
 */

/** Pricing ceiling — over this the demand goes to HUMAN_REVIEW (see PAX_OVER_85). */
export const PAX_MAX = 85;

/** True when the string is a parseable YYYY-MM-DD calendar date. */
export function isValidDateString(value: string | null | undefined): boolean {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
  const date = new Date(`${value.trim()}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  // Guard against rollovers like 2027-02-30 → 2027-03-02
  const [y, m, d] = value.trim().split("-").map(Number);
  return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
}

/** True when `value` is a valid date strictly before the start of `today`. */
export function isPastDate(value: string | null | undefined, today: Date = new Date()): boolean {
  if (!isValidDateString(value)) return false;
  const date = new Date(`${(value as string).trim()}T12:00:00`).getTime();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  return date < startOfToday;
}

/** True when both dates are valid and the return falls before the departure. */
export function isReturnBeforeDeparture(
  departure: string | null | undefined,
  ret: string | null | undefined,
): boolean {
  if (!isValidDateString(departure) || !isValidDateString(ret)) return false;
  const dep = new Date(`${(departure as string).trim()}T12:00:00`).getTime();
  const back = new Date(`${(ret as string).trim()}T12:00:00`).getTime();
  return back < dep;
}

/** True when passenger count is present but ≤ 0 or not a whole number. */
export function isPaxBelowMin(value: number | null | undefined): boolean {
  if (value == null) return false;
  return !Number.isInteger(value) || value <= 0;
}

/** True when passenger count exceeds the standard capacity ceiling. */
export function isPaxOverMax(value: number | null | undefined): boolean {
  if (value == null) return false;
  return value > PAX_MAX;
}
