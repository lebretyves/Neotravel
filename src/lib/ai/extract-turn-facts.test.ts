import { describe, expect, it } from "vitest";

import { extractTurnFacts } from "./extract-turn-facts";

const referenceDate = new Date("2026-06-26T12:00:00.000Z");

describe("extractTurnFacts", () => {
  it("extracts supported French relative dates", () => {
    expect(extractTurnFacts("dans 3 jours", {}, referenceDate)).toEqual({
      departure_date: "2026-06-29",
    });
    expect(extractTurnFacts("d'ici une semaine ?", {}, referenceDate)).toEqual({
      departure_date: "2026-07-03",
    });
  });

  it("extracts a French calendar date without an explicit year", () => {
    expect(extractTurnFacts("11 juillet", {}, referenceDate)).toEqual({
      departure_date: "2026-07-11",
    });
  });

  it("detects round-trip from French phrases", () => {
    expect(extractTurnFacts("un aller-retour", {}, referenceDate)).toEqual({ trip_type: "round_trip" });
    expect(extractTurnFacts("aller retour", {}, referenceDate)).toEqual({ trip_type: "round_trip" });
    expect(extractTurnFacts("on reviendra", {}, referenceDate)).toEqual({ trip_type: "round_trip" });
  });

  it("detects one-way from French phrases", () => {
    expect(extractTurnFacts("aller simple", {}, referenceDate)).toEqual({ trip_type: "one_way" });
    expect(extractTurnFacts("un aller simple svp", {}, referenceDate)).toEqual({ trip_type: "one_way" });
  });

  it("does not override an already-known trip_type", () => {
    expect(extractTurnFacts("un aller-retour", { trip_type: "one_way" }, referenceDate)).toEqual({});
  });

  it("interprets a standalone number as passengers only after the date is known", () => {
    expect(extractTurnFacts("30", { departure_date: "2026-07-11" }, referenceDate)).toEqual({
      passenger_count: 30,
    });
    expect(extractTurnFacts("30", {}, referenceDate)).toEqual({});
  });
});
