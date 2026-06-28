import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";

export type LeadCommercialAction = {
 label: string;
 detail: string;
 cta: string;
 href: string;
 priority: number;
 tone: "critical" | "warning" | "info" | "success" | "muted";
};

export function leadDisplayName(lead: Lead | undefined, fallback = "Prospect à qualifier") {
 if (!lead) return fallback;
 if (lead.organization) return lead.organization;
 if (lead.email) return lead.email;
 if (lead.departureCity && lead.arrivalCity) return `${lead.departureCity} → ${lead.arrivalCity}`;
 if (lead.departureCity) return `Départ ${lead.departureCity}`;
 return fallback;
}

export function leadRouteLabel(lead: Lead | undefined) {
 if (!lead) return "Demande introuvable";
 return `${lead.departureCity ?? "Départ à préciser"} → ${lead.arrivalCity ?? "Arrivée à préciser"}`;
}

export function latestQuoteByLeadId(quotes: Quote[]) {
 const quoteByLeadId = new Map<string, Quote>();

 for (const quote of quotes) {
  if (!quoteByLeadId.has(quote.leadId)) quoteByLeadId.set(quote.leadId, quote);
 }

 return quoteByLeadId;
}

export function nextScheduledFollowup(leadId: string, followups: Followup[]) {
 return followups
  .filter((followup) => followup.leadId === leadId && followup.status === "SCHEDULED")
  .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0];
}

export function formatCommercialDate(value: string | null | undefined) {
 if (!value) return "À préciser";
 return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function missingFieldsSummary(lead: Lead) {
 if (!lead.missingFields?.length) return "Informations essentielles présentes.";
 return `Champs manquants : ${lead.missingFields.map((field) => fieldLabel(field)).join(", ")}.`;
}

export function quoteLabel(quote: Quote | undefined) {
 if (!quote) return "Aucun devis";
 return `${quote.calculation.quoteNumber} · ${formatEuro(quote.calculation.priceTtc ?? quote.calculation.totalAmount)}`;
}

export function formatEuro(value: number) {
 return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export function getLeadCommercialAction({
 lead,
 quote,
 followup,
 now = Date.now()
}: {
 lead: Lead;
 quote?: Quote;
 followup?: Followup;
 now?: number;
}): LeadCommercialAction {
 const leadHref = `/dashboard/demandes/${lead.id}`;
 const quoteHref = quote ? `/client/devis/${quote.id}` : leadHref;
 const followupDueAt = followup ? new Date(followup.dueAt).getTime() : null;

 if (lead.status === "HUMAN_REVIEW") {
  return {
   label: "Reprendre manuellement",
   detail: lead.humanReviewReason ? `Motif : ${lead.humanReviewReason}` : "Décision commerciale requise avant devis.",
   cta: "Traiter",
   href: leadHref,
   priority: 0,
   tone: "critical"
  };
 }

 if (lead.status === "INCOMPLETE") {
  return {
   label: "Compléter les infos",
   detail: missingFieldsSummary(lead),
   cta: "Compléter",
   href: leadHref,
   priority: 1,
   tone: "warning"
  };
 }

 if (lead.status === "NEW") {
  return {
   label: "Qualifier la demande",
   detail: "Premier tri commercial à effectuer.",
   cta: "Qualifier",
   href: leadHref,
   priority: 2,
   tone: "info"
  };
 }

 if ((lead.status === "QUALIFIED" || lead.status === "HIGH_VALUE") && !quote) {
  return {
   label: "Générer devis",
   detail: "Demande qualifiée sans proposition existante.",
   cta: "Générer",
   href: leadHref,
   priority: 3,
   tone: "info"
  };
 }

 if (quote?.status === "QUOTE_READY" || lead.status === "QUOTE_READY") {
  return {
   label: "Envoyer / simuler devis",
   detail: quote ? `Devis existant : ${quote.calculation.quoteNumber}.` : "Statut devis prêt, devis à retrouver.",
   cta: quote ? "Ouvrir devis" : "Ouvrir",
   href: quoteHref,
   priority: 4,
   tone: "info"
  };
 }

 if (quote?.status === "QUOTE_SENT" || lead.status === "QUOTE_SENT") {
  return {
   label: followup ? "Relance programmée" : "Attendre réponse / relancer",
   detail: followup ? `Prochaine relance : ${formatCommercialDate(followup.dueAt)}.` : "Devis envoyé, aucune relance active détectée.",
   cta: "Suivre",
   href: leadHref,
   priority: followupDueAt !== null && followupDueAt < now ? 0 : 5,
   tone: followupDueAt !== null && followupDueAt < now ? "warning" : "info"
  };
 }

 if (lead.status === "FOLLOWUP_SCHEDULED" || lead.status === "FOLLOWUP_1" || lead.status === "FOLLOWUP_2") {
  return {
   label: followupDueAt !== null && followupDueAt < now ? "Relance en retard" : "Relance programmée",
   detail: followup ? `Échéance : ${formatCommercialDate(followup.dueAt)}.` : "Suivi commercial en cours.",
   cta: "Suivre",
   href: leadHref,
   priority: followupDueAt !== null && followupDueAt < now ? 0 : 6,
   tone: followupDueAt !== null && followupDueAt < now ? "warning" : "info"
  };
 }

 if (lead.status === "WON") {
  return {
   label: "Transmis réservation",
   detail: "Dossier gagné, suite opérationnelle hors prospection.",
   cta: "Consulter",
   href: leadHref,
   priority: 8,
   tone: "success"
  };
 }

 if (lead.status === "LOST") {
  return {
   label: "Clôturé perdu",
   detail: "Aucune action commerciale active.",
   cta: "Consulter",
   href: leadHref,
   priority: 9,
   tone: "muted"
  };
 }

 return {
  label: "Clôturé",
  detail: "Dossier fermé.",
  cta: "Consulter",
  href: leadHref,
  priority: 10,
  tone: "muted"
 };
}

function fieldLabel(field: string) {
 const labels: Record<string, string> = {
  departure_city: "ville de départ",
  arrival_city: "ville d’arrivée",
  departure_date: "date de départ",
  passenger_count: "nombre de passagers",
  trip_type: "type de trajet"
 };

 return labels[field] ?? field;
}
