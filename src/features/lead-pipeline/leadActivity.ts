import { mockFollowups } from "@/data/mock-followups";
import { mockQuotes } from "@/data/mock-quotes";
import type { Lead } from "@/shared/types/lead";
import { classifyLead } from "./leadPipeline";
import type { LeadActivity } from "./types";

/**
 * SCAFFOLD — journal de suivi par lead.
 *
 * Reconstruit un fil d'activité plausible à partir des données du lead.
 * Destiné à être alimenté EN TEMPS RÉEL plus tard (Supabase Realtime / flux
 * d'évènements) : ici les données sont dérivées localement pour la démo.
 */
const euro = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export function getLeadActivity(lead: Lead): LeadActivity[] {
  const routing = classifyLead(lead);
  const quote = mockQuotes.find((item) => item.leadId === lead.id);
  const followups = mockFollowups.filter((item) => item.leadId === lead.id);

  const seq: Omit<LeadActivity, "id" | "at">[] = [];

  seq.push({
    type: "CREATED",
    actor: "Système",
    label: "Demande reçue",
    detail: `${lead.organization ?? "Nouveau prospect"} — inscription via le formulaire`
  });

  seq.push({
    type: "EXTRACTED",
    actor: "Agent IA",
    label: "Informations extraites",
    detail: lead.aiSummary ?? "Champs détectés et normalisés automatiquement"
  });

  seq.push({
    type: "VERIFIED",
    actor: "Système",
    label: "Champs critiques vérifiés",
    detail: "Contrôle des informations obligatoires avant tout devis"
  });

  if (routing.routing === "HUMAN_REVIEW") {
    seq.push({ type: "CLASSIFIED_HUMAN", actor: "Agent IA", label: "Orienté reprise humaine", detail: routing.reason });
  } else if (routing.routing === "INCOMPLETE") {
    seq.push({ type: "CLASSIFIED_INCOMPLETE", actor: "Agent IA", label: "Demande à compléter", detail: routing.reason });
  } else {
    seq.push({ type: "CLASSIFIED_AI", actor: "Agent IA", label: "Traitement automatique validé", detail: routing.reason });
  }

  if (quote) {
    seq.push({
      type: "QUOTE_SENT",
      actor: "Système",
      label: "Devis envoyé",
      detail: `${quote.calculation.quoteNumber} — ${euro(quote.calculation.priceTtc)}`
    });
  }

  followups.forEach((followup, index) => {
    seq.push({
      type: "FOLLOWUP",
      actor: "Automatisation",
      label: `Relance ${index + 1} ${followup.status === "SENT" ? "envoyée" : "programmée"}`,
      detail: `Canal ${followup.channel}`
    });
  });

  if (lead.status === "WON") {
    seq.push({ type: "WON", actor: "Commercial", label: "Demande gagnée", detail: "Devis accepté par le prospect" });
  }
  if (lead.status === "LOST") {
    seq.push({ type: "LOST", actor: "Commercial", label: "Demande perdue", detail: "Sans suite après relances" });
  }

  // Horodatage déterministe : du plus ancien au plus récent (37 min entre évènements).
  const total = seq.length;
  const now = Date.now();
  return seq
    .map((event, index) => ({
      ...event,
      id: `${lead.id}-act-${index}`,
      at: new Date(now - (total - index) * 37 * 60 * 1000).toISOString()
    }))
    .reverse();
}
