import { describe, expect, it } from "vitest";

import { sanitizeExtractionDelta } from "./sanitize-extraction-delta";

describe("sanitizeExtractionDelta", () => {
  it("removes a model-invented trip_type when no message signal supports it", () => {
    expect(
      sanitizeExtractionDelta(
        { departure_date: "2026-07-11", trip_type: "one_way" },
        { departure_date: "2026-07-11" },
        {},
      ),
    ).toEqual({ departure_date: "2026-07-11" });
  });

  it("keeps trip_type when deterministic extraction found an explicit phrase", () => {
    expect(
      sanitizeExtractionDelta(
        { trip_type: "one_way" },
        { trip_type: "one_way" },
        {},
      ),
    ).toEqual({ trip_type: "one_way" });
  });

  it("derives round_trip from a return date instead of trusting a contradictory model value", () => {
    expect(
      sanitizeExtractionDelta(
        { return_date: "2026-07-12", trip_type: "one_way" },
        {},
        {},
      ),
    ).toEqual({ return_date: "2026-07-12", trip_type: "round_trip" });
  });

  it("keeps round_trip when an existing return date already proves the trip type", () => {
    expect(
      sanitizeExtractionDelta(
        { trip_type: "round_trip" },
        {},
        { return_date: "2026-07-12" },
      ),
    ).toEqual({ trip_type: "round_trip" });
  });
});
