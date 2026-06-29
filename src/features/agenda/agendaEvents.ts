import { listFollowups } from "@/shared/lib/data/followupRepository";
import { listLeads } from "@/shared/lib/data/leadRepository";

export type AgendaEventType = "relance" | "depart" | "review";

export type AgendaEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  type: AgendaEventType;
  title: string;
  subtitle?: string;
  href: string;
};

export type AgendaTodo = {
  leadId: string;
  label: string;
  status: string;
  href: string;
};

function dayOf(iso: string) {
  return iso.slice(0, 10);
}

/**
 * Agenda auto-alimenté par les actions réalisées ailleurs dans l'app :
 *  - relances planifiées/envoyées (followups) -> à leur date d'échéance,
 *  - départs prévus (date de la demande),
 *  - demandes à valider (human review).
 * Aucune saisie manuelle : tout vient des données existantes.
 */
export async function getAgendaEvents(): Promise<AgendaEvent[]> {
  const [leads, followups] = await Promise.all([listLeads(), listFollowups()]);
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const events: AgendaEvent[] = [];

  for (const followup of followups) {
    const lead = leadById.get(followup.leadId);
    events.push({
      id: `relance-${followup.id}`,
      date: dayOf(followup.dueAt),
      type: "relance",
      title: followup.status === "SENT" ? "Relance envoyée" : "Relance prévue",
      subtitle: lead?.organization ?? followup.leadId,
      href: `/dashboard/relances/${followup.id}`
    });
  }

  for (const lead of leads) {
    if (lead.departureDate) {
      events.push({
        id: `depart-${lead.id}`,
        date: dayOf(lead.departureDate),
        type: "depart",
        title: "Départ prévu",
        subtitle: `${lead.departureCity ?? "?"} → ${lead.arrivalCity ?? "?"}`,
        href: `/dashboard/demandes/${lead.id}`
      });
    }
    if (lead.status === "HUMAN_REVIEW" && lead.departureDate) {
      events.push({
        id: `review-${lead.id}`,
        date: dayOf(lead.departureDate),
        type: "review",
        title: "À valider",
        subtitle: lead.organization ?? lead.id,
        href: `/dashboard/demandes/${lead.id}`
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/** Demandes nécessitant une action (non datées) -> panneau « À traiter ». */
export async function getAgendaTodos(): Promise<AgendaTodo[]> {
  const leads = await listLeads();
  const untreated = new Set(["NEW", "INCOMPLETE", "HUMAN_REVIEW"]);
  return leads
    .filter((lead) => untreated.has(lead.status))
    .map((lead) => ({
      leadId: lead.id,
      label: lead.organization ?? lead.email ?? lead.id,
      status: lead.status,
      href: `/dashboard/demandes/${lead.id}`
    }));
}
