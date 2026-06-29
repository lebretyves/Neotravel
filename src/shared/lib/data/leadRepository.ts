import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Lead } from "@/shared/types/lead";

type LeadRow = {
  id: string;
  status: Lead["status"];
  free_message: string | null;
  client_type?: string | null;
  departure_city: string | null;
  arrival_city: string | null;
  departure_date: string | null;
  return_date: string | null;
  passenger_count: number | null;
  trip_type: Lead["tripType"];
  has_intermediate_stop?: boolean | null;
  intermediate_stops?: string[] | null;
  options: string[] | Record<string, unknown> | null;
  missing_fields: string[] | null;
  confidence?: number | null;
  human_review_reason: string | null;
  ai_summary?: string | null;
  clients?:
    | { name: string | null; contact_name?: string | null; organization: string | null; email: string | null; phone?: string | null }
    | { name: string | null; contact_name?: string | null; organization: string | null; email: string | null; phone?: string | null }[]
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
    options: normalizeOptions(row.options),
    missingFields: row.missing_fields ?? [],
    confidence: row.confidence,
    humanReviewReason: row.human_review_reason,
    aiSummary: row.ai_summary
  };
}

function normalizeOptions(options: LeadRow["options"]): string[] {
  if (Array.isArray(options)) return options;
  if (options && typeof options === "object") {
    // Map the raw options jsonb to canonical option codes. Quantity keys (guideDays /
    // driverNights) enable their parent option but must never surface as options themselves.
    const record = options as Record<string, unknown>;
    const isPositive = (value: unknown) => typeof value === "number" && value > 0;
    const codes = new Set<string>();
    if (record.guide || isPositive(record.guideDays)) codes.add("guide");
    if (record.driverOvernight || record.driver_overnight || isPositive(record.driverNights)) {
      codes.add("driver_overnight");
    }
    if (record.tolls || record.tollsIncluded || isPositive(record.tollPackageEur)) codes.add("tolls");
    return [...codes];
  }
  return [];
}

const leadSelection =
  "id, status, free_message, client_type, departure_city, arrival_city, departure_date, return_date, passenger_count, trip_type, has_intermediate_stop, intermediate_stops, options, missing_fields, confidence, human_review_reason, ai_summary, clients(name, contact_name, organization, email, phone)";

const legacyLeadSelection =
  "id, status, free_message, departure_city, arrival_city, departure_date, return_date, passenger_count, trip_type, has_intermediate_stop, intermediate_stops, options, missing_fields, human_review_reason, clients(name, organization, email)";

export async function createLeadRecord(input: Partial<Lead>) {
  if (shouldUseDemoData()) return demoStore.createLead(input);

  const supabase = createSupabaseAdminClient();
  let clientId: string | null = null;

  if (input.email) {
    clientId = await upsertClientId({
      email: input.email,
      name: input.contactName ?? null,
      contactName: input.contactName ?? null,
      organization: input.organization ?? null,
      phone: input.phone ?? null
    });
  }

  const payload = buildLeadInsert(input, clientId);
  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select(leadSelection)
    .single();

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("leads")
      .insert(toLegacyLeadPayload(payload))
      .select(legacyLeadSelection)
      .single();

    if (fallback.error) throw fallback.error;
    return toLead(fallback.data as unknown as LeadRow);
  }

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
      const clientId = await upsertClientId({
        email,
        name: patch.contactName ?? current?.contactName ?? null,
        contactName: patch.contactName ?? current?.contactName ?? null,
        organization: patch.organization ?? current?.organization ?? null,
        phone: patch.phone ?? current?.phone ?? null
      });
      Object.assign(update, { client_id: clientId });
    }
  }

  const { data, error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id)
    .select(leadSelection)
    .single();

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("leads")
      .update(toLegacyLeadPayload(update))
      .eq("id", id)
      .select(legacyLeadSelection)
      .single();

    if (fallback.error) throw fallback.error;
    return toLead(fallback.data as unknown as LeadRow);
  }

  if (error) throw error;
  return toLead(data as unknown as LeadRow);
}

export async function getLeadById(id: string) {
  if (shouldUseDemoData()) return demoStore.getLeadById(id);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("leads").select(leadSelection).eq("id", id).maybeSingle();

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase.from("leads").select(legacyLeadSelection).eq("id", id).maybeSingle();
    if (fallback.error) throw fallback.error;
    return fallback.data ? toLead(fallback.data as unknown as LeadRow) : null;
  }

  if (error) throw error;
  return data ? toLead(data as unknown as LeadRow) : null;
}

export async function listLeads() {
  if (shouldUseDemoData()) return demoStore.listLeads();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("leads").select(leadSelection).order("created_at", { ascending: false });

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase.from("leads").select(legacyLeadSelection).order("created_at", { ascending: false });
    if (fallback.error) throw fallback.error;
    return (fallback.data as unknown as LeadRow[]).map(toLead);
  }

  if (error) throw error;
  return (data as unknown as LeadRow[]).map(toLead);
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

type ClientUpsertInput = {
  email: string;
  name: string | null;
  contactName: string | null;
  organization: string | null;
  phone: string | null;
};

async function upsertClientId(input: ClientUpsertInput): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const existing = await supabase
    .from("clients")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();

  if (existing.error) throw existing.error;

  const fullPayload = {
    name: input.name,
    contact_name: input.contactName,
    organization: input.organization,
    email: input.email,
    phone: input.phone
  };
  const legacyPayload = {
    name: input.name,
    organization: input.organization,
    email: input.email
  };

  if (existing.data?.id) {
    const update = await supabase
      .from("clients")
      .update(fullPayload)
      .eq("id", existing.data.id)
      .select("id")
      .single();

    if (update.error && isMissingColumnError(update.error)) {
      const fallback = await supabase
        .from("clients")
        .update(legacyPayload)
        .eq("id", existing.data.id)
        .select("id")
        .single();

      if (fallback.error) throw fallback.error;
      return fallback.data.id as string;
    }

    if (update.error) throw update.error;
    return update.data.id as string;
  }

  const insert = await supabase
    .from("clients")
    .insert(fullPayload)
    .select("id")
    .single();

  if (insert.error && isMissingColumnError(insert.error)) {
    const fallback = await supabase
      .from("clients")
      .insert(legacyPayload)
      .select("id")
      .single();

    if (fallback.error) throw fallback.error;
    return fallback.data.id as string;
  }

  if (insert.error) throw insert.error;
  return insert.data.id as string;
}

function buildLeadInsert(input: Partial<Lead>, clientId: string | null): Record<string, unknown> {
  return {
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
  };
}

function toLegacyLeadPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const legacyKeys = new Set([
    "client_id",
    "status",
    "free_message",
    "departure_city",
    "arrival_city",
    "departure_date",
    "return_date",
    "passenger_count",
    "trip_type",
    "has_intermediate_stop",
    "intermediate_stops",
    "options",
    "missing_fields",
    "human_review_reason"
  ]);

  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => legacyKeys.has(key) && value !== undefined)
  );
}
