import type { QuoteInput, QuoteOptions, QuoteOutput, TripType } from "../domain/types";
import type { QuoteSummary } from "../ai/chat-response";
import { logAuditEvent } from "../audit/audit-service";
import {
  getLeadById,
  markHumanReview,
  markLeadIncomplete,
  updateLeadStatus,
  type LeadRecord,
} from "../leads/lead-service";
import { calculer_devis } from "../pricing/calculer-devis";
import { lookupActivePricingRules } from "../pricing/lookup-pricing-rules";
import { resolveDistance } from "../pricing/resolve-distance";
import { createServerSupabaseClient } from "../supabase/server";

export type CalculateQuoteForLeadResult =
  | { ok: true; quoteId: string; status: "QUOTE_READY"; quote: QuoteSummary }
  | { ok: false; status: "INCOMPLETE" | "HUMAN_REVIEW"; reason: string };

export type SaveQuoteInput = {
  leadId: string;
  quote: QuoteOutput;
};

type QuoteServiceDependencies = {
  getLeadById: typeof getLeadById;
  markLeadIncomplete: typeof markLeadIncomplete;
  markHumanReview: typeof markHumanReview;
  updateLeadStatus: typeof updateLeadStatus;
  resolveDistance: typeof resolveDistance;
  lookupActivePricingRules: typeof lookupActivePricingRules;
  saveQuote: typeof saveQuote;
  logAuditEvent: typeof logAuditEvent;
  getRequestDate: () => string;
};

const defaultDependencies: QuoteServiceDependencies = {
  getLeadById,
  markLeadIncomplete,
  markHumanReview,
  updateLeadStatus,
  resolveDistance,
  lookupActivePricingRules,
  saveQuote,
  logAuditEvent,
  getRequestDate: () => new Date().toISOString().slice(0, 10),
};

export async function calculateQuoteForLead(
  leadId: string,
  dependencies: Partial<QuoteServiceDependencies> = {},
): Promise<CalculateQuoteForLeadResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  const lead = await deps.getLeadById(leadId);

  if (!lead) {
    throw new Error(`Lead ${leadId} not found.`);
  }

  if (lead.has_intermediate_stop || lead.intermediate_stops.length > 0) {
    const reason = "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE";
    await deps.markHumanReview(leadId, reason);

    return {
      ok: false,
      status: "HUMAN_REVIEW",
      reason,
    };
  }

  const missingFields = getMissingCriticalFields(lead);

  if (missingFields.length > 0) {
    await deps.markLeadIncomplete(leadId, missingFields);

    return {
      ok: false,
      status: "INCOMPLETE",
      reason: `Missing critical fields: ${missingFields.join(", ")}`,
    };
  }

  const distance = await deps.resolveDistance({
    departureCity: lead.departure_city!,
    arrivalCity: lead.arrival_city!,
  });

  if (!distance.ok) {
    await deps.markHumanReview(leadId, distance.review);

    return {
      ok: false,
      status: "HUMAN_REVIEW",
      reason: distance.review,
    };
  }

  const rules = await deps.lookupActivePricingRules();
  const quoteInput: QuoteInput = {
    leadId,
    departureCity: lead.departure_city!,
    arrivalCity: lead.arrival_city!,
    departureDate: lead.departure_date!,
    requestDate: deps.getRequestDate(),
    tripType: lead.trip_type!,
    passengerCount: lead.passenger_count!,
    distanceKm: distance.distanceKm,
    distanceSource: distance.source,
    options: normalizeQuoteOptions(lead.options),
  };
  const result = calculer_devis(quoteInput, rules);

  if (!result.ok) {
    await deps.markHumanReview(leadId, result.review);

    return {
      ok: false,
      status: "HUMAN_REVIEW",
      reason: result.review,
    };
  }

  const quoteId = await deps.saveQuote({ leadId, quote: result.quote });

  await deps.updateLeadStatus(leadId, "QUOTE_READY", {
    quoteId,
    quoteNumber: result.quote.quote_number,
  });
  await deps.logAuditEvent({
    entityType: "quote",
    entityId: quoteId,
    action: "QUOTE_CREATED",
    metadata: {
      leadId,
      quoteNumber: result.quote.quote_number,
      deterministicHash: result.quote.deterministic_hash,
    },
  });

  // Schedule followup emails (J+3, J+7) — dynamic import keeps server-only deps out of
  // the test module graph; fire-and-forget so quote delivery is never blocked.
  void import("../../features/followups/services/scheduleFollowups").then(
    ({ scheduleFollowups }) => scheduleFollowups({ leadId, quoteId })
  ).catch(() => {});

  return {
    ok: true,
    quoteId,
    status: "QUOTE_READY",
    quote: {
      quoteNumber: result.quote.quote_number,
      vehicleCode: result.quote.vehicle_code,
      distanceKm: result.quote.breakdown.distance.distanceKm,
      priceHt: result.quote.price_ht,
      vatAmount: result.quote.vat_amount,
      priceTtc: result.quote.price_ttc,
      departureCity: quoteInput.departureCity,
      arrivalCity: quoteInput.arrivalCity,
      departureDate: quoteInput.departureDate,
      passengerCount: quoteInput.passengerCount,
    },
  };
}

export async function saveQuote(input: SaveQuoteInput): Promise<string> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      lead_id: input.leadId,
      quote_number: input.quote.quote_number,
      distance_km: input.quote.breakdown.distance.distanceKm,
      distance_source: input.quote.breakdown.distance.source ?? "manual",
      price_ht: input.quote.price_ht,
      vat_rate: input.quote.vat_rate,
      tva_10pct: input.quote.vat_amount,
      price_ttc: input.quote.price_ttc,
      breakdown: { ...input.quote.breakdown, vehicle_code: input.quote.vehicle_code },
      deterministic_hash: input.quote.deterministic_hash,
      matrices_version: input.quote.matrices_version,
      status: "QUOTE_READY",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: dup } = await supabase
        .from("quotes")
        .select("id")
        .eq("deterministic_hash", input.quote.deterministic_hash)
        .single();
      if (dup?.id) return dup.id as string;
    }
    throw new Error(`Unable to save quote for lead ${input.leadId}: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error(`Unable to save quote for lead ${input.leadId}: missing quote id.`);
  }

  return data.id as string;
}

function getMissingCriticalFields(lead: LeadRecord): string[] {
  const missingFields: string[] = [];

  if (!hasText(lead.departure_city)) {
    missingFields.push("departure_city");
  }

  if (!hasText(lead.arrival_city)) {
    missingFields.push("arrival_city");
  }

  if (!hasText(lead.departure_date)) {
    missingFields.push("departure_date");
  }

  if (!Number.isFinite(lead.passenger_count)) {
    missingFields.push("passenger_count");
  }

  if (!isTripType(lead.trip_type)) {
    missingFields.push("trip_type");
  }

  return missingFields;
}

function hasText(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isTripType(value: string | null): value is TripType {
  return value === "one_way" || value === "round_trip";
}

function normalizeQuoteOptions(options: QuoteOptions | Record<string, unknown> | null): QuoteOptions | undefined {
  if (!options) {
    return undefined;
  }
  const optionRecord = options as Record<string, unknown>;

  return {
    guideDays: toOptionalNumber(optionRecord.guideDays ?? optionRecord.guide_days),
    driverNights: toOptionalNumber(optionRecord.driverNights ?? optionRecord.driver_nights),
    tollsIncluded: toOptionalBoolean(optionRecord.tollsIncluded ?? optionRecord.tolls_included),
    tollPackageEur: toOptionalNumber(optionRecord.tollPackageEur ?? optionRecord.toll_package_eur),
  };
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
