import { generateText, NoObjectGeneratedError, RetryError, APICallError, type ModelMessage } from "ai";

import { containsPromptInjectionAttempt, NEOTRAVEL_SYSTEM_PROMPT } from "../../../lib/ai/prompt";
import { chatJson, type ExtractedFields } from "../../../lib/ai/chat-response";
import { ExtractionDeltaSchema, LeadQualificationSchema, type LeadQualification, type ExtractionDelta } from "../../../lib/domain/schemas";
import { createOrUpdateLead, detectMissingFields } from "../../../lib/ai/tools";
import { getLeadById, markHumanReview, markLeadIncomplete } from "../../../lib/leads/lead-service";
import { normalizeExtraction } from "../../../lib/ai/normalize-extraction";
import { buildExistingQualification, mergeLead } from "../../../lib/ai/merge-existing";
import { buildQualificationResponse } from "../../../lib/ai/qualification-response";
import { generateAssistantReply, type ReplyTurn } from "../../../lib/ai/generate-reply";
import { extractTurnFacts } from "../../../lib/ai/extract-turn-facts";
import { detectIntermediateStops } from "../../../lib/ai/detect-intermediate-stops";
import { validateLead } from "../../../lib/ai/validate-lead";
import { getChatModel } from "../../../lib/ai/provider";
import { sanitizeExtractionDelta } from "../../../lib/ai/sanitize-extraction-delta";

export const runtime = "nodejs";
const DEFAULT_QUALIFICATION_TIMEOUT_MS = 30_000;

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const body = await request.json().catch(() => null);
    const messages = normalizeMessages(body);
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
    const latestUserText = getMessageText(latestUserMessage?.content);
    const latestUserIndex = messages.lastIndexOf(latestUserMessage!);
    const lastAssistantText = latestUserIndex > 0
      ? getMessageText(
          [...messages].slice(0, latestUserIndex).reverse().find((m) => m.role === "assistant")?.content
        )
      : "";

    logAgentEvent(
      requestId,
      "request_received",
      {
        messageLength: latestUserText.length,
      },
      startedAt,
    );

    const existingLeadId = extractLeadIdFromBody(body);

    if (!latestUserText.trim()) {
      logAgentEvent(requestId, "request_rejected", { reason: "EMPTY_MESSAGE" }, startedAt);

      return chatJson(
        {
          status: "ERROR",
          message: "Votre message est vide. Ajoutez quelques informations sur votre trajet.",
        },
        { status: 400 },
      );
    }

    if (containsPromptInjectionAttempt(latestUserText)) {
      logAgentEvent(requestId, "request_rejected", { reason: "PROMPT_INJECTION" }, startedAt);

      return chatJson(
        {
          status: "HUMAN_REVIEW",
          message:
            "Les règles tarifaires ne peuvent pas être modifiées depuis la conversation. Un conseiller peut vérifier votre demande.",
          reviewReason: "PROMPT_INJECTION_ATTEMPT",
        },
        { status: 200 },
      );
    }

    const chatModel = getChatModel();

    if (!chatModel) {
      logAgentEvent(requestId, "request_failed", { reason: "MISSING_AI_PROVIDER_KEY" }, startedAt);

      return chatJson(
        {
          status: "ERROR",
          message: "Le service de conversation est momentanément indisponible. Réessayez dans un instant.",
        },
        { status: 503 },
      );
    }

    let existingQualification: LeadQualification = {};
    if (existingLeadId) {
      const existing = await getLeadById(existingLeadId);
      if (existing) {
        existingQualification = buildExistingQualification(existing);
      }
    }

    const qualificationTimeoutMs = getQualificationTimeoutMs();
    logAgentEvent(
      requestId,
      "qualification_started",
      { provider: chatModel.provider, model: chatModel.modelId, timeoutMs: qualificationTimeoutMs },
      startedAt,
    );
    const contextHint = Object.keys(existingQualification).length > 0
      ? `\nÉtat déjà collecté : ${JSON.stringify(existingQualification)}.`
      : "";

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    const conversationHint = lastAssistantText
      ? `\nDernière question posée : "${lastAssistantText}"`
      : "";

    // generateText (not generateObject): the configured free model does not support
    // OpenAI's response_format parameter, so structured-output requests fail outright.
    // We ask for raw JSON and parse it tolerantly (raw / fenced / embedded) instead.
    const textResult = await withTimeout(
      generateText({
        model: chatModel.model,
        system: NEOTRAVEL_SYSTEM_PROMPT,
        prompt: `Extrait les informations de transport NOUVELLEMENT fournies dans ce message utilisateur.
Date du jour : ${todayIso} (utilise-la uniquement pour convertir les dates en YYYY-MM-DD).${contextHint}${conversationHint}

SÉMANTIQUE MÉTIER :
- Une localisation actuelle du prospect ou du groupe est la ville de départ, sauf s'il indique explicitement un autre départ.
- Une destination annoncée est la ville d'arrivée.
- Une correction explicite remplace seulement le champ concerné.
- Interprète les fautes de frappe courantes si l'intention reste claire : "je part de paris" = departure_city Paris, "a montpellier" = arrival_city Montpellier.
- Corrige prudemment les fautes d'orthographe évidentes sur les villes quand l'intention est claire : "pariss" -> "Paris", "montpelier" -> "Montpellier". Si tu n'es pas sûr, garde le texte utilisateur.
- Si le message répond directement à la dernière question avec une valeur courte (ex. "Paris" après une question sur la ville de départ), extrais cette valeur dans le champ demandé.
- Retourne uniquement les champs réellement présents ou corrigés dans ce message ; ne répète pas l'état déjà collecté.

DATES (toujours au format YYYY-MM-DD) :
- Date relative ("dans 3 semaines", "le mois prochain", "vendredi prochain") → calcule la date absolue à partir de la date du jour.
- Date sans année ("le 12 juin") → choisis la prochaine occurrence FUTURE par rapport à la date du jour.
- return_date sans année reprend l'année de departure_date si connue.
- N'invente jamais une date non mentionnée. Ne corrige pas une date "passée" — extrais-la telle quelle, la validation s'en charge.

RÈGLES ABSOLUES :
1. departure_city et arrival_city : noms de villes ÉCRITS TEXTUELLEMENT par l'utilisateur.
   INTERDIT : inférer depuis "le sud", "la côte", "la plage", "la montagne".
2. "je ne sais pas" / "pas encore" / "j'hésite" → ce champ est ABSENT.
3. Message sans information de transport concrète → retourne {}.

Retourne UNIQUEMENT un objet JSON valide (aucun markdown, aucun texte autour), avec seulement les champs présents dans ce message parmi :
{"name":string,"organization":string,"email":string,"departure_city":string,"arrival_city":string,"departure_date":"YYYY-MM-DD","return_date":"YYYY-MM-DD","passenger_count":number,"trip_type":"one_way"|"round_trip"}

Message : ${latestUserText}`,
        temperature: 0.1,
        abortSignal: AbortSignal.timeout(qualificationTimeoutMs),
      }),
      qualificationTimeoutMs,
    );
    // Conversational reply generator — a short, contextual second pass. Text only:
    // it never decides status/price/distance. Falls back to deterministic templates.
    const replyConversation: ReplyTurn[] = messages
      .filter((m): m is ModelMessage & { role: "user" | "assistant" } =>
        m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: getMessageText(m.content) }))
      .filter((turn) => turn.content.trim().length > 0)
      .slice(-6);
    const generateReply = (prompt: string) =>
      withTimeout(
        generateText({
          model: chatModel.model,
          system: NEOTRAVEL_SYSTEM_PROMPT,
          prompt,
          temperature: 0.5,
          abortSignal: AbortSignal.timeout(qualificationTimeoutMs),
        }),
        qualificationTimeoutMs,
      ).then((result) => result.text);

    const parseResult = ExtractionDeltaSchema.safeParse(extractJsonFromText(textResult.text));
    const rawExtractedDelta: ExtractionDelta = parseResult.success ? parseResult.data : {};
    const deterministicFacts = extractTurnFacts(latestUserText, existingQualification, today, lastAssistantText);
    const deterministicStops = detectIntermediateStops(latestUserText);
    const extractedDelta = sanitizeExtractionDelta(
      rawExtractedDelta,
      deterministicFacts,
      existingQualification,
    );
    const combinedDelta = {
      ...extractedDelta,
      ...deterministicFacts,
      ...deterministicStops,
      departure_city: extractedDelta.departure_city ?? deterministicFacts.departure_city,
      arrival_city: extractedDelta.arrival_city ?? deterministicFacts.arrival_city,
    };
    const normalizedDelta = normalizeExtraction(
      combinedDelta,
      existingQualification,
    );
    const mergedLead = LeadQualificationSchema.parse({
      ...mergeLead(existingQualification, normalizedDelta),
      free_message: latestUserText,
    });

    // Deterministic validation — sole authority on validity. Strips unusable
    // values (so they re-appear as missing) and flags >85 pax for HUMAN_REVIEW.
    const { sanitized, warnings, review } = validateLead(mergedLead, today);
    const lead = sanitized;
    const blocking = warnings.some((warning) => warning.blocking);
    const missing = detectMissingFields(lead);
    const lastTurnAddedUsableInfo = hasNewUsableLeadInfo(existingQualification, lead);

    logAgentEvent(requestId, "extraction_debug", {
      raw: rawExtractedDelta,
      sanitizedRaw: extractedDelta,
      deterministicFacts,
      deterministicStops,
      combinedDelta,
      normalized: normalizedDelta,
      lastTurnAddedUsableInfo,
      warnings: warnings.map((w) => w.code),
      review,
      missing: missing.missing_fields,
      existingState: Object.fromEntries(
        Object.entries(existingQualification).filter(([, v]) => v !== undefined),
      ),
    }, startedAt);
    logAgentEvent(
      requestId,
      "qualification_completed",
      {
        status: missing.status,
        missingFieldsCount: missing.missing_fields.length,
        hasEmail: Boolean(lead.email),
        hasPassengerCount: lead.passenger_count !== undefined,
      },
      startedAt,
    );
    const leadResult = await createOrUpdateLead({ leadId: existingLeadId, lead });
    logAgentEvent(
      requestId,
      "lead_upserted",
      {
        leadId: leadResult.leadId,
        status: leadResult.status,
      },
      startedAt,
    );

    const extractedFields: ExtractedFields = {
      departureCity: lead.departure_city ?? null,
      arrivalCity: lead.arrival_city ?? null,
      departureDate: lead.departure_date ?? null,
      returnDate: lead.return_date ?? null,
      passengerCount: lead.passenger_count ?? null,
      tripType: (lead.trip_type ?? null) as "one_way" | "round_trip" | null,
      email: lead.email ?? null,
    };

    if (lead.has_intermediate_stop) {
      const reason = "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE";
      logAgentEvent(
        requestId,
        "request_completed",
        { status: "HUMAN_REVIEW", reason, leadId: leadResult.leadId },
        startedAt,
      );
      return chatJson({
        status: "HUMAN_REVIEW",
        message: formatHumanReviewMessage(reason),
        leadId: leadResult.leadId,
        reviewReason: reason,
        extractedFields,
        warnings,
      });
    }

    // >85 passengers: escalate, never re-ask. Keep the value, flip the lead to
    // HUMAN_REVIEW so the quote endpoint refuses it.
    if (review === "PAX_OVER_85") {
      await markHumanReview(leadResult.leadId, "PAX_OVER_85");
      logAgentEvent(
        requestId,
        "request_completed",
        { status: "HUMAN_REVIEW", reason: "PAX_OVER_85", leadId: leadResult.leadId },
        startedAt,
      );
      return chatJson({
        status: "HUMAN_REVIEW",
        message: formatHumanReviewMessage("PAX_OVER_85"),
        leadId: leadResult.leadId,
        reviewReason: "PAX_OVER_85",
        extractedFields,
        warnings,
      });
    }

    // A blocking warning (past/invalid date, return before departure, 0 pax) must
    // never qualify, even if all 5 critical fields are otherwise present. Force the
    // stored status to INCOMPLETE so calculateQuoteForLead rejects it server-side.
    if (missing.status === "INCOMPLETE" || blocking) {
      if (blocking && leadResult.status === "QUALIFIED") {
        await markLeadIncomplete(leadResult.leadId, missing.missing_fields);
      }

      const conversationalMessage = await generateAssistantReply(
        {
          status: "INCOMPLETE",
          collected: extractedFields as unknown as Record<string, unknown>,
          missingFields: missing.missing_fields,
          warnings,
          conversation: replyConversation,
          lastTurnAddedUsableInfo,
        },
        {
          generate: generateReply,
          fallback: buildQualificationResponse(warnings, missing.missing_fields),
        },
      );

      logAgentEvent(
        requestId,
        "request_completed",
        { status: "INCOMPLETE", blocking, leadId: leadResult.leadId },
        startedAt,
      );

      return chatJson({
        status: "INCOMPLETE",
        message: conversationalMessage,
        leadId: leadResult.leadId,
        missingFields: missing.missing_fields,
        extractedFields,
        warnings,
      });
    }

    // All required fields collected — return QUALIFIED so the front-end enables the quote button.
    // Quote calculation is intentionally left to the dedicated /api/quotes route (triggered by the user).
    const qualifiedSummary = [
      lead.departure_city && lead.arrival_city ? `${lead.departure_city} → ${lead.arrival_city}` : null,
      lead.departure_date ? `le ${lead.departure_date}` : null,
      lead.passenger_count ? `${lead.passenger_count} passagers` : null,
      lead.trip_type === "round_trip" ? "aller-retour" : lead.trip_type === "one_way" ? "aller simple" : null,
    ]
      .filter(Boolean)
      .join(", ");

    const qualifiedFallback = `Parfait, j'ai toutes les informations pour votre trajet (${qualifiedSummary}). Cliquez sur "Recevoir mon devis" pour obtenir votre estimation.`;
    const qualifiedMessage = await generateAssistantReply(
      {
        status: "QUALIFIED",
        collected: extractedFields as unknown as Record<string, unknown>,
        missingFields: [],
        warnings,
        conversation: replyConversation,
        lastTurnAddedUsableInfo,
      },
      { generate: generateReply, fallback: qualifiedFallback },
    );

    logAgentEvent(
      requestId,
      "request_completed",
      { status: "QUALIFIED", leadId: leadResult.leadId },
      startedAt,
    );

    return chatJson({
      status: "QUALIFIED",
      message: qualifiedMessage,
      leadId: leadResult.leadId,
      extractedFields,
    });
  } catch (error) {
    const isDirectApiError = error instanceof APICallError;
    const reason = isAbortError(error)
      ? "QUALIFICATION_TIMEOUT"
      : error instanceof NoObjectGeneratedError
        ? "AI_NO_OBJECT_GENERATED"
        : error instanceof RetryError
          ? "AI_SERVICE_UNAVAILABLE"
          : isDirectApiError
            ? "AI_API_CALL_ERROR"
            : "UNHANDLED_ERROR";

    logAgentEvent(
      requestId,
      "request_failed",
      {
        reason,
        errorName: error instanceof Error ? error.name : "UnknownError",
        ...(isDirectApiError
          ? {
              httpStatus: error.statusCode,
              lastErrorMessage: error.message,
              responseBody: error.responseBody,
            }
          : extractRetryErrorDetails(error)),
      },
      startedAt,
    );

    const statusCode =
      reason === "QUALIFICATION_TIMEOUT"
        ? 504
        : reason === "AI_NO_OBJECT_GENERATED" ||
            reason === "AI_SERVICE_UNAVAILABLE" ||
            reason === "AI_API_CALL_ERROR"
          ? 503
          : 500;

    const message =
      reason === "QUALIFICATION_TIMEOUT"
        ? "Le traitement prend trop de temps. Réessayez dans un instant ou contactez-nous."
        : reason === "AI_NO_OBJECT_GENERATED"
          ? "Nous n’avons pas pu comprendre toutes les informations. Reformulez votre demande en quelques mots."
          : reason === "AI_SERVICE_UNAVAILABLE" || reason === "AI_API_CALL_ERROR"
            ? "Le service de conversation est momentanément indisponible. Réessayez dans un instant."
            : "Votre demande n’a pas pu être traitée. Réessayez dans un instant.";

    return chatJson(
      {
        status: "ERROR",
        message,
        ...(shouldLogAgentEvents() && error instanceof Error
          ? { _debug: `${error.name}: ${error.message}` }
          : {}),
      },
      { status: statusCode },
    );
  }
}

function normalizeMessages(body: unknown): ModelMessage[] {
  if (isMessageBody(body)) {
    return body.messages;
  }

  if (isSingleMessageBody(body)) {
    return [{ role: "user", content: body.message }];
  }

  return [];
}

type MessageBody = {
  messages: ModelMessage[];
};

type SingleMessageBody = {
  message: string;
};

function isMessageBody(body: unknown): body is MessageBody {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { messages?: unknown }).messages)
  );
}

function isSingleMessageBody(body: unknown): body is SingleMessageBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { message?: unknown }).message === "string"
  );
}

function getMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "object" && part !== null && "text" in part) {
          return String((part as { text: unknown }).text);
        }

        return "";
      })
      .join(" ");
  }

  return "";
}


// Tolerant JSON extraction: free models often wrap JSON in prose or markdown fences.
// Returns {} on anything unparseable so the deterministic layers still run.
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
  const brace = trimmed.match(/\{[\s\S]*\}/);
  if (brace) {
    try {
      return JSON.parse(brace[0]);
    } catch {
      // fall through
    }
  }
  return {};
}

function getQualificationTimeoutMs(): number {
  const configured = Number(process.env.AGENT_QUALIFICATION_TIMEOUT_MS);

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_QUALIFICATION_TIMEOUT_MS;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error(`Operation timed out after ${timeoutMs}ms`);
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function logAgentEvent(
  requestId: string,
  event: string,
  metadata: Record<string, unknown> = {},
  startedAt?: number,
): void {
  if (!shouldLogAgentEvents()) {
    return;
  }

  console.info("[neotravel:agent]", {
    requestId,
    event,
    durationMs: startedAt ? Date.now() - startedAt : undefined,
    ...metadata,
  });
}

const HUMAN_REVIEW_MESSAGES: Record<string, string> = {
  PAX_OVER_85:
    "Votre demande dépasse notre capacité standard (85 passagers). Notre équipe vous contactera pour une solution adaptée.",
  DEPARTURE_IN_PAST:
    "La date de départ indiquée est déjà passée. Merci de nous préciser une date à venir.",
  UNKNOWN_ROUTE_NO_DISTANCE:
    "Cet itinéraire n'est pas encore référencé dans notre base. Notre équipe calculera le tarif manuellement et vous recontactera.",
  INVALID_DATE:
    "La date de départ fournie est invalide. Merci de la vérifier.",
  PAX_ZERO_OR_NEGATIVE:
    "Le nombre de passagers indiqué n'est pas valide. Merci de le préciser.",
  INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE:
    "Votre trajet comporte un arrêt intermédiaire. Notre équipe doit vérifier l'itinéraire avant de préparer le devis.",
};

function formatHumanReviewMessage(reason: string): string {
  return (
    HUMAN_REVIEW_MESSAGES[reason] ??
    "Votre demande nécessite une vérification par notre équipe. Nous vous contacterons rapidement."
  );
}

function extractLeadIdFromBody(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null) {
    const id = (body as Record<string, unknown>).leadId;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return undefined;
}

const USABLE_LEAD_FIELDS = [
  "name",
  "organization",
  "email",
  "departure_city",
  "arrival_city",
  "departure_date",
  "return_date",
  "passenger_count",
  "trip_type",
  "has_intermediate_stop",
  "intermediate_stops",
  "options",
] as const;

function hasNewUsableLeadInfo(
  before: LeadQualification,
  after: LeadQualification,
): boolean {
  return USABLE_LEAD_FIELDS.some((field) => {
    const previous = normalizeComparableLeadValue(before[field]);
    const next = normalizeComparableLeadValue(after[field]);

    return next !== "" && next !== previous;
  });
}

function normalizeComparableLeadValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return JSON.stringify(value.filter(Boolean).map(String).sort());
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function extractRetryErrorDetails(error: unknown): Record<string, unknown> {
  if (!(error instanceof RetryError)) return {};
  const last = error.lastError;
  if (last instanceof APICallError) {
    return {
      lastErrorName: last.name,
      lastErrorMessage: last.message,
      httpStatus: last.statusCode,
      responseBody: last.responseBody,
    };
  }
  if (last instanceof Error) {
    return { lastErrorName: last.name, lastErrorMessage: last.message };
  }
  return {};
}

function shouldLogAgentEvents(): boolean {
  return process.env.AGENT_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";
}
