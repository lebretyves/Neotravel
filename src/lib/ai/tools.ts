import { tool } from "ai";
import { z } from "zod";

import type { LeadStatus } from "../domain/status";
import {
  CRITICAL_LEAD_FIELDS,
  LeadQualificationSchema,
  MissingFieldsSchema,
  type LeadQualification,
  type MissingFieldsResult,
} from "../domain/schemas";
import { calculateQuoteForLead } from "../quotes/quote-service";
import { markHumanReview } from "../leads/lead-service";
import { logAuditEvent } from "../audit/audit-service";
import { createServerSupabaseClient } from "../supabase/server";
import { containsPromptInjectionAttempt } from "./prompt";

export const QualifyLeadInputSchema = z.object({
  message: z.string().min(1),
  extracted: LeadQualificationSchema.optional(),
});

export const DetectMissingFieldsInputSchema = z.object({
  lead: LeadQualificationSchema,
});

export const CreateOrUpdateLeadInputSchema = z.object({
  leadId: z.string().uuid().optional(),
  lead: LeadQualificationSchema,
});

export const CalculateQuoteForLeadInputSchema = z.object({
  leadId: z.string().uuid(),
});

export const HandoffHumanInputSchema = z.object({
  leadId: z.string().uuid(),
  reason: z.string().min(1),
});

export const CreateOrUpdateLeadOutputSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["QUALIFIED", "INCOMPLETE", "HUMAN_REVIEW"]),
  missing_fields: z.array(z.string()),
});

export const CalculateQuoteForLeadOutputSchema = z.union([
  z.object({
    ok: z.literal(true),
    quoteId: z.string(),
    status: z.literal("QUOTE_READY"),
  }),
  z.object({
    ok: z.literal(false),
    status: z.enum(["INCOMPLETE", "HUMAN_REVIEW"]),
    reason: z.string(),
  }),
]);

export const HandoffHumanOutputSchema = z.object({
  status: z.literal("HUMAN_REVIEW"),
  reason: z.string(),
});

export type CreateOrUpdateLeadResult = {
  leadId: string;
  status: Extract<LeadStatus, "QUALIFIED" | "INCOMPLETE" | "HUMAN_REVIEW">;
  missing_fields: string[];
};

export function detectMissingFields(lead: LeadQualification): MissingFieldsResult {
  const missing_fields = CRITICAL_LEAD_FIELDS.filter((field) => {
    const value = lead[field];

    if (typeof value === "string") {
      return value.trim().length === 0;
    }

    return value === undefined || value === null;
  });

  return MissingFieldsSchema.parse({
    missing_fields,
    status: missing_fields.length > 0 ? "INCOMPLETE" : "QUALIFIED",
  });
}

export async function createOrUpdateLead(
  input: z.infer<typeof CreateOrUpdateLeadInputSchema>,
): Promise<CreateOrUpdateLeadResult> {
  const lead = LeadQualificationSchema.parse(input.lead);
  const missing = detectMissingFields(lead);
  const requiresHumanReview =
    lead.has_intermediate_stop === true || (lead.intermediate_stops?.length ?? 0) > 0;
  const status: CreateOrUpdateLeadResult["status"] = requiresHumanReview
    ? "HUMAN_REVIEW"
    : missing.status;
  const supabase = createServerSupabaseClient();
  const leadPayload = {
    client_type: lead.client_type ?? null,
    departure_city: lead.departure_city ?? null,
    arrival_city: lead.arrival_city ?? null,
    departure_date: lead.departure_date ?? null,
    return_date: lead.return_date ?? null,
    passenger_count: lead.passenger_count ?? null,
    trip_type: lead.trip_type ?? null,
    has_intermediate_stop: requiresHumanReview,
    intermediate_stops: lead.intermediate_stops ?? [],
    options: lead.options ?? {},
    free_message: lead.free_message ?? null,
    status,
    missing_fields: missing.missing_fields,
    ...(requiresHumanReview
      ? { human_review_reason: "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE" }
      : {}),
  };

  let clientId: string | null = null;

  if (lead.email) {
    const { data: existingClient, error: lookupError } = await supabase
      .from("clients")
      .select("id")
      .eq("email", lead.email)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Unable to lookup client: ${lookupError.message}`);
    }

    if (existingClient?.id) {
      clientId = existingClient.id as string;
      const clientUpdate = compactRecord({
        name: lead.name ?? lead.contact_name,
        contact_name: lead.contact_name ?? lead.name,
        organization: lead.organization,
        phone: lead.phone,
      });
      if (Object.keys(clientUpdate).length > 0) {
        const { error: updateClientError } = await supabase
          .from("clients")
          .update(clientUpdate)
          .eq("id", clientId);

        if (updateClientError && isMissingColumnError(updateClientError)) {
          const { error: legacyUpdateError } = await supabase
            .from("clients")
            .update(
              compactRecord({
                name: lead.name ?? lead.contact_name,
                organization: lead.organization,
              }),
            )
            .eq("id", clientId);

          if (legacyUpdateError) {
            throw new Error(`Unable to update client: ${legacyUpdateError.message}`);
          }
        } else if (updateClientError) {
          throw new Error(`Unable to update client: ${updateClientError.message}`);
        }
      }
    } else {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: lead.name ?? lead.contact_name ?? null,
          contact_name: lead.contact_name ?? lead.name ?? null,
          organization: lead.organization ?? null,
          email: lead.email,
          phone: lead.phone ?? null,
        })
        .select("id")
        .single();

      if (clientError && isMissingColumnError(clientError)) {
        const { data: legacyClient, error: legacyClientError } = await supabase
          .from("clients")
          .insert({
            name: lead.name ?? lead.contact_name ?? null,
            organization: lead.organization ?? null,
            email: lead.email,
          })
          .select("id")
          .single();

        if (legacyClientError) {
          throw new Error(`Unable to create client: ${legacyClientError.message}`);
        }

        clientId = legacyClient.id as string;
      } else if (clientError) {
        throw new Error(`Unable to create client: ${clientError.message}`);
      } else {
        clientId = client.id as string;
      }
    }
  }

  if (input.leadId) {
    const updatePayload = { ...leadPayload, ...(lead.email ? { client_id: clientId } : {}) };
    const { error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", input.leadId);

    if (error && isMissingColumnError(error)) {
      const { error: legacyError } = await supabase
        .from("leads")
        .update(toLegacyLeadPayload(updatePayload))
        .eq("id", input.leadId);

      if (legacyError) {
        throw new Error(`Unable to update lead ${input.leadId}: ${legacyError.message}`);
      }
    } else if (error) {
      throw new Error(`Unable to update lead ${input.leadId}: ${error.message}`);
    }

    await logAuditEvent({
      entityType: "lead",
      entityId: input.leadId,
      action: "LEAD_UPDATED",
      metadata: { status, missingFields: missing.missing_fields },
    });

    if (requiresHumanReview) {
      await logAuditEvent({
        entityType: "lead",
        entityId: input.leadId,
        action: "LEAD_MARKED_HUMAN_REVIEW",
        metadata: { reason: "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE" },
      });
    }

    return {
      leadId: input.leadId,
      status,
      missing_fields: missing.missing_fields,
    };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({ ...leadPayload, client_id: clientId })
    .select("id")
    .single();

  if (error && isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("leads")
      .insert(toLegacyLeadPayload({ ...leadPayload, client_id: clientId }))
      .select("id")
      .single();

    if (legacyError) {
      throw new Error(`Unable to create lead: ${legacyError.message}`);
    }

    await logAuditEvent({
      entityType: "lead",
      entityId: legacyData.id as string,
      action: "LEAD_CREATED",
      metadata: { status, missingFields: missing.missing_fields },
    });

    if (requiresHumanReview) {
      await logAuditEvent({
        entityType: "lead",
        entityId: legacyData.id as string,
        action: "LEAD_MARKED_HUMAN_REVIEW",
        metadata: { reason: "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE" },
      });
    }

    return {
      leadId: legacyData.id as string,
      status,
      missing_fields: missing.missing_fields,
    };
  }

  if (error) {
    throw new Error(`Unable to create lead: ${error.message}`);
  }

  await logAuditEvent({
    entityType: "lead",
    entityId: data.id as string,
    action: "LEAD_CREATED",
    metadata: { status, missingFields: missing.missing_fields },
  });

  if (requiresHumanReview) {
    await logAuditEvent({
      entityType: "lead",
      entityId: data.id as string,
      action: "LEAD_MARKED_HUMAN_REVIEW",
      metadata: { reason: "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE" },
    });
  }

  return {
    leadId: data.id as string,
    status,
    missing_fields: missing.missing_fields,
  };
}

function compactRecord(record: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
  ) as Record<string, string>;
}

function toLegacyLeadPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const legacyKeys = new Set([
    "client_id",
    "departure_city",
    "arrival_city",
    "departure_date",
    "return_date",
    "passenger_count",
    "trip_type",
    "has_intermediate_stop",
    "intermediate_stops",
    "options",
    "free_message",
    "status",
    "missing_fields",
    "human_review_reason",
  ]);

  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => legacyKeys.has(key) && value !== undefined),
  );
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

export function createNeoTravelTools() {
  return {
    qualify_lead: tool({
      description:
        "Structure les informations extraites de la conversation. Ne calcule jamais le prix ni la distance.",
      inputSchema: QualifyLeadInputSchema,
      execute: async ({ message, extracted }) => {
        if (containsPromptInjectionAttempt(message)) {
          return LeadQualificationSchema.parse({
            free_message: message,
          });
        }

        return LeadQualificationSchema.parse({
          ...extracted,
          free_message: extracted?.free_message ?? message,
        });
      },
    }),
    detect_missing_fields: tool({
      description: "Détermine de façon déterministe si les champs critiques avant devis sont présents.",
      inputSchema: DetectMissingFieldsInputSchema,
      execute: async ({ lead }) => detectMissingFields(lead),
    }),
    create_or_update_lead: tool({
      description:
        "Crée ou met à jour un lead Supabase. Si des champs critiques manquent, le statut devient INCOMPLETE.",
      inputSchema: CreateOrUpdateLeadInputSchema,
      execute: async (input) =>
        CreateOrUpdateLeadOutputSchema.parse(await createOrUpdateLead(input)),
    }),
    calculate_quote_for_lead: tool({
      description:
        "Appelle calculateQuoteForLead(leadId). Ce tool ne calcule pas le prix lui-même.",
      inputSchema: CalculateQuoteForLeadInputSchema,
      execute: async ({ leadId }) =>
        CalculateQuoteForLeadOutputSchema.parse(await calculateQuoteForLead(leadId)),
    }),
    handoff_human: tool({
      description: "Passe un lead en HUMAN_REVIEW pour cas complexe, suspect ou hors périmètre.",
      inputSchema: HandoffHumanInputSchema,
      execute: async ({ leadId, reason }) => {
        await markHumanReview(leadId, reason);

        return HandoffHumanOutputSchema.parse({ status: "HUMAN_REVIEW", reason });
      },
    }),
  };
}
