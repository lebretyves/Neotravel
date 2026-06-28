import type { Lead } from "@/shared/types/lead";
import { humanReviewReasonLabel } from "@/features/human-review/reasonLabels";
import type { LeadRouting, LeadStage } from "./types";

/**
 * SCAFFOLD DU PROCESS — préparé, PAS encore connecté.
 *
 * Parcours cible d'un lead :
 *  1. Inscription -> le prospect s'inscrit, la demande est enregistrée dans le dashboard.
 *  2. Classement  -> on décide si l'IA peut traiter automatiquement ou s'il faut une reprise humaine.
 *  3. Traitement  -> devis préparé puis envoyé.
 *  4. Relance   -> suivi automatique jusqu'à la décision.
 *
 * Aucune IA réelle ni base de données n'est branchée ici : ce sont des règles
 * déterministes de démonstration, à remplacer par l'intégration réelle plus tard.
 */

// Étape 1 — Inscription : enregistrement du lead entrant (à brancher sur Supabase).
export function recordIncomingLead(): never {
 throw new Error("recordIncomingLead: à connecter (Supabase) — non branché pour le MVP démo.");
}

// Statuts indiquant que la qualification est déjà tranchée et que la demande avance.
const ADVANCED_STATUSES = new Set([
 "QUALIFIED",
 "HIGH_VALUE",
 "QUOTE_READY",
 "QUOTE_SENT",
 "FOLLOWUP_SCHEDULED",
 "FOLLOWUP_1",
 "FOLLOWUP_2",
 "WON"
]);

/**
 * Étape 2 du parcours MVP — le code vérifie les champs critiques puis classe :
 *  - INCOMPLETE  : informations critiques manquantes -> à compléter.
 *  - HUMAN_REVIEW : demande complexe/sensible -> reprise humaine.
 *  - AI_AUTO    : demande standard -> calcul du devis automatique.
 */
export function classifyLead(lead: Lead): { routing: LeadRouting; reason: string } {
 if (lead.status === "HUMAN_REVIEW" || lead.humanReviewReason) {
  return {
   routing: "HUMAN_REVIEW",
   reason: humanReviewReasonLabel(lead.humanReviewReason)
  };
 }
 if (lead.status === "INCOMPLETE" || (lead.missingFields?.length ?? 0) > 0) {
  return { routing: "INCOMPLETE", reason: "Informations critiques manquantes : la demande doit être complétée." };
 }
 if (ADVANCED_STATUSES.has(lead.status)) {
  return { routing: "AI_AUTO", reason: "Demande qualifiée : traitement automatique en cours." };
 }
 if ((lead.confidence ?? 1) < 0.6) {
  return { routing: "HUMAN_REVIEW", reason: "Confiance d'extraction faible : vérification humaine." };
 }
 return { routing: "AI_AUTO", reason: "Demande standard, complète et fiable : calcul du devis automatique." };
}

const STAGE_BY_STATUS: Record<string, LeadStage> = {
 NEW: "INSCRIPTION",
 INCOMPLETE: "CLASSEMENT",
 QUALIFIED: "CLASSEMENT",
 HIGH_VALUE: "CLASSEMENT",
 HUMAN_REVIEW: "CLASSEMENT",
 QUOTE_READY: "TRAITEMENT",
 QUOTE_SENT: "TRAITEMENT",
 FOLLOWUP_SCHEDULED: "RELANCE",
 FOLLOWUP_1: "RELANCE",
 FOLLOWUP_2: "RELANCE",
 WON: "RELANCE",
 LOST: "RELANCE",
 CLOSED: "RELANCE"
};

export function currentStage(lead: Lead): LeadStage {
 return STAGE_BY_STATUS[lead.status] ?? "INSCRIPTION";
}

// Étapes alignées sur le parcours MVP NeoTravel.
export const PIPELINE_STAGES: { key: LeadStage; label: string; hint: string }[] = [
 { key: "INSCRIPTION", label: "Inscription", hint: "Le prospect décrit son besoin" },
 { key: "CLASSEMENT", label: "Qualification", hint: "L'IA extrait, le code vérifie et classe" },
 { key: "TRAITEMENT", label: "Devis", hint: "Prix calculé, proposition générée" },
 { key: "RELANCE", label: "Relance", hint: "Relance planifiée et suivie" }
];
