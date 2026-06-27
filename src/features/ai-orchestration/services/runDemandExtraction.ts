import { z } from "zod";
import type { DemandDraft } from "@/shared/types/lead";
import { logModelRun, type LogModelRunInput } from "@/shared/lib/audit";
import { getModelProvider } from "@/shared/lib/ai/modelProvider";
import { getOpenAIClient } from "@/shared/lib/ai/openaiClient";
import { modelConfig } from "@/shared/lib/ai/modelConfig";
import { extractDemandInfo } from "@/features/demand/ai/extractDemandInfo";

const AiDemandExtractionSchema = z.object({
 organization: z.string().nullable().optional(),
 email: z.string().nullable().optional(),
 departureCity: z.string().nullable().optional(),
 arrivalCity: z.string().nullable().optional(),
 departureDate: z.string().nullable().optional(),
 returnDate: z.string().nullable().optional(),
 passengerCount: z.union([z.number(), z.string()]).nullable().optional(),
 tripType: z.string().nullable().optional(),
 options: z.array(z.string()).optional()
});

type AiDemandExtraction = z.infer<typeof AiDemandExtractionSchema>;

async function safeLogModelRun(input: LogModelRunInput) {
 try {
  await logModelRun(input);
 } catch (error) {
  console.error("[NeoTravel] model run audit logging failed", error);
 }
}

function nonEmptyString(value: unknown) {
 return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isoDate(value: unknown) {
 const text = nonEmptyString(value);
 return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function passengerCount(value: unknown) {
 if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
 if (typeof value === "string") {
  const parsed = Number(value.replace(/[^\d]/g, ""));
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
 }
 return null;
}

function tripType(value: unknown) {
 return value === "one_way" || value === "round_trip" ? value : null;
}

function email(value: unknown) {
 const text = nonEmptyString(value);
 return text && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text) ? text : null;
}

function extractJsonFromText(text: string): unknown {
 const trimmed = text.trim();
 try {
  return JSON.parse(trimmed);
 } catch {
  // fall through
 }

 const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
 if (block) {
  try {
   return JSON.parse(block[1].trim());
  } catch {
   // fall through
  }
 }

 const object = trimmed.match(/\{[\s\S]*\}/);
 if (object) {
  try {
   return JSON.parse(object[0]);
  } catch {
   // fall through
  }
 }

 return {};
}

function mergeDemandDraft(message: string, fallback: DemandDraft, ai: AiDemandExtraction): DemandDraft {
 const aiOptions = Array.isArray(ai.options)
  ? ai.options.map((option) => nonEmptyString(option)).filter((option): option is string => Boolean(option))
  : [];

 return {
  rawMessage: message,
  organization: nonEmptyString(ai.organization) ?? fallback.organization,
  email: email(ai.email) ?? fallback.email,
  departureCity: nonEmptyString(ai.departureCity) ?? fallback.departureCity,
  arrivalCity: nonEmptyString(ai.arrivalCity) ?? fallback.arrivalCity,
  departureDate: isoDate(ai.departureDate) ?? fallback.departureDate,
  returnDate: isoDate(ai.returnDate) ?? fallback.returnDate,
  passengerCount: passengerCount(ai.passengerCount) ?? fallback.passengerCount,
  tripType: tripType(ai.tripType) ?? fallback.tripType,
  options: Array.from(new Set([...fallback.options, ...aiOptions]))
 };
}

function buildExtractionPrompt(message: string) {
 return `Extrais les informations utiles pour qualifier une demande de transport NeoTravel.
Retourne uniquement un objet JSON valide, sans markdown ni phrase autour.

Champs attendus:
{
 "organization": string | null,
 "email": string | null,
 "departureCity": string | null,
 "arrivalCity": string | null,
 "departureDate": "YYYY-MM-DD" | null,
 "returnDate": "YYYY-MM-DD" | null,
 "passengerCount": number | null,
 "tripType": "one_way" | "round_trip" | null,
 "options": string[]
}

Regles:
- Ne calcule jamais de prix, remise, marge ou tarif.
- N'invente pas de champ absent.
- Une date doit etre au format YYYY-MM-DD.
- Si le client dit aller-retour, tripType vaut "round_trip"; sinon "one_way" seulement si c'est explicite.
- Les options sont par exemple guide, nuit_chauffeur, peages.

Message client:
${message}`;
}

export async function runDemandExtraction(message: string): Promise<DemandDraft> {
 const fallback = await extractDemandInfo(message);
 const provider = getModelProvider();

 if (!provider.canUseRealModel) {
  await safeLogModelRun({
   purpose: "extract_demand",
   provider: "mock",
   model: "mock-extractor",
   input: { message },
   output: fallback,
   status: "mock",
   latencyMs: 0,
   costEur: 0
  });
  return fallback;
 }

 const startedAt = Date.now();

 try {
  const client = getOpenAIClient(provider.provider);
  const completion = await client.chat.completions.create({
   model: provider.model,
   temperature: modelConfig.temperature,
   response_format: { type: "json_object" },
   messages: [
    {
     role: "system",
     content:
      "Tu aides NeoTravel a structurer une demande commerciale. Tu ne calcules jamais le prix: le prix est reserve au moteur deterministe calculer_devis()."
    },
    { role: "user", content: buildExtractionPrompt(message) }
   ]
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = AiDemandExtractionSchema.safeParse(extractJsonFromText(content));
  const output = mergeDemandDraft(message, fallback, parsed.success ? parsed.data : {});

  await safeLogModelRun({
   purpose: "extract_demand",
   provider: provider.provider,
   model: provider.model,
   input: { message },
   output,
   status: "success",
   promptTokens: completion.usage?.prompt_tokens,
   completionTokens: completion.usage?.completion_tokens,
   latencyMs: Date.now() - startedAt,
   costEur: 0
  });

  return output;
 } catch (error) {
  await safeLogModelRun({
   purpose: "extract_demand",
   provider: provider.provider,
   model: provider.model,
   input: { message },
   output: fallback,
   status: "error",
   latencyMs: Date.now() - startedAt,
   costEur: 0,
   errorMessage: error instanceof Error ? error.message : "AI extraction failed"
  });

  return fallback;
 }
}
