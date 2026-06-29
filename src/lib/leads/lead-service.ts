import type { LeadStatus } from "../domain/status";
import type { QuoteOptions, TripType } from "../domain/types";
import { logAuditEvent } from "../audit/audit-service";
import { createServerSupabaseClient } from "../supabase/server";
import { triggerHumanReview } from "../../shared/lib/n8n/triggerHumanReview";

export type LeadRecord = {
  id: string;
  client_id: string | null;
  client_type?: string | null;
  name?: string | null;
  contact_name?: string | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  departure_city: string | null;
  arrival_city: string | null;
  departure_date: string | null;
  return_date: string | null;
  passenger_count: number | null;
  trip_type: TripType | null;
  has_intermediate_stop: boolean;
  intermediate_stops: string[];
  options: QuoteOptions | null;
  free_message: string | null;
  status: LeadStatus;
  missing_fields: string[] | null;
  human_review_reason: string | null;
};

export async function getLeadById(leadId: string): Promise<LeadRecord | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*, clients(name, contact_name, organization, email, phone)")
    .eq("id", leadId)
    .single();

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("leads")
      .select("*, clients(name, organization, email)")
      .eq("id", leadId)
      .single();

    if (fallback.error) {
      throw new Error(`Unable to load lead ${leadId}: ${fallback.error.message}`);
    }

    return fallback.data ? toLeadRecord(fallback.data as Record<string, unknown>) : null;
  }

  if (error) {
    throw new Error(`Unable to load lead ${leadId}: ${error.message}`);
  }

  return data ? toLeadRecord(data as Record<string, unknown>) : null;
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);

  if (error) {
    const legacyStatus = toLegacyStatus(status);
    if (!legacyStatus || legacyStatus === status) {
      throw new Error(`Unable to update lead ${leadId} status: ${error.message}`);
    }

    const fallback = await supabase.from("leads").update({ status: legacyStatus }).eq("id", leadId);
    if (fallback.error) {
      throw new Error(`Unable to update lead ${leadId} status: ${fallback.error.message}`);
    }
  }

  await logAuditEvent({
    entityType: "lead",
    entityId: leadId,
    action: "LEAD_STATUS_UPDATED",
    metadata: { status, ...metadata },
  });
}

export async function markLeadIncomplete(
  leadId: string,
  missingFields: string[],
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("leads")
    .update({
      status: "INCOMPLETE",
      missing_fields: missingFields,
    })
    .eq("id", leadId);

  if (error) {
    throw new Error(`Unable to mark lead ${leadId} incomplete: ${error.message}`);
  }

  await logAuditEvent({
    entityType: "lead",
    entityId: leadId,
    action: "LEAD_MARKED_INCOMPLETE",
    metadata: { missingFields },
  });
}

export async function markHumanReview(leadId: string, reason: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("leads")
    .update({
      status: "HUMAN_REVIEW",
      human_review_reason: reason,
    })
    .eq("id", leadId);

  if (error) {
    throw new Error(`Unable to mark lead ${leadId} for human review: ${error.message}`);
  }

  await logAuditEvent({
    entityType: "lead",
    entityId: leadId,
    action: "LEAD_MARKED_HUMAN_REVIEW",
    metadata: { reason },
  });

  // Fire-and-forget — n8n notification does not block the lead update.
  triggerHumanReview({ leadId, reason }).catch(() => {});
}

function toLeadRecord(data: Record<string, unknown>): LeadRecord {
  const clients = data.clients;
  const client = Array.isArray(clients) ? clients[0] : clients;
  const clientRecord =
    client && typeof client === "object" ? (client as Record<string, unknown>) : {};

  return {
    ...(data as unknown as LeadRecord),
    name: (clientRecord.name as string | null | undefined) ?? null,
    contact_name:
      (clientRecord.contact_name as string | null | undefined) ??
      (clientRecord.name as string | null | undefined) ??
      null,
    organization: (clientRecord.organization as string | null | undefined) ?? null,
    email: (clientRecord.email as string | null | undefined) ?? null,
    phone: (clientRecord.phone as string | null | undefined) ?? null,
  };
}

function toLegacyStatus(status: LeadStatus): LeadStatus | null {
  if (status === "FOLLOWUP_1" || status === "FOLLOWUP_2") return "FOLLOWUP_SCHEDULED";
  return null;
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}
