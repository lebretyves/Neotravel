export type CommercialStatus =
 | "NEW"
 | "INCOMPLETE"
 | "QUALIFIED"
 | "HIGH_VALUE"
 | "HUMAN_REVIEW"
 | "QUOTE_READY"
 | "QUOTE_SENT"
 | "FOLLOWUP_1"
 | "FOLLOWUP_2"
 | "FOLLOWUP_SCHEDULED"
 | "WON"
 | "LOST"
 | "CLOSED";

export type QuoteStatus = "QUOTE_READY" | "QUOTE_SENT" | "ACCEPTED" | "REFUSED" | "CLOSED";

export type PartnerCommercialStatus = "TO_CONFIRM" | "OPTION_HELD" | "CONFIRMED" | "UNAVAILABLE";

export type DemoModeStatus = "mock" | "supabase";
