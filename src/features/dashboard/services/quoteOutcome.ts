import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";

/**
 * Commercial outcome of a quote.
 *
 * Production stores every finalized quote as CLOSED and records won/lost on the LEAD
 * (WON / LOST), because accept and refuse both close the quote. Demo fixtures instead
 * put it on the quote (ACCEPTED / REFUSED). Counting `quote.status === "ACCEPTED"` alone
 * therefore returns 0 in production — these helpers read BOTH signals so every metric is
 * correct against real Supabase data.
 */
export function isWonQuote(quote: Quote, lead: Lead | undefined): boolean {
  return quote.status === "ACCEPTED" || lead?.status === "WON";
}

export function isLostQuote(quote: Quote, lead: Lead | undefined): boolean {
  return quote.status === "REFUSED" || lead?.status === "LOST";
}

/** Display label + canonical status for a StatusBadge, derived from quote + lead. */
export function quoteOutcomeDisplay(quote: Quote, lead: Lead | undefined): { label: string; status: string } {
  if (isWonQuote(quote, lead)) return { label: "Accepté", status: "WON" };
  if (isLostQuote(quote, lead)) return { label: "Refusé", status: "LOST" };
  if (quote.status === "QUOTE_SENT") return { label: "Envoyé", status: "QUOTE_SENT" };
  return { label: "Prêt", status: "QUOTE_READY" };
}
