import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LeadRecord } from "../leads/lead-service";
import type { ResolveDistanceResult } from "../pricing/resolve-distance";
import type { QuoteOutput } from "../domain/types";
import { DEFAULT_PRICING_RULES } from "../pricing/pricing-rules";
import { calculateQuoteForLead } from "./quote-service";

const leadId = "00000000-0000-4000-8000-000000000101";
const quoteId = "00000000-0000-4000-8000-000000000201";

function baseLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: leadId,
    client_id: "00000000-0000-4000-8000-000000000001",
    departure_city: "Paris",
    arrival_city: "Lyon",
    departure_date: "2026-09-15",
    return_date: null,
    passenger_count: 42,
    trip_type: "one_way",
    has_intermediate_stop: false,
    intermediate_stops: [],
    options: {},
    free_message: null,
    status: "QUALIFIED",
    missing_fields: [],
    human_review_reason: null,
    ...overrides,
  };
}

function buildDependencies(lead: LeadRecord) {
  const resolveDistance = vi.fn(
    async (): Promise<ResolveDistanceResult> => ({
      ok: true,
      distanceKm: 465,
      source: "seed",
    }),
  );

  return {
    getLeadById: vi.fn(async () => lead),
    markLeadIncomplete: vi.fn(async () => undefined),
    markHumanReview: vi.fn(async () => undefined),
    updateLeadStatus: vi.fn(async () => undefined),
    resolveDistance,
    lookupActivePricingRules: vi.fn(async () => DEFAULT_PRICING_RULES),
    saveQuote: vi.fn(async (_input: { leadId: string; quote: QuoteOutput }) => quoteId),
    logAuditEvent: vi.fn(async () => undefined),
    getRequestDate: vi.fn(() => "2026-06-01"),
  };
}

describe("calculateQuoteForLead", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("crée une quote et passe le lead en QUOTE_READY pour Paris → Lyon", async () => {
    const dependencies = buildDependencies(baseLead());

    const result = await calculateQuoteForLead(leadId, dependencies);

    expect(result).toMatchObject({ ok: true, quoteId, status: "QUOTE_READY" });
    expect((result as { quote: unknown }).quote).toMatchObject({
      priceHt: expect.any(Number),
      priceTtc: expect.any(Number),
      distanceKm: expect.any(Number),
    });
    expect(dependencies.resolveDistance).toHaveBeenCalledWith({
      departureCity: "Paris",
      arrivalCity: "Lyon",
    });
    expect(dependencies.saveQuote).toHaveBeenCalledOnce();
    expect(dependencies.updateLeadStatus).toHaveBeenCalledWith(leadId, "QUOTE_READY", {
      quoteId,
      quoteNumber: expect.stringMatching(/^NT-[A-F0-9]{10}$/),
    });
    expect(dependencies.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "quote", entityId: quoteId, action: "QUOTE_CREATED" }),
    );
  });

  it("marque le lead INCOMPLETE si un champ critique manque", async () => {
    const dependencies = buildDependencies(baseLead({ arrival_city: null }));

    const result = await calculateQuoteForLead(leadId, dependencies);

    expect(result).toEqual({
      ok: false,
      status: "INCOMPLETE",
      reason: "Missing critical fields: arrival_city",
    });
    expect(dependencies.markLeadIncomplete).toHaveBeenCalledWith(leadId, ["arrival_city"]);
    expect(dependencies.resolveDistance).not.toHaveBeenCalled();
    expect(dependencies.saveQuote).not.toHaveBeenCalled();
  });

  it("marque le lead HUMAN_REVIEW si la route est inconnue", async () => {
    const dependencies = buildDependencies(baseLead());
    dependencies.resolveDistance.mockResolvedValueOnce({
      ok: false,
      review: "UNKNOWN_ROUTE_NO_DISTANCE",
      message: "Distance inconnue.",
    });

    const result = await calculateQuoteForLead(leadId, dependencies);

    expect(result).toEqual({
      ok: false,
      status: "HUMAN_REVIEW",
      reason: "UNKNOWN_ROUTE_NO_DISTANCE",
    });
    expect(dependencies.markHumanReview).toHaveBeenCalledWith(
      leadId,
      "UNKNOWN_ROUTE_NO_DISTANCE",
    );
    expect(dependencies.saveQuote).not.toHaveBeenCalled();
  });

  it("refuse un trajet avec arrêt sans résoudre la distance ni créer de quote", async () => {
    const dependencies = buildDependencies(
      baseLead({ has_intermediate_stop: true, intermediate_stops: ["Dijon"] }),
    );

    const result = await calculateQuoteForLead(leadId, dependencies);

    expect(result).toEqual({
      ok: false,
      status: "HUMAN_REVIEW",
      reason: "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE",
    });
    expect(dependencies.markHumanReview).toHaveBeenCalledWith(
      leadId,
      "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE",
    );
    expect(dependencies.resolveDistance).not.toHaveBeenCalled();
    expect(dependencies.saveQuote).not.toHaveBeenCalled();
  });

  it("marque le lead HUMAN_REVIEW si calculer_devis refuse plus de 85 passagers", async () => {
    const dependencies = buildDependencies(baseLead({ passenger_count: 86 }));

    const result = await calculateQuoteForLead(leadId, dependencies);

    expect(result).toEqual({
      ok: false,
      status: "HUMAN_REVIEW",
      reason: "PAX_OVER_85",
    });
    expect(dependencies.markHumanReview).toHaveBeenCalledWith(leadId, "PAX_OVER_85");
    expect(dependencies.saveQuote).not.toHaveBeenCalled();
  });
});
