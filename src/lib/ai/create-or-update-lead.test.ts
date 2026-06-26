import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Supabase client so createOrUpdateLead runs without a real DB.
const eqMock = vi.fn(() => ({ error: null }));
const updateMock = vi.fn(() => ({ eq: eqMock }));
const auditInsertMock = vi.fn(async () => ({ error: null }));
const singleMock = vi.fn(() => ({
  data: { id: "00000000-0000-4000-8000-000000000123" },
  error: null,
}));
const selectMock = vi.fn(() => ({ single: singleMock }));
const leadInsertMock = vi.fn(() => ({ select: selectMock }));
const fromMock = vi.fn((table: string) =>
  table === "audit_logs"
    ? { insert: auditInsertMock }
    : { update: updateMock, insert: leadInsertMock },
);

vi.mock("../supabase/server", () => ({
  createServerSupabaseClient: () => ({ from: fromMock }),
}));

import { createOrUpdateLead } from "./tools";

describe("createOrUpdateLead — same lead is enriched, never duplicated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the existing row (UPDATE ... WHERE id = leadId) and returns the same leadId", async () => {
    const leadId = "00000000-0000-4000-8000-000000000abc";

    const result = await createOrUpdateLead({
      leadId,
      lead: {
        departure_city: "Paris",
        arrival_city: "Montpellier",
        departure_date: "2027-06-11",
        passenger_count: 45,
        trip_type: "round_trip",
      },
    });

    // Same leadId preserved — no insert path taken.
    expect(result.leadId).toBe(leadId);
    expect(result.status).toBe("QUALIFIED");

    // It went through UPDATE ... .eq("id", leadId), not INSERT.
    expect(fromMock).toHaveBeenCalledWith("leads");
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(eqMock).toHaveBeenCalledWith("id", leadId);
    expect(auditInsertMock).toHaveBeenCalledWith(expect.objectContaining({ action: "LEAD_UPDATED" }));
  });

  it("marks the row INCOMPLETE while keeping the same leadId when a field is missing", async () => {
    const leadId = "00000000-0000-4000-8000-000000000def";

    const result = await createOrUpdateLead({
      leadId,
      lead: { departure_city: "Paris" }, // missing arrival, date, pax, trip_type
    });

    expect(result.leadId).toBe(leadId);
    expect(result.status).toBe("INCOMPLETE");
    expect(result.missing_fields).toContain("arrival_city");
    expect(eqMock).toHaveBeenCalledWith("id", leadId);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      arrival_city: null,
      departure_date: null,
      passenger_count: null,
      trip_type: null,
    }));
  });

  it("creates an incomplete lead with null unknown fields and an audit event", async () => {
    const result = await createOrUpdateLead({
      lead: { departure_city: "Paris" },
    });

    expect(result.status).toBe("INCOMPLETE");
    expect(leadInsertMock).toHaveBeenCalledWith(expect.objectContaining({
      departure_city: "Paris",
      arrival_city: null,
      departure_date: null,
      passenger_count: null,
      trip_type: null,
    }));
    expect(auditInsertMock).toHaveBeenCalledWith(expect.objectContaining({ action: "LEAD_CREATED" }));
  });

  it("persists an intermediate stop and marks the lead HUMAN_REVIEW", async () => {
    const result = await createOrUpdateLead({
      lead: {
        departure_city: "Paris",
        arrival_city: "Montpellier",
        departure_date: "2027-06-11",
        passenger_count: 45,
        trip_type: "one_way",
        has_intermediate_stop: true,
        intermediate_stops: ["Dijon"],
      },
    });

    expect(result.status).toBe("HUMAN_REVIEW");
    expect(leadInsertMock).toHaveBeenCalledWith(expect.objectContaining({
      has_intermediate_stop: true,
      intermediate_stops: ["Dijon"],
      human_review_reason: "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE",
    }));
    expect(auditInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LEAD_MARKED_HUMAN_REVIEW" }),
    );
  });
});
