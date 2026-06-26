import { describe, expect, it } from "vitest";

import { detectIntermediateStops } from "./detect-intermediate-stops";

describe("detectIntermediateStops", () => {
  it("flags and extracts an intermediate stop", () => {
    expect(detectIntermediateStops("Mais je veux faire un arrêt à Dijon en fait.")).toEqual({
      has_intermediate_stop: true,
      intermediate_stops: ["Dijon"],
    });
  });

  it("flags route complexity even when the stop city is not stated", () => {
    expect(detectIntermediateStops("Il faudra prévoir une étape sur le trajet.")).toEqual({
      has_intermediate_stop: true,
    });
  });

  it("does not flag an explicit direct route without a stop", () => {
    expect(detectIntermediateStops("Paris Lyon sans arrêt.")).toEqual({});
  });
});
