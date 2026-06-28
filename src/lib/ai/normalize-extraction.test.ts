import { describe, expect, it } from "vitest";

import { normalizeExtraction } from "./normalize-extraction";
import { mergeLead } from "./merge-existing";
import { validateLead } from "./validate-lead";
import { detectMissingFields } from "./tools";
import { LeadQualificationSchema } from "../domain/schemas";

// ---------------------------------------------------------------------------
// normalizeExtraction unit tests
// ---------------------------------------------------------------------------

describe("normalizeExtraction", () => {
  it("infers trip_type = round_trip when return_date is newly extracted", () => {
    const out = normalizeExtraction({ return_date: "2027-06-12" }, {});
    expect(out.trip_type).toBe("round_trip");
  });

  it("infers trip_type = round_trip from existing return_date even when delta is empty", () => {
    const out = normalizeExtraction({}, { return_date: "2027-06-12" });
    expect(out.trip_type).toBe("round_trip");
  });

  it("does not override an explicit trip_type = one_way", () => {
    const out = normalizeExtraction(
      { trip_type: "one_way", return_date: "2027-06-12" },
      {},
    );
    expect(out.trip_type).toBe("one_way");
  });

  it("infers year for partial return_date from extracted departure_date", () => {
    const out = normalizeExtraction(
      { departure_date: "2027-06-11", return_date: "06-12" },
      {},
    );
    expect(out.return_date).toBe("2027-06-12");
  });

  it("infers year for partial return_date from existing departure_date", () => {
    const out = normalizeExtraction(
      { return_date: "06-12" },
      { departure_date: "2027-06-11" },
    );
    expect(out.return_date).toBe("2027-06-12");
  });

  it("leaves a complete return_date untouched", () => {
    const out = normalizeExtraction(
      { return_date: "2027-06-12" },
      { departure_date: "2027-06-11" },
    );
    expect(out.return_date).toBe("2027-06-12");
  });

  it("does nothing when raw extraction is empty", () => {
    const out = normalizeExtraction({}, {});
    expect(out).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Multi-turn conversation simulation
// Reproduces the transcript from the bug report to verify the pipeline works.
// ---------------------------------------------------------------------------

describe("multi-turn lead accumulation", () => {
  const today = new Date("2026-06-26T12:00:00");

  /**
   * Simulates one chat turn end-to-end exactly as the route does:
   * normalize delta → merge over existing (no-overwrite) → validate → detect missing.
   */
  function simulateTurn(
    existing: ReturnType<typeof LeadQualificationSchema.parse>,
    delta: Record<string, unknown>,
  ) {
    const normalized = normalizeExtraction(delta, existing);
    const merged = LeadQualificationSchema.parse(
      mergeLead(existing, {
        ...normalized,
        free_message: (normalized.free_message as string | undefined) ?? existing.free_message,
      }),
    );
    const { sanitized } = validateLead(merged, today);
    const missing = detectMissingFields(sanitized);
    return { merged: sanitized, missing };
  }

  it("replays the full transcript and ends QUALIFIED without re-asking filled fields", () => {
    let state = LeadQualificationSchema.parse({});

    // Turn 1: "hello" → empty extraction
    ({ merged: state } = simulateTurn(state, {}));
    expect(detectMissingFields(state).missing_fields).toContain("departure_city");
    expect(detectMissingFields(state).missing_fields).toContain("arrival_city");

    // Turn 2: "je sais pas encore" → empty extraction
    ({ merged: state } = simulateTurn(state, {}));
    expect(detectMissingFields(state).missing_fields).toHaveLength(5);

    // Turn 3: "Je veux aller à Montpellier" → arrival_city extracted
    ({ merged: state } = simulateTurn(state, { arrival_city: "Montpellier" }));
    expect(state.arrival_city).toBe("Montpellier");
    expect(detectMissingFields(state).missing_fields).not.toContain("arrival_city");

    // Turn 4: "on part de Paris" → departure_city extracted, Montpellier preserved
    ({ merged: state } = simulateTurn(state, { departure_city: "Paris" }));
    expect(state.departure_city).toBe("Paris");
    expect(state.arrival_city).toBe("Montpellier"); // not erased
    expect(detectMissingFields(state).missing_fields).not.toContain("departure_city");

    // Turn 5: "on part le 11 juin 2027, on reviendra le 12"
    ({ merged: state } = simulateTurn(state, {
      departure_date: "2027-06-11",
      return_date: "06-12", // partial — normalize adds the year
    }));
    expect(state.departure_date).toBe("2027-06-11");
    expect(state.return_date).toBe("2027-06-12");
    expect(state.trip_type).toBe("round_trip"); // derived from return_date
    expect(detectMissingFields(state).missing_fields).not.toContain("departure_date");
    expect(detectMissingFields(state).missing_fields).not.toContain("trip_type");

    // Turn 6: "on sera 45 passagers" — generateObject + Zod guarantee a number
    ({ merged: state } = simulateTurn(state, { passenger_count: 45 }));
    expect(state.passenger_count).toBe(45);

    // Turn 7: an empty/conversational message must NOT re-ask the filled passenger count
    ({ merged: state } = simulateTurn(state, {}));
    expect(detectMissingFields(state).missing_fields).not.toContain("passenger_count");

    // Final: all 5 critical fields present, lead qualifies
    expect(detectMissingFields(state).status).toBe("QUALIFIED");
    expect(detectMissingFields(state).missing_fields).toHaveLength(0);
  });

  it("keeps the lead INCOMPLETE when a past date is given, and recovers after correction", () => {
    let state = LeadQualificationSchema.parse({
      departure_city: "Paris",
      arrival_city: "Montpellier",
      passenger_count: 45,
      trip_type: "one_way",
    });

    // User gives a past date → stripped → departure_date re-appears missing
    ({ merged: state } = simulateTurn(state, { departure_date: "2025-06-11" }));
    expect(state.departure_date).toBeUndefined();
    expect(detectMissingFields(state).missing_fields).toContain("departure_date");
    expect(detectMissingFields(state).status).toBe("INCOMPLETE");

    // User corrects with a future date → qualifies
    ({ merged: state } = simulateTurn(state, { departure_date: "2027-06-11" }));
    expect(state.departure_date).toBe("2027-06-11");
    expect(detectMissingFields(state).status).toBe("QUALIFIED");
  });

  it("does not lose previously captured city when next message has no city", () => {
    let state = LeadQualificationSchema.parse({ arrival_city: "Montpellier" });

    ({ merged: state } = simulateTurn(state, { departure_city: "Paris" }));
    expect(state.arrival_city).toBe("Montpellier");
    expect(state.departure_city).toBe("Paris");
  });

  it("trip_type = round_trip persists across subsequent empty turns", () => {
    let state = LeadQualificationSchema.parse({
      departure_city: "Paris",
      arrival_city: "Lyon",
      departure_date: "2027-06-11",
      return_date: "2027-06-12",
      trip_type: "round_trip",
    });

    // User sends another message with no new transport info
    ({ merged: state } = simulateTurn(state, {}));
    expect(state.trip_type).toBe("round_trip");
    expect(state.return_date).toBe("2027-06-12");
  });

  it("manual form sync can add contact email and return date without erasing route fields", () => {
    const state = mergeLead(
      LeadQualificationSchema.parse({
        departure_city: "Paris",
        arrival_city: "Lyon",
        departure_date: "2027-06-11",
        passenger_count: 45,
        trip_type: "round_trip",
      }),
      {
        email: "client@neotravel.fr",
        return_date: "2027-06-12",
      },
    );

    expect(state).toMatchObject({
      email: "client@neotravel.fr",
      departure_city: "Paris",
      arrival_city: "Lyon",
      departure_date: "2027-06-11",
      return_date: "2027-06-12",
      passenger_count: 45,
      trip_type: "round_trip",
    });
  });

  it("does not let a later extraction erase a detected intermediate stop", () => {
    const state = mergeLead(
      LeadQualificationSchema.parse({
        has_intermediate_stop: true,
        intermediate_stops: ["Dijon"],
      }),
      { has_intermediate_stop: false },
    );

    expect(state).toMatchObject({
      has_intermediate_stop: true,
      intermediate_stops: ["Dijon"],
    });
  });
});
