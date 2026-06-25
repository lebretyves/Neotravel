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
  status: z.enum(["QUALIFIED", "INCOMPLETE"]),
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
  status: Extract<LeadStatus, "QUALIFIED" | "INCOMPLETE">;
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
  const supabase = createServerSupabaseClient();
  const leadPayload = {
    departure_city: lead.departure_city ?? "À compléter",
    arrival_city: lead.arrival_city ?? "À compléter",
    departure_date: lead.departure_date ?? "2099-01-01",
    return_date: lead.return_date ?? null,
    passenger_count: lead.passenger_count ?? 1,
    trip_type: lead.trip_type ?? "one_way",
    options: lead.options ?? {},
    free_message: lead.free_message ?? null,
    status: missing.status,
    missing_fields: missing.missing_fields,
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
    } else {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: lead.name ?? null,
          organization: lead.organization ?? null,
          email: lead.email,
        })
        .select("id")
        .single();

      if (clientError) {
        throw new Error(`Unable to create client: ${clientError.message}`);
      }

      clientId = client.id as string;
    }
  }

  if (input.leadId) {
    const { error } = await supabase
      .from("leads")
      .update({ ...leadPayload, ...(lead.email ? { client_id: clientId } : {}) })
      .eq("id", input.leadId);

    if (error) {
      throw new Error(`Unable to update lead ${input.leadId}: ${error.message}`);
    }

    return {
      leadId: input.leadId,
      status: missing.status,
      missing_fields: missing.missing_fields,
    };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({ ...leadPayload, client_id: clientId })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to create lead: ${error.message}`);
  }

  return {
    leadId: data.id as string,
    status: missing.status,
    missing_fields: missing.missing_fields,
  };
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
