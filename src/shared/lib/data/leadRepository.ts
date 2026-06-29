import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Lead } from "@/shared/types/lead";

type LeadRow = {
  id: string;
  status: Lead["status"];
  free_message: string | null;
  client_type: string | null;
  departure_city: string | null;
  arrival_city: string | null;
  departure_date: string | null;
  return_date: string | null;
  passenger_count: number | null;
  trip_type: Lead["tripType"];
  has_intermediate_stop: boolean | null;
  intermediate_stops: string[] | null;
  options: string[] | null;
  missing_fields: string[] | null;
  confidence: number | null;
  human_review_reason: string | null;
  ai_summary: string | null;
  clients?:
    | { name: string | null; contact_name: string | null; organization: string | null; email: string | null; phone: string | null }
    | { name: string | null; contact_name: string | null; organization: string | null; email: string | null; phone: string | null }[]
    | null;
};

function toLead(row: LeadRow): Lead {
  const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;

  return {
    id: row.id,
    status: row.status,
    rawMessage: row.free_message ?? undefined,
    clientType: row.client_type ?? null,
    contactName: client?.contact_name ?? client?.name ?? null,
    organization: client?.organization ?? null,
    email: client?.email ?? null,
    phone: client?.phone ?? null,
    departureCity: row.departure_city,
    arrivalCity: row.arrival_city,
    departureDate: row.departure_date,
    returnDate: row.return_date,
    passengerCount: row.passenger_count,
    tripType: row.trip_type,
    hasIntermediateStop: Boolean(row.has_intermediate_stop),
    intermediateStops: row.intermediate_stops ?? [],
    options: row.options ?? [],
    missingFields: row.missing_fields ?? [],
    confidence: row.confidence,
    humanReviewReason: row.human_review_reason,
    aiSummary: row.ai_summary
  };
}

const leadSelection =
  "id, status, free_message, client_type, departure_city, arrival_city, departure_date, return_date, passenger_count, trip_type, has_intermediate_stop, intermediate_stops, options, missing_fields, confidence, human_review_reason, ai_summary, clients(name, contact_name, organization, email, phone)";

export async function createLeadRecord(input: Partial<Lead>) {
  if (shouldUseDemoData()) return demoStore.createLead(input);

  const supabase = createSupabaseAdminClient();
  let clientId: string | null = null;

  if (input.email) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .upsert(
        {
          name: input.contactName ?? null,
          contact_name: input.contactName ?? null,
          organization: input.organization ?? null,
          email: input.email,
          phone: input.phone ?? null
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (clientError) throw clientError;
    clientId = client.id;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      client_id: clientId,
      status: input.status ?? "NEW",
      free_message: input.rawMessage ?? null,
      client_type: input.clientType ?? null,
      departure_city: input.departureCity ?? null,
      arrival_city: input.arrivalCity ?? null,
      departure_date: input.departureDate ?? null,
      return_date: input.returnDate ?? null,
      passenger_count: input.passengerCount ?? null,
      trip_type: input.tripType ?? null,
      has_intermediate_stop: input.hasIntermediateStop ?? false,
      intermediate_stops: input.intermediateStops ?? [],
      options: input.options ?? [],
      missing_fields: input.missingFields ?? [],
      confidence: input.confidence ?? null,
      human_review_reason: input.humanReviewReason ?? null,
      ai_summary: input.aiSummary ?? null
    })
    .select(leadSelection)
    .single();

  if (error) throw error;
  return toLead(data as unknown as LeadRow);
}

export async function updateLeadRecord(id: string, patch: Partial<Lead>) {
  if (shouldUseDemoData()) return demoStore.updateLead(id, patch);

  const supabase = createSupabaseAdminClient();
  const update = {
    status: patch.status,
    free_message: patch.rawMessage,
    client_type: patch.clientType,
    departure_city: patch.departureCity,
    arrival_city: patch.arrivalCity,
    departure_date: patch.departureDate,
    return_date: patch.returnDate,
    passenger_count: patch.passengerCount,
    trip_type: patch.tripType,
    has_intermediate_stop: patch.hasIntermediateStop,
    intermediate_stops: patch.intermediateStops,
    options: patch.options,
    missing_fields: patch.missingFields,
    confidence: patch.confidence,
    human_review_reason: patch.humanReviewReason,
    ai_summary: patch.aiSummary
  };

  if (patch.email !== undefined || patch.organization !== undefined || patch.contactName !== undefined || patch.phone !== undefined) {
    const current = await getLeadById(id);
    const email = patch.email ?? current?.email;
    if (email) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .upsert(
          {
            name: patch.contactName ?? current?.contactName ?? null,
            contact_name: patch.contactName ?? current?.contactName ?? null,
            organization: patch.organization ?? current?.organization ?? null,
            email,
            phone: patch.phone ?? current?.phone ?? null
          },
          { onConflict: "email" }
        )
        .select("id")
        .single();

      if (clientError) throw clientError;
      Object.assign(update, { client_id: client.id });
    }
  }

  const { data, error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id)
    .select(leadSelection)
    .single();

  if (error) throw error;
  return toLead(data as unknown as LeadRow);
}

export async function getLeadById(id: string) {
  if (shouldUseDemoData()) return demoStore.getLeadById(id);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("leads").select(leadSelection).eq("id", id).maybeSingle();

  if (error) throw error;
  return data ? toLead(data as unknown as LeadRow) : null;
}

export async function listLeads() {
  if (shouldUseDemoData()) return demoStore.listLeads();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("leads").select(leadSelection).order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as LeadRow[]).map(toLead);
}
