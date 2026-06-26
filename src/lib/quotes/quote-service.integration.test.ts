import { randomUUID } from "node:crypto";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createServerSupabaseClient } from "../supabase/server";
import { calculateQuoteForLead } from "./quote-service";

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION === "true";
const describeIntegration = runIntegration ? describe : describe.skip;

type QuoteRow = {
  id: string;
  lead_id: string;
  price_ht: number | string;
  tva_10pct: number | string;
  price_ttc: number | string;
  deterministic_hash: string;
  matrices_version: string;
  status: string;
  breakdown: {
    distance: {
      distanceKm: number;
      pricingMode: string;
      oneWayBaseEur: number;
    };
    trip: {
      type: string;
      multiplier: number;
      baseAfterTripTypeEur: number;
    };
    coefficients: {
      seasonality: number;
      leadTime: number;
      capacity: number;
      total: number;
      amountEur: number;
    };
    margin: {
      rate: number;
      amountEur: number;
    };
    vat: {
      rate: number;
      amountEur: number;
    };
    totals: {
      beforeMarginEur: number;
      priceHtEur: number;
      priceTtcEur: number;
    };
  };
};

const createdClientIds: string[] = [];
const createdLeadIds: string[] = [];
const createdQuoteIds: string[] = [];

function isoDateDaysFromNow(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);

  return date.toISOString().slice(0, 10);
}

describeIntegration("calculateQuoteForLead integration", () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.API_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY ??= process.env.SERVICE_ROLE_KEY;

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("pricing_matrices").select("id").limit(1);

    if (error) {
      throw new Error(`Supabase integration setup failed: ${error.message}`);
    }
  });

  afterEach(async () => {
    const supabase = createServerSupabaseClient();

    if (createdQuoteIds.length > 0) {
      await supabase.from("audit_logs").delete().in("entity_id", createdQuoteIds);
    }

    if (createdLeadIds.length > 0) {
      await supabase.from("audit_logs").delete().in("entity_id", createdLeadIds);
      await supabase.from("quotes").delete().in("lead_id", createdLeadIds);
      await supabase.from("leads").delete().in("id", createdLeadIds);
    }

    if (createdClientIds.length > 0) {
      await supabase.from("clients").delete().in("id", createdClientIds);
    }

    createdQuoteIds.length = 0;
    createdLeadIds.length = 0;
    createdClientIds.length = 0;
  });

  it("crée réellement une quote pour 85 passagers et applique le coefficient capacité +40 %", async () => {
    const supabase = createServerSupabaseClient();
    const clientId = await createClientFixture();
    const leadId = await createLeadFixture({ clientId, passengerCount: 85 });
    const requestDate = isoDateDaysFromNow(0);

    const result = await calculateQuoteForLead(leadId, {
      getRequestDate: () => requestDate,
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(`Expected quote creation, got ${result.status}: ${result.reason}`);
    }

    createdQuoteIds.push(result.quoteId);

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id, lead_id, price_ht, tva_10pct, price_ttc, deterministic_hash, matrices_version, status, breakdown")
      .eq("id", result.quoteId)
      .single<QuoteRow>();

    expect(quoteError).toBeNull();
    expect(quote).toMatchObject({
      id: result.quoteId,
      lead_id: leadId,
      matrices_version: "v1",
      status: "QUOTE_READY",
    });
    expect(quote?.deterministic_hash).toMatch(/^[a-f0-9]{64}$/);

    expect(quote?.breakdown.distance).toMatchObject({
      distanceKm: 465,
      pricingMode: "long_distance_formula",
      oneWayBaseEur: 2325,
    });
    expect(quote?.breakdown.trip).toMatchObject({
      type: "one_way",
      multiplier: 1,
      baseAfterTripTypeEur: 2325,
    });
    expect(quote?.breakdown.coefficients).toMatchObject({
      capacity: 0.4,
      total: 1.3,
      amountEur: 697.5,
    });
    expect(quote?.breakdown.coefficients.leadTime).toBe(-0.1);
    expect(quote?.breakdown.margin).toMatchObject({
      rate: 0.15,
      amountEur: 453.38,
    });
    expect(quote?.breakdown.vat).toMatchObject({
      rate: 0.1,
      amountEur: 347.59,
    });
    expect(quote?.breakdown.totals).toMatchObject({
      beforeMarginEur: 3022.5,
      priceHtEur: 3475.88,
      priceTtcEur: 3823.47,
    });
    expect(Number(quote?.price_ht)).toBe(3475.88);
    expect(Number(quote?.tva_10pct)).toBe(347.59);
    expect(Number(quote?.price_ttc)).toBe(3823.47);

    const { data: lead, error: updatedLeadError } = await supabase
      .from("leads")
      .select("status, human_review_reason")
      .eq("id", leadId)
      .single();

    expect(updatedLeadError).toBeNull();
    expect(lead).toMatchObject({ status: "QUOTE_READY", human_review_reason: null });

    const { data: auditLogs, error: auditError } = await supabase
      .from("audit_logs")
      .select("action")
      .in("entity_id", [leadId, result.quoteId]);

    expect(auditError).toBeNull();
    expect(auditLogs?.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(["LEAD_STATUS_UPDATED", "QUOTE_CREATED"]),
    );
  });

  it("marque 95 passagers en HUMAN_REVIEW et ne crée aucune quote", async () => {
    const supabase = createServerSupabaseClient();
    const clientId = await createClientFixture();
    const leadId = await createLeadFixture({ clientId, passengerCount: 95 });

    const result = await calculateQuoteForLead(leadId, {
      getRequestDate: () => isoDateDaysFromNow(0),
    });

    expect(result).toEqual({ ok: false, status: "HUMAN_REVIEW", reason: "PAX_OVER_85" });

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("status, human_review_reason")
      .eq("id", leadId)
      .single();

    expect(leadError).toBeNull();
    expect(lead).toMatchObject({ status: "HUMAN_REVIEW", human_review_reason: "PAX_OVER_85" });

    const { count, error: quoteCountError } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId);

    expect(quoteCountError).toBeNull();
    expect(count).toBe(0);
  });

  it("marque un itinéraire avec arrêt en HUMAN_REVIEW sans créer de quote", async () => {
    const supabase = createServerSupabaseClient();
    const clientId = await createClientFixture();
    const leadId = await createLeadFixture({
      clientId,
      passengerCount: 42,
      intermediateStops: ["Dijon"],
    });

    const result = await calculateQuoteForLead(leadId, {
      getRequestDate: () => isoDateDaysFromNow(0),
    });

    expect(result).toEqual({
      ok: false,
      status: "HUMAN_REVIEW",
      reason: "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE",
    });

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("status, human_review_reason")
      .eq("id", leadId)
      .single();

    expect(leadError).toBeNull();
    expect(lead).toMatchObject({
      status: "HUMAN_REVIEW",
      human_review_reason: "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE",
    });

    const { count, error: quoteCountError } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId);

    expect(quoteCountError).toBeNull();
    expect(count).toBe(0);
  });
});

async function createClientFixture(): Promise<string> {
  const supabase = createServerSupabaseClient();
  const clientId = randomUUID();
  const { error } = await supabase.from("clients").insert({
    id: clientId,
    name: "Integration Test",
    organization: "NeoTravel Test",
    email: `integration-${clientId}@example.com`,
  });

  expect(error).toBeNull();
  createdClientIds.push(clientId);

  return clientId;
}

async function createLeadFixture(input: {
  clientId: string;
  passengerCount: number;
  intermediateStops?: string[];
}): Promise<string> {
  const supabase = createServerSupabaseClient();
  const leadId = randomUUID();
  const { error } = await supabase.from("leads").insert({
    id: leadId,
    client_id: input.clientId,
    departure_city: "Paris",
    arrival_city: "Lyon",
    departure_date: isoDateDaysFromNow(120),
    passenger_count: input.passengerCount,
    trip_type: "one_way",
    has_intermediate_stop: input.intermediateStops !== undefined,
    intermediate_stops: input.intermediateStops ?? [],
    options: {},
    status: "QUALIFIED",
  });

  expect(error).toBeNull();
  createdLeadIds.push(leadId);

  return leadId;
}
