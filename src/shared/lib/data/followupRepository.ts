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

function fromDatabaseFollowupStatus(status: string): Followup["status"] {
 if (status === "scheduled") return "SCHEDULED";
 if (status === "sent") return "SENT";
 return "SENT";
}

function toDatabaseFollowupStatus(status?: Followup["status"]) {
 if (status === "SENT" || status === "OPENED" || status === "REPLIED") return "sent";
 return "scheduled";
}

function toFollowup(row: FollowupRow): Followup {
 return {
  id: row.id,
  leadId: row.lead_id,
  quoteId: row.quote_id ?? undefined,
  channel: row.channel,
  status: fromDatabaseFollowupStatus(row.status),
  dueAt: row.scheduled_at,
  createdAt: row.created_at ?? undefined,
  updatedAt: null
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
   status: toDatabaseFollowupStatus(input.status),
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
