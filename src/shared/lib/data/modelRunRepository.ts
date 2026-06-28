import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { ModelRun } from "@/shared/types/model-run";

type ModelRunRow = {
  id: string;
  lead_id: string | null;
  purpose: ModelRun["purpose"];
  provider: string;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  estimated_cost_eur: number | null;
  latency_ms: number | null;
  input_hash: string | null;
  output_hash: string | null;
  status: ModelRun["status"];
  error_message: string | null;
  created_at: string;
};

function toModelRun(row: ModelRunRow): ModelRun {
  return {
    id: row.id,
    leadId: row.lead_id,
    purpose: row.purpose,
    provider: row.provider,
    model: row.model,
    promptTokens: row.prompt_tokens ?? undefined,
    completionTokens: row.completion_tokens ?? undefined,
    costEur: row.estimated_cost_eur ?? undefined,
    latencyMs: row.latency_ms ?? undefined,
    payloadHash: row.input_hash ?? "",
    outputHash: row.output_hash ?? undefined,
    status: row.status,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at
  };
}

function isMissingModelRunsTable(error: { code?: string; message?: string }) {
  return error.code === "PGRST205" || error.message?.includes("model_runs");
}

function createVolatileModelRun(input: Omit<ModelRun, "id" | "createdAt">): ModelRun {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
}

export async function createModelRunRecord(input: Omit<ModelRun, "id" | "createdAt">) {
  if (shouldUseDemoData()) return demoStore.createModelRun(input);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("model_runs")
    .insert({
      purpose: input.purpose,
      lead_id: input.leadId ?? null,
      provider: input.provider ?? "mock",
      model: input.model,
      prompt_tokens: input.promptTokens ?? null,
      completion_tokens: input.completionTokens ?? null,
      estimated_cost_eur: input.costEur ?? null,
      latency_ms: input.latencyMs ?? null,
      input_hash: input.payloadHash,
      output_hash: input.outputHash ?? null,
      status: input.status ?? "success",
      error_message: input.errorMessage ?? null
    })
    .select("id, lead_id, purpose, provider, model, prompt_tokens, completion_tokens, estimated_cost_eur, latency_ms, input_hash, output_hash, status, error_message, created_at")
    .single();

  if (error && isMissingModelRunsTable(error)) return createVolatileModelRun(input);
  if (error) throw error;
  return toModelRun(data as ModelRunRow);
}

export async function listModelRuns() {
  if (shouldUseDemoData()) return demoStore.listModelRuns();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("model_runs")
    .select("id, lead_id, purpose, provider, model, prompt_tokens, completion_tokens, estimated_cost_eur, latency_ms, input_hash, output_hash, status, error_message, created_at")
    .order("created_at", { ascending: false });

  if (error && isMissingModelRunsTable(error)) return [];
  if (error) throw error;
  return (data as ModelRunRow[]).map(toModelRun);
}
