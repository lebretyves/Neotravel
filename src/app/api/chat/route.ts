import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, type ModelMessage } from "ai";

import { containsPromptInjectionAttempt, NEOTRAVEL_SYSTEM_PROMPT } from "../../../lib/ai/prompt";
import { chatJson } from "../../../lib/ai/chat-response";
import { LeadQualificationSchema } from "../../../lib/domain/schemas";
import { calculateQuoteForLead } from "../../../lib/quotes/quote-service";
import { createOrUpdateLead, detectMissingFields } from "../../../lib/ai/tools";

export const runtime = "nodejs";
const DEFAULT_QUALIFICATION_TIMEOUT_MS = 15_000;

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const body = await request.json().catch(() => null);
    const messages = normalizeMessages(body);
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
    const latestUserText = getMessageText(latestUserMessage?.content);

    logAgentEvent(
      requestId,
      "request_received",
      {
        messageLength: latestUserText.length,
      },
      startedAt,
    );

    if (!latestUserText.trim()) {
      logAgentEvent(requestId, "request_rejected", { reason: "EMPTY_MESSAGE" }, startedAt);

      return chatJson(
        {
          status: "ERROR",
          message: "Message utilisateur manquant.",
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
            "Je ne peux pas contourner les règles tarifaires. Le prix doit être calculé uniquement par calculer_devis().",
          reviewReason: "PROMPT_INJECTION_ATTEMPT",
        },
        { status: 200 },
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!geminiApiKey) {
      logAgentEvent(requestId, "request_failed", { reason: "MISSING_GEMINI_API_KEY" }, startedAt);

      return chatJson(
        {
          status: "ERROR",
          message:
            "GEMINI_API_KEY est manquant. Configurez la clé pour activer l'agent IA.",
        },
        { status: 503 },
      );
    }

    const modelId = normalizeGeminiModelId(process.env.AI_MODEL_ID ?? "gemini-3-flash-preview");
    const google = createGoogleGenerativeAI({
      apiKey: geminiApiKey,
    });
    const qualificationTimeoutMs = getQualificationTimeoutMs();
    logAgentEvent(
      requestId,
      "qualification_started",
      { model: modelId, timeoutMs: qualificationTimeoutMs },
      startedAt,
    );
    const qualification = await withTimeout(
      generateObject({
        model: google(modelId),
        system: NEOTRAVEL_SYSTEM_PROMPT,
        schema: LeadQualificationSchema,
        prompt: `Extrait uniquement les informations de demande transport présentes dans ce message. N'invente aucun prix, aucune distance et aucun champ absent.\n\nMessage:\n${latestUserText}`,
        temperature: 0.1,
        abortSignal: AbortSignal.timeout(qualificationTimeoutMs),
      }),
      qualificationTimeoutMs,
    );
    const lead = LeadQualificationSchema.parse({
      ...qualification.object,
      free_message: qualification.object.free_message ?? latestUserText,
    });
    const missing = detectMissingFields(lead);
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
    const leadResult = await createOrUpdateLead({ lead });
    logAgentEvent(
      requestId,
      "lead_upserted",
      {
        leadId: leadResult.leadId,
        status: leadResult.status,
      },
      startedAt,
    );

    if (missing.status === "INCOMPLETE") {
      logAgentEvent(
        requestId,
        "request_completed",
        { status: "INCOMPLETE", leadId: leadResult.leadId },
        startedAt,
      );

      return chatJson({
        status: "INCOMPLETE",
        message: "Il manque des informations pour établir un devis.",
        leadId: leadResult.leadId,
        missingFields: missing.missing_fields,
      });
    }

    logAgentEvent(
      requestId,
      "quote_calculation_started",
      { leadId: leadResult.leadId },
      startedAt,
    );
    const quoteResult = await calculateQuoteForLead(leadResult.leadId);

    if (!quoteResult.ok) {
      logAgentEvent(
        requestId,
        "request_completed",
        {
          status: quoteResult.status,
          leadId: leadResult.leadId,
          reason: quoteResult.reason,
        },
        startedAt,
      );

      return chatJson({
        status: quoteResult.status,
        message: "Aucun devis automatique n'a été créé. La demande doit être vérifiée.",
        leadId: leadResult.leadId,
        reviewReason: quoteResult.reason,
      });
    }

    logAgentEvent(
      requestId,
      "request_completed",
      {
        status: "QUOTE_READY",
        leadId: leadResult.leadId,
        quoteId: quoteResult.quoteId,
      },
      startedAt,
    );

    return chatJson({
      status: "QUOTE_READY",
      message: "La demande est complète. Un devis a été calculé.",
      leadId: leadResult.leadId,
      quoteId: quoteResult.quoteId,
    });
  } catch (error) {
    const reason = isAbortError(error) ? "QUALIFICATION_TIMEOUT" : "UNHANDLED_ERROR";

    logAgentEvent(
      requestId,
      "request_failed",
      {
        reason,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
      startedAt,
    );

    return chatJson(
      {
        status: "ERROR",
        message:
          reason === "QUALIFICATION_TIMEOUT"
            ? "La qualification IA a expiré. Réessayez ou passez en reprise humaine."
            : "La demande n'a pas pu être traitée.",
        reviewReason: reason,
      },
      { status: reason === "QUALIFICATION_TIMEOUT" ? 504 : 500 },
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

function normalizeGeminiModelId(modelId: string): string {
  return modelId.replace(/^models\//, "");
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

function shouldLogAgentEvents(): boolean {
  return process.env.AGENT_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";
}
