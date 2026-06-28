import { listModelRuns } from "@/shared/lib/data/modelRunRepository";
import type { ModelRun } from "@/shared/types/model-run";

/**
 * Reads persisted AI calls from the real `model_runs` table. Returns [] defensively
 * if the table is empty or unavailable — never fabricates cost data. NOTE: the live
 * prospect chat currently traces AI calls to server logs (Vercel), not to model_runs,
 * so this is empty until the chat route is instrumented to persist runs.
 */
export async function getModelRuns(): Promise<ModelRun[]> {
  try {
    return await listModelRuns();
  } catch {
    return [];
  }
}
