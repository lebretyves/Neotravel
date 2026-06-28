export type LeadStage = "INSCRIPTION" | "CLASSEMENT" | "TRAITEMENT" | "RELANCE";

export type LeadRouting = "AI_AUTO" | "HUMAN_REVIEW" | "INCOMPLETE";

export type LeadActivityType =
 | "CREATED"
 | "EXTRACTED"
 | "VERIFIED"
 | "CLASSIFIED_AI"
 | "CLASSIFIED_HUMAN"
 | "CLASSIFIED_INCOMPLETE"
 | "QUOTE_SENT"
 | "FOLLOWUP"
 | "WON"
 | "LOST"
 | "NOTE";

export type LeadActivity = {
 id: string;
 type: LeadActivityType;
 label: string;
 detail?: string;
 at: string; // ISO
 actor: string;
};
