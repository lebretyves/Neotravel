import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createServerSupabaseClient } from "../supabase/server";
import { createOrUpdateLead } from "./tools";

const describeIntegration =
  process.env.RUN_SUPABASE_INTEGRATION === "true" ? describe : describe.skip;

describeIntegration("createOrUpdateLead integration", () => {
  let leadId: string | undefined;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.API_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY ??= process.env.SERVICE_ROLE_KEY;
  });

  afterEach(async () => {
    if (!leadId) return;

    const supabase = createServerSupabaseClient();
    await supabase.from("audit_logs").delete().eq("entity_id", leadId);
    await supabase.from("leads").delete().eq("id", leadId);
    leadId = undefined;
  });

  it("persists missing lead fields as null and writes LEAD_CREATED", async () => {
    const result = await createOrUpdateLead({
      lead: {
        departure_city: "Paris",
        free_message: "Je pars de Paris.",
      },
    });
    leadId = result.leadId;

    expect(result.status).toBe("INCOMPLETE");
    expect(result.missing_fields).toEqual(
      expect.arrayContaining(["arrival_city", "departure_date", "passenger_count", "trip_type"]),
    );

    const supabase = createServerSupabaseClient();
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("departure_city, arrival_city, departure_date, passenger_count, trip_type, missing_fields")
      .eq("id", leadId)
      .single();

    expect(leadError).toBeNull();
    expect(lead).toMatchObject({
      departure_city: "Paris",
      arrival_city: null,
      departure_date: null,
      passenger_count: null,
      trip_type: null,
    });

    const { data: audit, error: auditError } = await supabase
      .from("audit_logs")
      .select("action")
      .eq("entity_id", leadId)
      .eq("action", "LEAD_CREATED")
      .maybeSingle();

    expect(auditError).toBeNull();
    expect(audit?.action).toBe("LEAD_CREATED");
  });

  it("persists an intermediate stop and marks the lead for human review", async () => {
    const result = await createOrUpdateLead({
      lead: {
        departure_city: "Paris",
        arrival_city: "Montpellier",
        departure_date: "2026-10-24",
        passenger_count: 42,
        trip_type: "one_way",
        has_intermediate_stop: true,
        intermediate_stops: ["Dijon"],
      },
    });
    leadId = result.leadId;

    expect(result.status).toBe("HUMAN_REVIEW");

    const supabase = createServerSupabaseClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .select("status, human_review_reason, has_intermediate_stop, intermediate_stops")
      .eq("id", leadId)
      .single();

    expect(error).toBeNull();
    expect(lead).toMatchObject({
      status: "HUMAN_REVIEW",
      human_review_reason: "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE",
      has_intermediate_stop: true,
      intermediate_stops: ["Dijon"],
    });
  });
});
