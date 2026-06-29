import { z } from "zod";

import { LeadQualificationSchema } from "../../../lib/domain/schemas";
import { createOrUpdateLead, detectMissingFields } from "../../../lib/ai/tools";
import { markHumanReview, markLeadIncomplete } from "../../../lib/leads/lead-service";
import { validateLead } from "../../../lib/ai/validate-lead";

export const runtime = "nodejs";

const LeadApiInputSchema = z.object({
  rawMessage: z.string().optional(),
  clientType: z.string().trim().min(1).optional().nullable(),
  contactName: z.string().trim().min(1).optional().nullable(),
  organization: z.string().trim().min(1).optional().nullable(),
  email: z.string().email().optional().nullable(),
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
  qualify: z.boolean().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = LeadApiInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Payload invalide." }, { status: 400 });
  }

  try {
    const input = parsed.data;
    const candidate = LeadQualificationSchema.parse({
      client_type: input.clientType ?? undefined,
      contact_name: input.contactName ?? undefined,
      name: input.contactName ?? undefined,
      organization: input.organization ?? undefined,
      email: input.email ?? undefined,
      phone: input.phone ?? undefined,
      departure_city: input.departureCity ?? undefined,
      arrival_city: input.arrivalCity ?? undefined,
      departure_date: input.departureDate ?? undefined,
      return_date: input.returnDate ?? undefined,
      passenger_count: input.passengerCount ?? undefined,
      trip_type: input.tripType ?? undefined,
      has_intermediate_stop: input.hasIntermediateStop,
      intermediate_stops: input.intermediateStops,
      options: input.options ? Object.fromEntries(input.options.map((option) => [option, true])) : undefined,
      free_message: input.rawMessage,
    });
    const { sanitized, warnings, review } = validateLead(candidate);
    const lead = LeadQualificationSchema.parse(sanitized);
    const missing = detectMissingFields(lead);
    const result = await createOrUpdateLead({ lead });

    if (review === "PAX_OVER_85") {
      await markHumanReview(result.leadId, review);
      return Response.json({
        leadId: result.leadId,
        qualification: { status: "HUMAN_REVIEW", humanReviewReason: review },
      }, { status: 201 });
    }

    if (warnings.some((warning) => warning.blocking)) {
      await markLeadIncomplete(result.leadId, missing.missing_fields);
    }

    return Response.json({
      leadId: result.leadId,
      qualification: {
        status: result.status,
        missingFields: missing.missing_fields,
        humanReviewReason: null,
      },
    }, { status: 201 });
  } catch {
    return Response.json({ error: "Impossible de créer la demande." }, { status: 500 });
  }
}
