import type { Lead } from "@/shared/types/lead";
import { classifyLead } from "./leadPipeline";
import type { LeadActivity } from "./types";

const FIELD_LABELS: Record<string, string> = {
 departure_city: "ville de départ",
 arrival_city: "ville d’arrivée",
 departure_date: "date de départ",
 passenger_count: "nombre de passagers",
 trip_type: "type de trajet",
};

export function getLeadActivity(lead: Lead): LeadActivity[] {
 const routing = classifyLead(lead);
 const createdAt = lead.createdAt ?? lead.updatedAt ?? new Date(0).toISOString();
 const updatedAt = lead.updatedAt ?? createdAt;
 const seq: Omit<LeadActivity, "id">[] = [];

 seq.push({
  type: "CREATED",
  actor: "Système",
  label: "Demande reçue",
  detail: lead.organization ?? "Prospect sans organisation renseignée",
  at: createdAt
 });

 seq.push({
  type: "EXTRACTED",
  actor: "Agent IA",
  label: "Informations extraites",
  detail: lead.aiSummary ?? "Champs détectés depuis la conversation et enregistrés sur la fiche.",
  at: updatedAt
 });

 seq.push({
  type: "VERIFIED",
  actor: "Système",
  label: "Champs critiques vérifiés",
  detail: missingFieldsDetail(lead),
  at: updatedAt
 });

 if (routing.routing === "HUMAN_REVIEW") {
  seq.push({ type: "CLASSIFIED_HUMAN", actor: "Système", label: "Validation commerciale requise", detail: routing.reason, at: updatedAt });
 } else if (routing.routing === "INCOMPLETE") {
  seq.push({ type: "CLASSIFIED_INCOMPLETE", actor: "Système", label: "Demande à compléter", detail: routing.reason, at: updatedAt });
 } else {
  seq.push({ type: "CLASSIFIED_AI", actor: "Système", label: "Demande qualifiée", detail: routing.reason, at: updatedAt });
 }

 if (lead.status === "WON") {
  seq.push({ type: "WON", actor: "Commercial", label: "Demande gagnée", detail: "Devis accepté par le prospect", at: updatedAt });
 }
 if (lead.status === "LOST") {
  seq.push({ type: "LOST", actor: "Commercial", label: "Demande perdue", detail: "Sans suite après relances", at: updatedAt });
 }

 return seq
  .map((event, index) => ({
   ...event,
   id: `${lead.id}-act-${index}`,
  }))
  .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function missingFieldsDetail(lead: Lead) {
 if (!lead.missingFields?.length) {
  return "Ville de départ, ville d’arrivée, date, passagers et type de trajet sont renseignés.";
 }

 return `Champs encore manquants : ${lead.missingFields.map((field) => FIELD_LABELS[field] ?? field).join(", ")}.`;
}
