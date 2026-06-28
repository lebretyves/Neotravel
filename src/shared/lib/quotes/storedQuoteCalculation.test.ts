import { describe, expect, it } from "vitest";
import { storedQuoteCalculation } from "./storedQuoteCalculation";

describe("storedQuoteCalculation", () => {
  it("reconstruit un devis legacy depuis les colonnes stockées sans recalculer le prix", () => {
    const calculation = storedQuoteCalculation({
      quoteNumber: "NT-467FE1E71A",
      priceHt: 3208.5,
      vatRate: 0.1,
      vatAmount: 320.85,
      priceTtc: 3529.35,
      currency: null,
      deterministicHash: "467fe1",
      matrixVersion: null,
      breakdown: {
        distance: { source: "seed", distanceKm: 465, pricingMode: "long_distance_formula", oneWayBaseEur: 2325 },
        trip: { type: "one_way", multiplier: 1, baseAfterTripTypeEur: 2325 },
        coefficients: { total: 1.2, capacity: 0, leadTime: 0.1, amountEur: 465, seasonality: 0.1 },
        options: { totalEur: 0, tollPackageEur: 0 },
        margin: { rate: 0.15, amountEur: 418.5 },
        vat: { rate: 0.1, amountEur: 320.85 },
        totals: { priceHtEur: 3208.5, priceTtcEur: 3529.35, beforeMarginEur: 2790 },
        vehicle_code: "COACH_53",
      },
    });

    expect(calculation.quoteNumber).toBe("NT-467FE1E71A");
    expect(calculation.priceTtc).toBe(3529.35);
    expect(calculation.totalAmount).toBe(3529.35);
    expect(calculation.distanceKm).toBe(465);
    expect(calculation.breakdown.vehicleCode).toBe("COACH_53");
  });

  it("reste affichable même si le breakdown legacy est absent", () => {
    const calculation = storedQuoteCalculation({
      quoteNumber: "NT-LEGACY",
      priceHt: 1000,
      vatRate: null,
      vatAmount: null,
      priceTtc: 1100,
      currency: null,
      deterministicHash: null,
      matrixVersion: null,
      breakdown: null,
    });

    expect(calculation.quoteNumber).toBe("NT-LEGACY");
    expect(calculation.priceTtc).toBe(1100);
    expect(calculation.vatAmount).toBe(100);
    expect(calculation.lines[0]).toEqual({ label: "Transport", amount: 1000 });
  });
});
