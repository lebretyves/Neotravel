import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Followup } from "@/shared/types/followup";

type FollowupRow = {
  id: string;
  lead_id: string;
  quote_id: string | null;
  channel: "email";
  status: string;
  scheduled_at: string;
  created_at?: string | null;
};

// The DB stores lowercase statuses (scheduled/sent/cancelled); the app type and the
// dashboard expect uppercase (SCHEDULED/SENT/…). Normalize at the boundary so followup
// counts are live everywhere.
function normalizeFollowupStatus(raw: string): Followup["status"] {
  switch (raw) {
    case "scheduled":
      return "SCHEDULED";
    case "sent":
      return "SENT";
    default:
      return raw.toUpperCase() as Followup["status"];
  }
}

function toFollowup(row: FollowupRow): Followup {
  return {
    id: row.id,
    leadId: row.lead_id,
    quoteId: row.quote_id ?? undefined,
    channel: row.channel,
    status: normalizeFollowupStatus(row.status),
    dueAt: row.scheduled_at,
    createdAt: row.created_at ?? null
  };
}

const followupSelection = "id, lead_id, quote_id, channel, status, scheduled_at, created_at";

export async function createFollowupRecord(input: Parameters<typeof demoStore.createFollowup>[0]) {
  if (shouldUseDemoData()) return demoStore.createFollowup(input);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("followups")
    .insert({
      lead_id: input.leadId,
      quote_id: input.quoteId ?? null,
      channel: input.channel,
      status: input.status ?? "SCHEDULED",
      scheduled_at: input.dueAt
    })
    .select(followupSelection)
    .single();

  if (error) throw error;
  return toFollowup(data as FollowupRow);
}

export async function listFollowups() {
  if (shouldUseDemoData()) return demoStore.listFollowups();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("followups")
    .select(followupSelection)
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return (data as FollowupRow[]).map(toFollowup);
}

export async function getFollowupById(id: string) {
  if (shouldUseDemoData()) return demoStore.listFollowups().find((followup) => followup.id === id) ?? null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("followups")
    .select(followupSelection)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toFollowup(data as FollowupRow) : null;
}
