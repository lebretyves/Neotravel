import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { QuoteOptions } from "@/lib/domain/types";
import type { Lead } from "@/shared/types/lead";

export async function getLeadDetail(leadId: string): Promise<Lead | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, status, free_message, departure_city, arrival_city, departure_date, return_date, passenger_count, trip_type, options, missing_fields, confidence, ai_summary, human_review_reason, human_review_notes, created_at, updated_at, clients(organization, email)",
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
    organization: client?.organization ?? null,
    email: client?.email ?? null,
    departureCity: data.departure_city,
    arrivalCity: data.arrival_city,
    departureDate: data.departure_date,
    returnDate: data.return_date,
    passengerCount: data.passenger_count,
    tripType: data.trip_type as Lead["tripType"],
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

function formatOptions(options: QuoteOptions | null): string[] {
  if (!options) return [];

  return [
    options.guideDays ? `${options.guideDays} jour(s) de guide` : null,
    options.driverNights ? `${options.driverNights} nuit(s) chauffeur` : null,
    options.tollsIncluded ? "Péages inclus" : null,
  ].filter((option): option is string => option !== null);
}
