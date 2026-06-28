import { z } from "zod";
import { runDemandExtraction } from "@/features/ai-orchestration/services/runDemandExtraction";
import { qualifyDemand } from "@/features/demand/actions/qualifyDemand";
import { validateDemandCompleteness } from "@/features/demand/services/validateDemandCompleteness";
import { createHumanReview } from "@/features/human-review/services/createHumanReview";
import { evaluateHumanReview } from "@/features/human-review/services/shouldEscalate";
import { calculateQuote } from "@/features/quote/services/calculateQuote";
import { scheduleFollowups } from "@/features/followups/services/scheduleFollowups";
import { getDashboardKpis } from "@/features/dashboard/services/getDashboardKpis";
import { listPricingRules, listRoutePricing } from "@/shared/lib/data/pricingRepository";
import { resolveDistance } from "@/shared/lib/distance";
import { auditActions, createAuditLog, logModelRun } from "@/shared/lib/audit";
import type { DemandDraft } from "@/shared/types/lead";

const DemandToolSchema = z.object({
 id: z.string().optional(),
 rawMessage: z.string().optional(),
 organization: z.string().nullable(),
 email: z.string().email().nullable(),
 departureCity: z.string().nullable(),
 arrivalCity: z.string().nullable(),
 departureDate: z.string().nullable(),
 returnDate: z.string().nullable(),
 passengerCount: z.number().int().nullable(),
 tripType: z.enum(["one_way", "round_trip"]).nullable(),
 options: z.array(z.string()).default([]),
 confidence: z.number().min(0).max(1).optional()
});

const MessageToolSchema = z.object({
 message: z.string().min(1)
});

const QuoteToolSchema = DemandToolSchema;

const FollowupToolSchema = z.object({
 leadId: z.string().min(1),
 quoteId: z.string().min(1).optional()
});

const HumanReviewToolSchema = DemandToolSchema.partial().extend({
 leadId: z.string().optional(),
 reason: z.string().optional(),
 reasons: z.array(z.string()).optional()
});

type DemandToolInput = z.infer<typeof DemandToolSchema>;

async function logToolCall(toolName: string, input: unknown, output: unknown, status: "mock" | "blocked" = "mock") {
 try {
  await logModelRun({
   purpose: "tool_call",
   provider: "mock",
   model: `tool:${toolName}`,
   input,
   output,
   status,
   latencyMs: 0,
   costEur: 0
  });
 } catch (error) {
  console.error(`[NeoTravel] ${toolName} audit logging failed`, error);
 }
}

function toDemandDraft(input: DemandToolInput): DemandDraft {
 return {
  rawMessage: input.rawMessage,
  organization: input.organization,
  email: input.email,
  departureCity: input.departureCity,
  arrivalCity: input.arrivalCity,
  departureDate: input.departureDate,
  returnDate: input.returnDate,
  passengerCount: input.passengerCount,
  tripType: input.tripType,
  options: input.options
 };
}

export async function qualifyLeadTool(input: unknown) {
 const parsed = DemandToolSchema.parse(input);
 const output = await qualifyDemand(parsed);
 await logToolCall("qualify_lead", parsed, output);
 return output;
}

export async function detectMissingFieldsTool(input: unknown) {
 const parsed = DemandToolSchema.parse(input);
 const output = validateDemandCompleteness(toDemandDraft(parsed));
 await logToolCall("detect_missing_fields", parsed, output);
 return output;
}

export async function scoreLeadTool(input: unknown) {
 const parsed = DemandToolSchema.parse(input);
 const passengerScore = Math.min(parsed.passengerCount ?? 0, 85);
 const urgencyScore = parsed.departureDate ? 10 : 0;
 const optionScore = parsed.options.length * 2;
 const output = {
  score: passengerScore + urgencyScore + optionScore,
  priority: passengerScore >= 60 ? "high" : passengerScore >= 30 ? "standard" : "low"
 };
 await logToolCall("score_lead", parsed, output);
 return output;
}

export async function lookupPricingRulesTool() {
 const output = {
  pricingRules: await listPricingRules(),
  routePricing: await listRoutePricing()
 };
 await logToolCall("lookup_pricing_rules", {}, output);
 return output;
}

export async function calculerDevisTool(input: unknown) {
 const parsed = QuoteToolSchema.parse(input);
 const demand = toDemandDraft(parsed);
 const completeness = validateDemandCompleteness(demand);

 if (!completeness.complete) {
  const output = { status: "INCOMPLETE", missingFields: completeness.missingFields.map(String) };
  await logToolCall("calculer_devis", parsed, output, "blocked");
  return output;
 }

 const humanReview = evaluateHumanReview({
  ...demand,
  confidence: parsed.confidence
 });

 if (humanReview.escalate) {
  const distanceMayResolveUnknownRoute =
   humanReview.reasons.length === 1 && humanReview.reasons[0] === "UNKNOWN_ROUTE_WITHOUT_CONTROLLED_DISTANCE";
  if (!distanceMayResolveUnknownRoute) {
   const output = await handoffHumanTool({ ...parsed, reasons: humanReview.reasons, reason: humanReview.reasons[0] });
   await logToolCall("calculer_devis", parsed, output, "blocked");
   return output;
  }
 }

 const distance = await resolveDistance({
  departureLabel: parsed.departureCity ?? "",
  arrivalLabel: parsed.arrivalCity ?? "",
  departureDate: parsed.departureDate ?? undefined
 });

 if ("status" in distance) {
  const output = await handoffHumanTool({ ...parsed, reasons: [distance.reason], reason: distance.reason });
  await logToolCall("calculer_devis", parsed, output, "blocked");
  return output;
 }

 const output = calculateQuote({
  departureCity: parsed.departureCity ?? undefined,
  arrivalCity: parsed.arrivalCity ?? undefined,
  departureDate: parsed.departureDate ?? undefined,
  passengerCount: parsed.passengerCount ?? undefined,
  options: parsed.options,
  controlledDistanceKm: distance.distanceKm
 });
 await logToolCall("calculer_devis", parsed, output);
 return output;
}

export async function generateQuotePreviewTool(input: unknown) {
 const output = await calculerDevisTool(input);
 await logToolCall("generate_quote_preview", input, output);
 return output;
}

export async function scheduleFollowupTool(input: unknown) {
 const parsed = FollowupToolSchema.parse(input);
 const output = await scheduleFollowups(parsed);
 await logToolCall("schedule_followup", parsed, output);
 return output;
}

export async function handoffHumanTool(input: unknown) {
 const parsed = HumanReviewToolSchema.parse(input);
 const output = await createHumanReview(parsed);
 await createAuditLog({
  entityType: "human_review",
  entityId: parsed.leadId ?? parsed.id ?? "tool-handoff-human",
  action: auditActions.humanReviewCreated,
  actor: "ai",
  input: parsed,
  output,
  payload: { tool: "handoff_human", status: "HUMAN_REVIEW" }
 });
 await logToolCall("handoff_human", parsed, output);
 return output;
}

export async function getKpisTool() {
 const output = await getDashboardKpis();
 await logToolCall("get_kpis", {}, output);
 return output;
}

export async function extractDemandTool(input: unknown) {
 const parsed = MessageToolSchema.parse(input);
 const output = await runDemandExtraction(parsed.message);
 await logToolCall("extract_demand", parsed, output);
 return output;
}

export const neoTravelTools = {
 qualify_lead: qualifyLeadTool,
 detect_missing_fields: detectMissingFieldsTool,
 score_lead: scoreLeadTool,
 lookup_pricing_rules: lookupPricingRulesTool,
 calculer_devis: calculerDevisTool,
 generate_quote_preview: generateQuotePreviewTool,
 schedule_followup: scheduleFollowupTool,
 handoff_human: handoffHumanTool,
 get_kpis: getKpisTool,
 extract_demand: extractDemandTool
};
