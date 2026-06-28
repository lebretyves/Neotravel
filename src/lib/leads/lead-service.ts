import type { LeadStatus } from "../domain/status";
import type { QuoteOptions, TripType } from "../domain/types";
import { logAuditEvent } from "../audit/audit-service";
import { createServerSupabaseClient } from "../supabase/server";
import { triggerHumanReview } from "../../shared/lib/n8n/triggerHumanReview";

export type LeadRecord = {
  id: string;
  client_id: string | null;
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
  const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single();

  if (error) {
    throw new Error(`Unable to load lead ${leadId}: ${error.message}`);
  }

  return data as LeadRecord | null;
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);

  if (error) {
    throw new Error(`Unable to update lead ${leadId} status: ${error.message}`);
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
