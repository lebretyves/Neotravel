import { z } from "zod";
import { demoScenarios } from "@/data/demo-scenarios";
import { isDemoMode } from "@/shared/lib/demo/demoMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";

const LoadScenarioSchema = z.object({
 scenarioId: z.string().min(1)
});

export async function GET() {
 if (!isDemoMode()) return jsonError("DEMO_MODE_DISABLED", "Scenarios demo indisponibles hors DEMO_MODE.", 403);

 return jsonOk({ scenarios: demoScenarios.filter((scenario) => scenario.showInDemo) });
}

export async function POST(request: Request) {
 if (!isDemoMode()) return jsonError("DEMO_MODE_DISABLED", "Chargement scenario bloque hors DEMO_MODE.", 403);

 const body = LoadScenarioSchema.safeParse(await request.json());
 if (!body.success) return jsonError("VALIDATION_ERROR", "Payload invalide.", 400, body.error.flatten());

 const result = demoStore.loadScenario(body.data.scenarioId);
 if (!result) return jsonError("SCENARIO_NOT_FOUND", "Scenario demo introuvable.", 404);

 return jsonOk({
  scenario: result.scenario,
  counts: {
   leads: result.leads.length,
   quotes: result.quotes.length,
   followups: result.followups.length,
   auditLogs: result.auditLogs.length
  }
 });
}
