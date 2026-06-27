import { randomUUID } from "crypto";
import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { ModelRun } from "@/shared/types/model-run";

type ModelRunRow = {
 id: string;
 entity_id: string;
 metadata: Partial<ModelRun> | null;
 created_at: string;
};

function toModelRun(row: ModelRunRow): ModelRun {
 const metadata = row.metadata ?? {};
 return {
  id: row.id,
  leadId: metadata.leadId ?? null,
  purpose: metadata.purpose ?? "tool_call",
  provider: metadata.provider ?? "mock",
  model: metadata.model ?? "unknown",
  promptTokens: metadata.promptTokens,
  completionTokens: metadata.completionTokens,
  costEur: metadata.costEur,
  latencyMs: metadata.latencyMs,
  payloadHash: metadata.payloadHash ?? row.entity_id,
  outputHash: metadata.outputHash,
  status: metadata.status ?? "mock",
  errorMessage: metadata.errorMessage,
  createdAt: row.created_at
 };
}

export async function createModelRunRecord(input: Omit<ModelRun, "id" | "createdAt">) {
 if (shouldUseDemoData()) return demoStore.createModelRun(input);

 const supabase = createSupabaseAdminClient();
 const entityId = randomUUID();
 const { data, error } = await supabase
  .from("audit_logs")
  .insert({
   entity_type: "model_run",
   entity_id: entityId,
   action: "model.run",
   metadata: { ...input, payloadHash: input.payloadHash, status: input.status ?? "success" }
  })
  .select("id, entity_id, metadata, created_at")
  .single();

 if (error) throw error;
 return toModelRun(data as ModelRunRow);
}

export async function listModelRuns() {
 if (shouldUseDemoData()) return demoStore.listModelRuns();

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("audit_logs")
  .select("id, entity_id, metadata, created_at")
  .eq("entity_type", "model_run")
  .order("created_at", { ascending: false });

 if (error) throw error;
 return (data as ModelRunRow[]).map(toModelRun);
}
