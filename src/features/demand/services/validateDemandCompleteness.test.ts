import { describe, expect, it } from "vitest";
import { validateDemandCompleteness } from "./validateDemandCompleteness";

describe("validateDemandCompleteness", () => {
  it("ne bloque pas un aller-retour sans date de retour pour générer le devis", () => {
    const result = validateDemandCompleteness({
      rawMessage: "Paris Lyon le 11 juillet, 30 passagers, aller-retour",
      organization: "Client test",
      email: "client@example.com",
      departureCity: "Paris",
      arrivalCity: "Lyon",
      departureDate: "2027-07-11",
      returnDate: null,
      passengerCount: 30,
      tripType: "round_trip",
      options: [],
    });

    expect(result.missingFields).not.toContain("returnDate");
    expect(result.complete).toBe(true);
  });
});
