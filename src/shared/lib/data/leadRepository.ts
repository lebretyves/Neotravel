import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Lead } from "@/shared/types/lead";

type LeadRow = {
 id: string;
 status: Lead["status"];
 free_message: string | null;
 departure_city: string | null;
 arrival_city: string | null;
 departure_date: string | null;
 return_date: string | null;
 passenger_count: number | null;
 trip_type: Lead["tripType"];
 options: string[] | null;
 missing_fields: string[] | null;
 confidence: number | null;
 human_review_reason: string | null;
 ai_summary: string | null;
 created_at?: string | null;
 updated_at?: string | null;
 clients?: { organization: string | null; email: string | null } | { organization: string | null; email: string | null }[] | null;
};

function toLead(row: LeadRow): Lead {
 const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;

 return {
  id: row.id,
  status: row.status,
  rawMessage: row.free_message ?? undefined,
  organization: client?.organization ?? null,
  email: client?.email ?? null,
  departureCity: row.departure_city,
  arrivalCity: row.arrival_city,
  departureDate: row.departure_date,
  returnDate: row.return_date,
  passengerCount: row.passenger_count,
  tripType: row.trip_type,
  options: row.options ?? [],
  missingFields: row.missing_fields ?? [],
  confidence: row.confidence,
  humanReviewReason: row.human_review_reason,
  aiSummary: row.ai_summary,
  source: null,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? null,
  qualifiedAt: null,
  quotedAt: null,
  sentAt: null,
  acceptedAt: null
 };
}

const leadSelection =
 "id, status, free_message, departure_city, arrival_city, departure_date, return_date, passenger_count, trip_type, options, missing_fields, confidence, human_review_reason, ai_summary, created_at, updated_at, clients(organization, email)";

function toDatabaseLeadStatus(status?: Lead["status"]) {
 if (status === "HIGH_VALUE") return "QUALIFIED";
 if (status === "FOLLOWUP_1" || status === "FOLLOWUP_2") return "FOLLOWUP_SCHEDULED";
 return status;
}

export async function createLeadRecord(input: Partial<Lead>) {
 if (shouldUseDemoData()) return demoStore.createLead(input);

 const supabase = createSupabaseAdminClient();
 let clientId: string | null = null;

 if (input.email) {
  const { data: existingClient, error: lookupError } = await supabase
   .from("clients")
   .select("id")
   .eq("email", input.email)
   .maybeSingle();

  if (lookupError) throw lookupError;

  if (existingClient) {
   clientId = existingClient.id;
  } else {
   const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
     organization: input.organization ?? null,
     email: input.email
    })
   .select("id")
   .single();

   if (clientError) throw clientError;
   clientId = client.id;
  }
 }

 const { data, error } = await supabase
  .from("leads")
  .insert({
   client_id: clientId,
   status: toDatabaseLeadStatus(input.status) ?? "NEW",
   free_message: input.rawMessage ?? null,
   departure_city: input.departureCity ?? null,
   arrival_city: input.arrivalCity ?? null,
   departure_date: input.departureDate ?? null,
   return_date: input.returnDate ?? null,
   passenger_count: input.passengerCount ?? null,
   trip_type: input.tripType ?? null,
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
  status: toDatabaseLeadStatus(patch.status),
  free_message: patch.rawMessage,
  departure_city: patch.departureCity,
  arrival_city: patch.arrivalCity,
  departure_date: patch.departureDate,
  return_date: patch.returnDate,
  passenger_count: patch.passengerCount,
  trip_type: patch.tripType,
  options: patch.options,
  missing_fields: patch.missingFields,
  confidence: patch.confidence,
  human_review_reason: patch.humanReviewReason,
  ai_summary: patch.aiSummary
 };

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
