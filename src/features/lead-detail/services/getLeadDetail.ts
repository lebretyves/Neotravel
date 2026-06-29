import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { QuoteOptions } from "@/lib/domain/types";
import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { getLeadById } from "@/shared/lib/data/leadRepository";
import type { Lead } from "@/shared/types/lead";

export async function getLeadDetail(leadId: string): Promise<Lead | null> {
  if (shouldUseDemoData()) return getLeadById(leadId);

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, status, free_message, client_type, departure_city, arrival_city, departure_date, return_date, passenger_count, trip_type, has_intermediate_stop, intermediate_stops, options, missing_fields, confidence, ai_summary, human_review_reason, human_review_notes, created_at, updated_at, clients(name, contact_name, organization, email, phone)",
    )
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load lead: ${error.message}`);
  if (!data) return null;

  const client = Array.isArray(data.clients) ? data.clients[0] : data.clients;

  return {
    id: data.id,
    status: data.status as Lead["status"],
    rawMessage: data.free_message ?? undefined,
    clientType: data.client_type ?? null,
    contactName: client?.contact_name ?? client?.name ?? null,
    organization: client?.organization ?? null,
    email: client?.email ?? null,
    phone: client?.phone ?? null,
    departureCity: data.departure_city,
    arrivalCity: data.arrival_city,
    departureDate: data.departure_date,
    returnDate: data.return_date,
    passengerCount: data.passenger_count,
    tripType: data.trip_type as Lead["tripType"],
    hasIntermediateStop: Boolean(data.has_intermediate_stop),
    intermediateStops: Array.isArray(data.intermediate_stops) ? data.intermediate_stops : [],
    options: formatOptions(data.options as QuoteOptions | null),
    missingFields: data.missing_fields ?? [],
    confidence: data.confidence,
    humanReviewReason: data.human_review_reason,
    humanReviewNotes: (data as { human_review_notes?: string | null }).human_review_notes ?? null,
    aiSummary: data.ai_summary,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function formatOptions(options: (QuoteOptions & Record<string, unknown>) | null): string[] {
  if (!options) return [];

  return [
    options.guide || options.guideDays ? "Guide / accompagnateur (à confirmer)" : null,
    options.driverOvernight || options.driver_overnight || options.driverNights
      ? "Nuit chauffeur (à confirmer)"
      : null,
    options.tolls || options.tollsIncluded || options.tollPackageEur ? "Péages (à confirmer)" : null,
  ].filter((option): option is string => option !== null);
}
