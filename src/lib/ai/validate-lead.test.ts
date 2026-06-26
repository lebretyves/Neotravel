import { describe, expect, it } from "vitest";

import { validateLead } from "./validate-lead";

const today = new Date("2026-06-26T12:00:00");

describe("validateLead", () => {
  it("strips a past departure_date and emits a blocking warning", () => {
    const { warnings, sanitized, review } = validateLead(
      { departure_date: "2025-06-11" },
      today,
    );
    expect(sanitized.departure_date).toBeUndefined();
    expect(review).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      field: "departureDate",
      code: "DEPARTURE_DATE_PAST",
      blocking: true,
    });
  });

  it("strips an invalid departure_date", () => {
    const { warnings, sanitized } = validateLead({ departure_date: "2027-02-30" }, today);
    expect(sanitized.departure_date).toBeUndefined();
    expect(warnings[0].code).toBe("DEPARTURE_DATE_INVALID");
  });

  it("strips a return_date before departure_date with a blocking warning", () => {
    const { warnings, sanitized } = validateLead(
      { departure_date: "2027-06-11", return_date: "2027-06-10" },
      today,
    );
    expect(sanitized.departure_date).toBe("2027-06-11");
    expect(sanitized.return_date).toBeUndefined();
    expect(warnings.some((w) => w.code === "RETURN_BEFORE_DEPARTURE" && w.blocking)).toBe(true);
  });

  it("strips passenger_count of 0 with a blocking warning", () => {
    const { warnings, sanitized } = validateLead({ passenger_count: 0 }, today);
    expect(sanitized.passenger_count).toBeUndefined();
    expect(warnings[0]).toMatchObject({
      field: "passengerCount",
      code: "PASSENGER_COUNT_INVALID",
      blocking: true,
    });
  });

  it("escalates >85 passengers to HUMAN_REVIEW without stripping or warning", () => {
    const { warnings, sanitized, review } = validateLead({ passenger_count: 86 }, today);
    expect(review).toBe("PAX_OVER_85");
    expect(sanitized.passenger_count).toBe(86); // value kept
    expect(warnings).toHaveLength(0); // not re-asked
  });

  it("returns nothing for a fully valid future lead", () => {
    const { warnings, sanitized, review } = validateLead(
      {
        departure_city: "Paris",
        arrival_city: "Montpellier",
        departure_date: "2027-06-11",
        return_date: "2027-06-12",
        passenger_count: 45,
        trip_type: "round_trip",
      },
      today,
    );
    expect(warnings).toHaveLength(0);
    expect(review).toBeNull();
    expect(sanitized.departure_date).toBe("2027-06-11");
    expect(sanitized.return_date).toBe("2027-06-12");
    expect(sanitized.passenger_count).toBe(45);
  });
});
