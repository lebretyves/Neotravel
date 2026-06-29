import { logAuditEvent } from "../../../lib/audit/audit-service";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export type ScheduleFollowupsInput = {
  leadId: string;
  quoteId?: string;
  quoteStatus?: "QUOTE_SENT";
  isUrgent?: boolean;
  now?: string | Date;
};

export function getFollowupDelays(input: Pick<ScheduleFollowupsInput, "isUrgent">) {
  if (process.env.DEMO_FAST_FOLLOWUP === "true") {
    return [{ label: "DEMO_FAST_FOLLOWUP", delayMs: 2 * MINUTE_MS }];
  }

  if (input.isUrgent) {
    return [{ label: "URGENT_J2", delayMs: 2 * DAY_MS }];
  }

  return [
    { label: "STANDARD_J3", delayMs: 3 * DAY_MS },
    { label: "STANDARD_J7", delayMs: 7 * DAY_MS }
  ];
}

export function resolvePostFollowupOutcome(input: { sentFollowupsWithoutResponse: number }) {
  if (input.sentFollowupsWithoutResponse < 2) return "PENDING";
  return "CLOSED";
}

export async function scheduleFollowups(input: ScheduleFollowupsInput) {
  const sourceDate = input.now ? new Date(input.now) : new Date();
  const delays = getFollowupDelays(input).slice(0, 2);

  const supabase = createServerSupabaseClient();
  if (input.quoteId) {
    const { data: existing, error: existingError } = await supabase
      .from("followups")
      .select("id, lead_id, quote_id, scheduled_at, channel, status")
      .eq("quote_id", input.quoteId)
      .order("scheduled_at", { ascending: true });

    if (existingError) throw new Error(`Unable to load existing followups: ${existingError.message}`);

    if ((existing?.length ?? 0) > 0) {
      return {
        leadId: input.leadId,
        quoteId: input.quoteId,
        quoteStatus: input.quoteStatus ?? "QUOTE_SENT",
        ruleSet: process.env.DEMO_FAST_FOLLOWUP === "true" ? "demo_fast" : input.isUrgent ? "urgent" : "standard",
        nextOutcomeAfterTwoNoResponse: resolvePostFollowupOutcome({
          sentFollowupsWithoutResponse: 2,
        }),
        followups: existing!.map((followup) => ({
          id: followup.id,
          leadId: followup.lead_id,
          quoteId: followup.quote_id ?? undefined,
          channel: "email" as const,
          status: followup.status === "sent" ? "SENT" as const : "SCHEDULED" as const,
          dueAt: followup.scheduled_at,
        }))
      };
    }
  }

  const followups = await Promise.all(delays.map(async (delay) => {
    const dueAt = new Date(sourceDate.getTime() + delay.delayMs).toISOString();
    const { data, error } = await supabase
      .from("followups")
      .insert({
        lead_id: input.leadId,
        quote_id: input.quoteId ?? null,
        channel: "email",
        status: "scheduled",
        scheduled_at: dueAt,
      })
      .select("id, lead_id, quote_id, scheduled_at")
      .single();

    if (error) throw new Error(`Unable to schedule followup: ${error.message}`);

    return {
      id: data.id,
      leadId: data.lead_id,
      quoteId: data.quote_id ?? undefined,
      channel: "email" as const,
      status: "SCHEDULED" as const,
      dueAt: data.scheduled_at,
    };
  }));

  await Promise.all(
    followups.map((followup, index) =>
      logAuditEvent({
        entityType: "followup",
        entityId: followup.id,
        action: "FOLLOWUP_SCHEDULED",
        metadata: {
          leadId: followup.leadId,
          quoteId: followup.quoteId,
          channel: followup.channel,
          dueAt: followup.dueAt,
          rule: delays[index]?.label,
          quoteStatus: input.quoteStatus ?? "QUOTE_SENT"
        }
      })
    )
  );

  return {
    leadId: input.leadId,
    quoteId: input.quoteId,
    quoteStatus: input.quoteStatus ?? "QUOTE_SENT",
    ruleSet: process.env.DEMO_FAST_FOLLOWUP === "true" ? "demo_fast" : input.isUrgent ? "urgent" : "standard",
    nextOutcomeAfterTwoNoResponse: resolvePostFollowupOutcome({
      sentFollowupsWithoutResponse: 2,
    }),
    followups
  };
}
