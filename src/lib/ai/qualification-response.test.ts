import { describe, expect, it } from "vitest";

import { buildQualificationResponse } from "./qualification-response";

describe("buildQualificationResponse", () => {
  it("asks only the first missing field", () => {
    expect(
      buildQualificationResponse([], ["arrival_city", "departure_date", "passenger_count"]),
    ).toBe("Quelle est votre ville d'arrivée ?");
  });

  it("provides a date format example when departure_date is next", () => {
    expect(buildQualificationResponse([], ["departure_date", "passenger_count"])).toBe(
      "À quelle date souhaitez-vous partir ? (Ex. 11 juillet ou 2026-07-11.)",
    );
  });

  it("prioritizes a blocking warning", () => {
    expect(
      buildQualificationResponse(
        [
          {
            field: "departureDate",
            code: "DEPARTURE_DATE_PAST",
            message: "La date de départ est déjà passée.",
            blocking: true,
          },
        ],
        ["departure_date"],
      ),
    ).toBe("La date de départ est déjà passée.");
  });
});
