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
  clientType: z.string().trim().min(1).optional().nullable(),
  contactName: z.string().trim().min(1).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().min(1).optional().nullable(),
  departureCity: z.string().trim().min(1).optional().nullable(),
  arrivalCity: z.string().trim().min(1).optional().nullable(),
  departureDate: z.string().trim().min(1).optional().nullable(),
  returnDate: z.string().trim().min(1).optional().nullable(),
  passengerCount: z.number().int().optional().nullable(),
  tripType: z.enum(["one_way", "round_trip"]).optional().nullable(),
  hasIntermediateStop: z.boolean().optional(),
  intermediateStops: z.array(z.string().trim().min(1)).optional(),
  options: z.array(z.string()).optional(),
  // Manually confirmed option quantities (guide days / driver overnights). The engine
  // prices them at the controlled Tableau 3 rates; absent/0 keeps the line "à confirmer".
  guideDays: z.number().int().min(0).optional().nullable(),
  driverNights: z.number().int().min(0).optional().nullable(),
});

type SyncInput = z.infer<typeof SyncInputSchema>;

/**
 * Builds the lead.options jsonb from the selected option codes plus any manually confirmed
 * quantities. Quantities are only kept when their option is actually selected, so a stale
 * count can never silently price an unselected option.
 */
function buildOptionsRecord(body: SyncInput): Record<string, unknown> | undefined {
  const codes = body.options ?? [];
  if (codes.length === 0 && body.guideDays == null && body.driverNights == null) {
    return undefined;
  }

  const record: Record<string, unknown> = Object.fromEntries(codes.map((code) => [code, true]));

  if (codes.includes("guide") && body.guideDays && body.guideDays > 0) {
    record.guideDays = body.guideDays;
  }
  if (codes.includes("driver_overnight") && body.driverNights && body.driverNights > 0) {
    record.driverNights = body.driverNights;
  }

  return record;
}

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
      client_type: body.clientType ?? undefined,
      contact_name: body.contactName ?? undefined,
      name: body.contactName ?? undefined,
      email: body.email ?? undefined,
      phone: body.phone ?? undefined,
      departure_city: body.departureCity ?? undefined,
      arrival_city: body.arrivalCity ?? undefined,
      departure_date: body.departureDate ?? undefined,
      return_date: body.returnDate ?? undefined,
      passenger_count: body.passengerCount ?? undefined,
      trip_type: body.tripType ?? undefined,
      has_intermediate_stop: body.hasIntermediateStop,
      intermediate_stops: body.intermediateStops,
      options: buildOptionsRecord(body),
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
