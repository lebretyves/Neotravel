import { clientHumanReviewNotice } from "@/features/human-review/clientNotice";
import { logAuditEvent } from "../../../lib/audit/audit-service";
import { markHumanReview, updateLeadStatus } from "../../../lib/leads/lead-service";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { scheduleFollowups } from "../../followups/services/scheduleFollowups";
import { triggerCustomerEmail } from "../../../shared/lib/n8n/triggerCustomerEmail";
import type { N8nClientResult } from "../../../shared/lib/n8n/n8nClient";
import { AppError } from "../../../shared/lib/utils/errors";
import {
  type CustomerEmailScenario,
  renderCustomerEmailTemplate,
} from "./emailTemplates";

type ClientRow = { name?: string | null; organization?: string | null; email?: string | null };
type ClientJoin = ClientRow | ClientRow[] | null;

type LeadEmailRow = {
  id: string;
  status: string;
  departure_city: string | null;
  arrival_city: string | null;
  departure_date: string | null;
  return_date: string | null;
  passenger_count: number | null;
  trip_type: string | null;
  missing_fields: string[] | null;
  human_review_reason: string | null;
  clients?: ClientJoin;
};

type QuoteEmailRow = {
  id: string;
  lead_id: string | null;
  quote_number: string | null;
  price_ttc: number | null;
  status: "QUOTE_READY" | "QUOTE_SENT" | "CLOSED";
  breakdown: Record<string, unknown> | null;
  leads?: (LeadEmailRow & { clients?: ClientJoin }) | Array<LeadEmailRow & { clients?: ClientJoin }> | null;
};

type FollowupEmailRow = {
  id: string;
  lead_id: string | null;
  quote_id: string | null;
  scheduled_at: string;
  status: "scheduled" | "sent" | "cancelled";
  quotes?: QuoteEmailRow | QuoteEmailRow[] | null;
  leads?: (LeadEmailRow & { clients?: ClientJoin }) | Array<LeadEmailRow & { clients?: ClientJoin }> | null;
};

export type CustomerEmailPayload = {
  event: "customer_email";
  scenario: CustomerEmailScenario;
  to: { email: string; name: string };
  subject: string;
  preheader: string;
  html: string;
  text: string;
  template: { name: string };
  lead: {
    id: string;
    status?: string;
    route: string;
    departureDate: string;
    passengerCount: string;
    tripType: string;
    missingFields?: string[];
    humanReviewReason?: string | null;
  };
  quote?: {
    id: string;
    reference: string;
    totalTtc: string;
    url: string;
  };
  followup?: {
    id: string;
    scheduledAt: string;
  };
  triggeredBy: "system" | "dashboard" | "n8n";
  requestedAt: string;
};

export type SendCustomerEmailResult = {
  scenario: CustomerEmailScenario;
  recipient: string;
  n8n: N8nClientResult;
  skipped?: boolean;
  reason?: string;
};

const LEAD_SELECTION =
  "id, status, departure_city, arrival_city, departure_date, return_date, passenger_count, trip_type, missing_fields, human_review_reason, clients(name, organization, email)";

const QUOTE_SELECTION =
  `id, lead_id, quote_number, price_ttc, status, breakdown, leads(${LEAD_SELECTION})`;

const FOLLOWUP_SELECTION =
  `id, lead_id, quote_id, scheduled_at, status, quotes(id, lead_id, quote_number, price_ttc, status, breakdown), leads(${LEAD_SELECTION})`;

export async function sendLeadStatusEmail(input: {
  leadId: string;
  scenario: Extract<CustomerEmailScenario, "DEMAND_INCOMPLETE" | "DEMAND_IN_PROGRESS">;
  triggeredBy?: "system" | "dashboard";
}) {
  const lead = await loadLead(input.leadId);
  return sendEmail({
    scenario: input.scenario,
    lead,
    triggeredBy: input.triggeredBy ?? "system",
    dedupeEntity: { entityType: "lead", entityId: lead.id },
  });
}

export async function sendQuoteAvailableEmail(input: {
  quoteId: string;
  triggeredBy?: "system" | "dashboard" | "n8n";
  force?: boolean;
}) {
  const quote = await loadQuote(input.quoteId);
  const lead = one(quote.leads);

  if (!lead || !quote.lead_id) {
    throw new AppError("Devis sans demande liée.", "NOT_FOUND");
  }

  if (quote.status === "CLOSED") {
    throw new AppError("Devis déjà finalisé.", "QUOTE_FINALIZED");
  }

  if (quote.status === "QUOTE_SENT" && !input.force) {
    return skippedResult("ACCOUNT_CREATION", lead, "QUOTE_ALREADY_SENT");
  }

  const result = await sendEmail({
    scenario: "ACCOUNT_CREATION",
    lead,
    quote,
    triggeredBy: input.triggeredBy ?? "dashboard",
    dedupeEntity: input.force ? undefined : { entityType: "quote", entityId: quote.id },
  });

  const supabase = createServerSupabaseClient();
  const { error: quoteError } = await supabase.from("quotes").update({ status: "QUOTE_SENT" }).eq("id", quote.id);
  if (quoteError) throw new AppError("Statut devis non mis à jour.", "EMAIL_STATUS_UPDATE_FAILED");

  if (isDepartureWithinHours(lead.departure_date, 48)) {
    await markHumanReview(quote.lead_id, "URGENT_DEPARTURE_UNDER_48H");
    return result;
  }

  await updateLeadStatus(quote.lead_id, "QUOTE_SENT", { quoteId: quote.id, emailScenario: "ACCOUNT_CREATION" });
  await scheduleFollowups({
    leadId: quote.lead_id,
    quoteId: quote.id,
    quoteStatus: "QUOTE_SENT",
    isUrgent: isUrgentLead(lead),
  });

  return result;
}

export async function sendFollowupEmail(input: {
  followupId: string;
  triggeredBy?: "dashboard" | "n8n";
  force?: boolean;
}) {
  const followup = await loadFollowup(input.followupId);
  const quote = one(followup.quotes);
  const lead = one(followup.leads);

  if (!lead || !followup.lead_id) throw new AppError("Relance sans demande liée.", "NOT_FOUND");
  if (!quote || !followup.quote_id) throw new AppError("Relance sans devis lié.", "NOT_FOUND");

  if (followup.status !== "scheduled" && !input.force) {
    return skippedResult("FOLLOWUP_J2", lead, "FOLLOWUP_ALREADY_PROCESSED");
  }

  const scenario = await resolveFollowupScenario(followup);
  const result = await sendEmail({
    scenario,
    lead,
    quote,
    followup,
    triggeredBy: input.triggeredBy ?? "dashboard",
    dedupeEntity: input.force ? undefined : { entityType: "followup", entityId: followup.id },
  });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("followups").update({ status: "sent" }).eq("id", followup.id);
  if (error) throw new AppError("Statut relance non mis à jour.", "EMAIL_STATUS_UPDATE_FAILED");

  await updateLeadAfterFollowupSent({
    lead,
    leadId: followup.lead_id,
    quoteId: followup.quote_id,
  });

  await logAuditEvent({
    entityType: "followup",
    entityId: followup.id,
    action: "FOLLOWUP_EMAIL_SENT",
    metadata: { leadId: followup.lead_id, quoteId: followup.quote_id, scenario },
  });

  return result;
}

const FOLLOWUP_CLOSURE_GRACE_DAYS = 7;

export async function sendDueFollowupEmails(input: { now?: Date; limit?: number; triggeredBy?: "n8n" } = {}) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const limit = input.limit ?? 20;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("followups")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) throw new AppError("Lecture des relances dues impossible.", "NOT_FOUND");

  const results = [];
  for (const item of data ?? []) {
    results.push(await sendFollowupEmail({ followupId: item.id as string, triggeredBy: input.triggeredBy ?? "n8n" }));
  }

  const closures = await closeLeadsAfterSecondFollowupGracePeriod({ now });

  return { processed: results.length, results, closures };
}

async function updateLeadAfterFollowupSent(input: {
  lead: LeadEmailRow;
  leadId: string;
  quoteId: string;
}) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("followups")
    .select("id")
    .eq("quote_id", input.quoteId)
    .eq("status", "sent");

  if (error) throw new AppError("Lecture des relances envoyees impossible.", "EMAIL_STATUS_UPDATE_FAILED");

  const sentCount = data?.length ?? 0;
  const urgent = isUrgentLead(input.lead);

  if (urgent && sentCount >= 1) {
    await markHumanReview(input.leadId, "URGENT_FOLLOWUP_REQUIRES_HUMAN_REVIEW");
    return;
  }

  if (sentCount <= 0) return;

  if (sentCount === 1) {
    await updateLeadStatus(input.leadId, "FOLLOWUP_1", {
      quoteId: input.quoteId,
      sentFollowupsWithoutResponse: sentCount,
    });
    return;
  }

  await updateLeadStatus(input.leadId, "FOLLOWUP_2", {
    quoteId: input.quoteId,
    sentFollowupsWithoutResponse: sentCount,
  });
}

async function closeLeadsAfterSecondFollowupGracePeriod(input: { now: Date }) {
  const cutoff = new Date(input.now.getTime() - FOLLOWUP_CLOSURE_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("followups")
    .select("id, lead_id, quote_id, scheduled_at, leads(id, status)")
    .eq("status", "sent")
    .lte("scheduled_at", cutoff)
    .order("scheduled_at", { ascending: false });

  if (error) throw new AppError("Lecture des relances a cloturer impossible.", "EMAIL_STATUS_UPDATE_FAILED");

  const latestByLead = new Map<string, { id: string; lead_id: string; quote_id: string | null; scheduled_at: string; leads?: LeadEmailRow | LeadEmailRow[] | null }>();
  for (const followup of data ?? []) {
    if (!followup.lead_id || latestByLead.has(followup.lead_id)) continue;
    latestByLead.set(followup.lead_id, followup as unknown as { id: string; lead_id: string; quote_id: string | null; scheduled_at: string; leads?: LeadEmailRow | LeadEmailRow[] | null });
  }

  const closed: string[] = [];
  for (const followup of latestByLead.values()) {
    const lead = one(followup.leads);
    if (!lead || lead.status !== "FOLLOWUP_2") continue;

    const { count, error: countError } = await supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", followup.lead_id)
      .eq("status", "sent");

    if (countError) throw new AppError("Comptage des relances envoyees impossible.", "EMAIL_STATUS_UPDATE_FAILED");
    if ((count ?? 0) < 2) continue;

    await updateLeadStatus(followup.lead_id, "CLOSED", {
      quoteId: followup.quote_id,
      sentFollowupsWithoutResponse: count,
      reason: "NO_RESPONSE_7_DAYS_AFTER_SECOND_FOLLOWUP",
    });
    closed.push(followup.lead_id);
  }

  return { closed, cutoff };
}

async function sendEmail(input: {
  scenario: CustomerEmailScenario;
  lead: LeadEmailRow;
  quote?: QuoteEmailRow;
  followup?: FollowupEmailRow;
  triggeredBy: "system" | "dashboard" | "n8n";
  dedupeEntity?: { entityType: string; entityId: string };
}): Promise<SendCustomerEmailResult> {
  const client = one(input.lead.clients);
  const email = client?.email?.trim();
  if (!email) throw new AppError("Aucun email client disponible.", "NO_RECIPIENT_EMAIL");

  if (input.dedupeEntity && (await hasAlreadySent(input.dedupeEntity, input.scenario))) {
    return skippedResult(input.scenario, input.lead, "EMAIL_ALREADY_SENT");
  }

  const contactName = client?.name ?? email;
  const organizationName = client?.organization ?? "Particulier";
  const clientName = contactName;
  const values = buildTemplateValues({
    lead: input.lead,
    quote: input.quote,
    followup: input.followup,
    clientName,
    contactName,
    organizationName,
  });
  const rendered = renderCustomerEmailTemplate(input.scenario, values);
  const payload: CustomerEmailPayload = {
    event: "customer_email",
    scenario: input.scenario,
    to: { email, name: clientName },
    subject: rendered.subject,
    preheader: rendered.preheader,
    html: rendered.html,
    text: rendered.text,
    template: { name: rendered.templateName },
    lead: {
      id: input.lead.id,
      status: input.lead.status,
      route: `${display(input.lead.departure_city)} → ${display(input.lead.arrival_city)}`,
      departureDate: displayDate(input.lead.departure_date),
      passengerCount: displayPassengers(input.lead.passenger_count),
      tripType: displayTripType(input.lead.trip_type),
      missingFields: input.lead.missing_fields ?? undefined,
      humanReviewReason: input.lead.human_review_reason,
    },
    quote: input.quote
      ? {
          id: input.quote.id,
          reference: display(input.quote.quote_number),
          totalTtc: formatEuro(input.quote.price_ttc),
          url: accountLoginUrl(input.quote.id),
        }
      : undefined,
    followup: input.followup
      ? {
          id: input.followup.id,
          scheduledAt: input.followup.scheduled_at,
        }
      : undefined,
    triggeredBy: input.triggeredBy,
    requestedAt: new Date().toISOString(),
  };

  const n8n = await triggerCustomerEmail(payload);
  if (!n8n.simulated && n8n.ok === false) {
    throw new AppError("Webhook n8n email en échec.", "N8N_EMAIL_FAILED");
  }

  await logAuditEvent({
    entityType: input.quote ? "quote" : input.followup ? "followup" : "lead",
    entityId: input.quote?.id ?? input.followup?.id ?? input.lead.id,
    action: "CUSTOMER_EMAIL_SENT",
    metadata: {
      scenario: input.scenario,
      leadId: input.lead.id,
      quoteId: input.quote?.id,
      followupId: input.followup?.id,
      recipient: email,
      simulated: n8n.simulated,
      triggeredBy: input.triggeredBy,
      template: rendered.templateName,
    },
  });

  return { scenario: input.scenario, recipient: email, n8n };
}

async function hasAlreadySent(entity: { entityType: string; entityId: string }, scenario: CustomerEmailScenario) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id")
    .eq("entity_type", entity.entityType)
    .eq("entity_id", entity.entityId)
    .eq("action", "CUSTOMER_EMAIL_SENT")
    .eq("metadata->>scenario", scenario)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

async function loadLead(leadId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("leads").select(LEAD_SELECTION).eq("id", leadId).maybeSingle();
  if (error || !data) throw new AppError("Demande introuvable.", "NOT_FOUND");
  return data as LeadEmailRow;
}

async function loadQuote(quoteId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("quotes").select(QUOTE_SELECTION).eq("id", quoteId).maybeSingle();
  if (error || !data) throw new AppError("Devis introuvable.", "NOT_FOUND");
  return data as unknown as QuoteEmailRow;
}

async function loadFollowup(followupId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("followups").select(FOLLOWUP_SELECTION).eq("id", followupId).maybeSingle();
  if (error || !data) throw new AppError("Relance introuvable.", "NOT_FOUND");
  return data as unknown as FollowupEmailRow;
}

async function resolveFollowupScenario(followup: FollowupEmailRow): Promise<Extract<CustomerEmailScenario, "FOLLOWUP_J2" | "FOLLOWUP_J7">> {
  if (!followup.quote_id) return "FOLLOWUP_J2";

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("followups")
    .select("id, scheduled_at")
    .eq("quote_id", followup.quote_id)
    .order("scheduled_at", { ascending: true });

  const index = (data ?? []).findIndex((item) => item.id === followup.id);
  return index >= 1 ? "FOLLOWUP_J7" : "FOLLOWUP_J2";
}

function buildTemplateValues(input: {
  lead: LeadEmailRow;
  quote?: QuoteEmailRow;
  followup?: FollowupEmailRow;
  clientName: string;
  contactName: string;
  organizationName: string;
}) {
  return {
    clientName: input.clientName,
    contactName: input.contactName,
    organizationName: input.organizationName,
    missingFields: (input.lead.missing_fields ?? []).map(fieldLabel).join(", ") || "Informations à confirmer",
    requestReference: input.lead.id.slice(0, 8).toUpperCase(),
    departureCity: display(input.lead.departure_city),
    arrivalCity: display(input.lead.arrival_city),
    departureDate: displayDate(input.lead.departure_date),
    passengers: displayPassengers(input.lead.passenger_count),
    tripType: displayTripType(input.lead.trip_type),
    reviewMessage: reviewMessage(input.lead.human_review_reason),
    quoteReference: display(input.quote?.quote_number),
    vehicle: display(vehicleLabel(input.quote?.breakdown)),
    totalTTC: formatEuro(input.quote?.price_ttc),
    quoteUrl: input.quote ? accountLoginUrl(input.quote.id) : publicUrl("/connexion"),
    accountCreationUrl: input.quote ? accountCreationUrl(input.quote.id) : publicUrl("/connexion/inscription"),
    accountLoginUrl: input.quote ? accountLoginUrl(input.quote.id) : publicUrl("/connexion"),
    completionUrl: publicUrl(`/client/demande?leadId=${input.lead.id}`),
    validityDays: "7",
  };
}

function skippedResult(scenario: CustomerEmailScenario, lead: LeadEmailRow, reason: string): SendCustomerEmailResult {
  const client = one(lead.clients);
  return {
    scenario,
    recipient: client?.email ?? "",
    skipped: true,
    reason,
    n8n: { workflow: "customer-email", simulated: true, payload: { skipped: true, reason } },
  };
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isUrgentLead(lead: LeadEmailRow) {
  return isDepartureBetweenHours(lead.departure_date, 48, 7 * 24);
}

function isDepartureWithinHours(value: string | null | undefined, hours: number) {
  if (!value) return false;
  const departure = new Date(`${value}T12:00:00`);
  if (Number.isNaN(departure.getTime())) return false;
  const diffMs = departure.getTime() - Date.now();
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
}

function isDepartureBetweenHours(value: string | null | undefined, minHours: number, maxHours: number) {
  if (!value) return false;
  const departure = new Date(`${value}T12:00:00`);
  if (Number.isNaN(departure.getTime())) return false;
  const diffMs = departure.getTime() - Date.now();
  return diffMs > minHours * 60 * 60 * 1000 && diffMs <= maxHours * 60 * 60 * 1000;
}

function display(value: string | null | undefined) {
  return value?.trim() || "À confirmer";
}

function displayDate(value: string | null | undefined) {
  if (!value) return "À confirmer";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function displayPassengers(value: number | null | undefined) {
  return Number.isFinite(value) ? `${value} passagers` : "À confirmer";
}

function displayTripType(value: string | null | undefined) {
  if (value === "round_trip") return "Aller-retour";
  if (value === "one_way") return "Aller simple";
  return "À confirmer";
}

function formatEuro(value: number | null | undefined) {
  if (!Number.isFinite(value)) return "À confirmer";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value as number);
}

function vehicleLabel(breakdown: Record<string, unknown> | null | undefined) {
  const value = breakdown?.vehicle_code ?? breakdown?.vehicleCode;
  return typeof value === "string" ? value : "Autocar";
}

function accountCreationUrl(quoteId: string) {
  return publicUrl(`/connexion/inscription?quoteId=${encodeURIComponent(quoteId)}`);
}

function accountLoginUrl(quoteId: string) {
  return publicUrl(`/connexion?quoteId=${encodeURIComponent(quoteId)}`);
}

function publicUrl(pathname: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL;
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const base = (configured || vercelUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    departure_city: "ville de départ",
    arrival_city: "ville d’arrivée",
    departure_date: "date de départ",
    passenger_count: "nombre de passagers",
    trip_type: "type de trajet",
    email: "email de contact",
  };
  return labels[field] ?? field;
}

function reviewMessage(reason: string | null | undefined) {
  return clientHumanReviewNotice(reason);
}
