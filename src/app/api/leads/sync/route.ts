import { z } from "zod";

import { chatJson } from "../../../../lib/ai/chat-response";
import { LeadQualificationSchema } from "../../../../lib/domain/schemas";
import { createOrUpdateLead, detectMissingFields } from "../../../../lib/ai/tools";
import { buildExistingQualification, mergeLead } from "../../../../lib/ai/merge-existing";
import { validateLead } from "../../../../lib/ai/validate-lead";
import { getLeadById, markHumanReview, markLeadIncomplete } from "../../../../lib/leads/lead-service";

export const runtime = "nodejs";

const SyncInputSchema = z.object({
  leadId: z.string().uuid().optional(),
  email: z.string().trim().email().optional().nullable(),
  departureCity: z.string().trim().min(1).optional().nullable(),
  arrivalCity: z.string().trim().min(1).optional().nullable(),
  departureDate: z.string().trim().min(1).optional().nullable(),
  returnDate: z.string().trim().min(1).optional().nullable(),
  passengerCount: z.number().int().optional().nullable(),
  tripType: z.enum(["one_way", "round_trip"]).optional().nullable(),
  options: z.array(z.string()).optional(),
});

/**
 * Persists manual side-panel edits to the lead before a quote is requested.
 * Merges over the existing row without overwriting known values, runs the same
 * deterministic validation as the chat route, and enforces status server-side
 * so calculateQuoteForLead (which requires QUALIFIED) cannot quote bad data.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = SyncInputSchema.parse(await request.json());

    let existing = {};
    if (body.leadId) {
      const record = await getLeadById(body.leadId);
      if (record) existing = buildExistingQualification(record);
    }

    const incoming = {
      email: body.email ?? undefined,
      departure_city: body.departureCity ?? undefined,
      arrival_city: body.arrivalCity ?? undefined,
      departure_date: body.departureDate ?? undefined,
      return_date: body.returnDate ?? undefined,
      passenger_count: body.passengerCount ?? undefined,
      trip_type: body.tripType ?? undefined,
      options: body.options
        ? Object.fromEntries(body.options.map((option) => [option, true]))
        : undefined,
    };

    const merged = mergeLead(existing, incoming);
    const { sanitized, warnings, review } = validateLead(merged);
    const lead = LeadQualificationSchema.parse(sanitized);
    const missing = detectMissingFields(lead);

    const result = await createOrUpdateLead({ leadId: body.leadId, lead });
    const blocking = warnings.some((warning) => warning.blocking);

    if (result.status === "HUMAN_REVIEW") {
      return chatJson({
        status: "HUMAN_REVIEW",
        message:
          "Votre trajet comporte un arrêt intermédiaire. Notre équipe doit vérifier l'itinéraire avant de préparer le devis.",
        leadId: result.leadId,
        reviewReason: "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE",
        warnings,
      });
    }

    if (review === "PAX_OVER_85") {
      await markHumanReview(result.leadId, "PAX_OVER_85");
      return chatJson({
        status: "HUMAN_REVIEW",
        message:
          "Votre demande dépasse notre capacité standard (85 passagers). Notre équipe vous contactera pour une solution adaptée.",
        leadId: result.leadId,
        reviewReason: "PAX_OVER_85",
        warnings,
      });
    }

    if (blocking && result.status === "QUALIFIED") {
      await markLeadIncomplete(result.leadId, missing.missing_fields);
      return chatJson({
        status: "INCOMPLETE",
        message: warnings[0]?.message ?? "Certaines informations doivent être corrigées.",
        leadId: result.leadId,
        missingFields: missing.missing_fields,
        warnings,
      });
    }

    return chatJson({
      status: result.status,
      message:
        result.status === "QUALIFIED"
          ? "Informations à jour."
          : `Informations incomplètes : ${missing.missing_fields.join(", ")}.`,
      leadId: result.leadId,
      missingFields: missing.missing_fields,
      warnings,
    });
  } catch (error) {
    return chatJson(
      {
        status: "ERROR",
        message: "Nous n’avons pas pu mettre à jour votre demande. Réessayez dans un instant.",
      },
      { status: 400 },
    );
  }
}
