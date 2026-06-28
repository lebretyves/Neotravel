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

  it("extracts common slash dates and relative date shortcuts", () => {
    expect(extractTurnFacts("11/07", {}, referenceDate)).toEqual({
      departure_date: "2026-07-11",
    });
    expect(extractTurnFacts("demain", {}, referenceDate)).toEqual({
      departure_date: "2026-06-27",
    });
    expect(extractTurnFacts("semaine prochaine", {}, referenceDate)).toEqual({
      departure_date: "2026-07-03",
    });
  });

  it("extracts a natural route sentence with typos", () => {
    expect(extractTurnFacts("je part de paris et je vais a montpellier", {}, referenceDate)).toEqual({
      departure_city: "Paris",
      arrival_city: "Montpellier",
    });
  });

  it("extracts current location and destination as route cities", () => {
    expect(extractTurnFacts("je suis à paris et je vais à montpellier", {}, referenceDate)).toEqual({
      departure_city: "Paris",
      arrival_city: "Montpellier",
    });
  });

  it("extracts routes from compact typo-heavy messages", () => {
    expect(extractTurnFacts("j sui a pariss et jve a montpelier", {}, referenceDate)).toEqual({
      departure_city: "Pariss",
      arrival_city: "Montpelier",
    });
    expect(extractTurnFacts("de paris a lyon", {}, referenceDate)).toEqual({
      departure_city: "Paris",
      arrival_city: "Lyon",
    });
  });

  it("extracts destination from shorthand intent", () => {
    expect(extractTurnFacts("jvai a lyon", { departure_city: "Paris" }, referenceDate)).toEqual({
      arrival_city: "Lyon",
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

  it("extracts noisy passenger counts once the date is known", () => {
    expect(extractTurnFacts("on est environ 45 pers", { departure_date: "2026-07-11" }, referenceDate)).toEqual({
      passenger_count: 45,
    });
  });

  it("uses the last assistant question to map a short city answer to departure_city", () => {
    expect(
      extractTurnFacts(
        "Paris",
        {},
        referenceDate,
        "Pour commencer, quelle est votre ville de départ ?",
      ),
    ).toEqual({ departure_city: "Paris" });
  });

  it("uses the last assistant question to map a short city answer to arrival_city", () => {
    expect(
      extractTurnFacts(
        "Montpellier",
        { departure_city: "Paris" },
        referenceDate,
        "Quelle est votre ville d'arrivée ?",
      ),
    ).toEqual({ arrival_city: "Montpellier" });
  });

  it("does not treat greetings as city answers", () => {
    expect(
      extractTurnFacts(
        "salut",
        {},
        referenceDate,
        "Pour commencer, quelle est votre ville de départ ?",
      ),
    ).toEqual({});
  });
});
