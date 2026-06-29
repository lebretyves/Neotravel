import { describe, expect, it } from "vitest";

import type { QuoteInput, QuoteOutput, QuoteResult } from "../domain/types";
import { calculer_devis } from "./calculer-devis";
import { DEFAULT_PRICING_RULES } from "./pricing-rules";

function validInput(overrides: Partial<QuoteInput> = {}): QuoteInput {
  return {
    leadId: "lead-001",
    departureCity: "Paris",
    arrivalCity: "Lyon",
    departureDate: "2026-09-15",
    requestDate: "2026-06-01",
    tripType: "one_way",
    passengerCount: 20,
    distanceKm: 50,
    distanceSource: "seed",
    ...overrides,
  };
}

function expectQuote(result: QuoteResult): QuoteOutput {
  if (!result.ok) {
    throw new Error(`Expected quote, got review ${result.review}: ${result.message}`);
  }

  return result.quote;
}

describe("calculer_devis", () => {
  it("utilise le palier supérieur pour un transfert simple <= 180 km", () => {
    const quote = expectQuote(calculer_devis(validInput({ distanceKm: 46 })));

    expect(quote.breakdown.distance.gridCeilingKm).toBe(50);
    expect(quote.breakdown.distance.oneWayBaseEur).toBe(350);
  });

  it("applique la formule longue distance au-delà de 180 km", () => {
    const quote = expectQuote(calculer_devis(validInput({ distanceKm: 200 })));

    expect(quote.breakdown.distance.pricingMode).toBe("long_distance_formula");
    expect(quote.breakdown.distance.oneWayBaseEur).toBe(1000);
  });

  it("double la base pour un aller-retour", () => {
    const quote = expectQuote(
      calculer_devis(validInput({ distanceKm: 50, tripType: "round_trip" })),
    );

    expect(quote.breakdown.distance.oneWayBaseEur).toBe(350);
    expect(quote.breakdown.trip.multiplier).toBe(2);
    expect(quote.breakdown.trip.baseAfterTripTypeEur).toBe(700);
  });

  it("applique le coefficient saison très haute en mai ou juin", () => {
    const mayQuote = expectQuote(
      calculer_devis(validInput({ requestDate: "2026-01-01", departureDate: "2026-05-10" })),
    );
    const juneQuote = expectQuote(
      calculer_devis(validInput({ requestDate: "2026-01-01", departureDate: "2026-06-10" })),
    );

    expect(mayQuote.breakdown.coefficients.seasonality).toBe(0.15);
    expect(juneQuote.breakdown.coefficients.seasonality).toBe(0.15);
  });

  it("applique DD_PRIORITAIRE pour un départ <= 14 jours", () => {
    const quote = expectQuote(
      calculer_devis(validInput({ requestDate: "2026-09-01", departureDate: "2026-09-14" })),
    );

    expect(quote.breakdown.coefficients.leadTime).toBe(0.1);
  });

  it("applique le coefficient capacité +15 % pour 60 passagers", () => {
    const quote = expectQuote(calculer_devis(validInput({ passengerCount: 60 })));

    expect(quote.vehicle_code).toBe("COACH_63");
    expect(quote.breakdown.coefficients.capacity).toBe(0.15);
  });

  it("produit un devis pour exactement 85 passagers (borne supérieure COACH_85)", () => {
    const quote = expectQuote(calculer_devis(validInput({ passengerCount: 85 })));

    expect(quote.vehicle_code).toBe("COACH_85");
    expect(quote.breakdown.coefficients.capacity).toBe(0.4);
  });

  it("retourne HUMAN_REVIEW PAX_OVER_85 dès 86 passagers", () => {
    const result = calculer_devis(validInput({ passengerCount: 86 }));

    expect(result).toMatchObject({ ok: false, review: "PAX_OVER_85" });
  });

  it("retourne HUMAN_REVIEW PAX_ZERO_OR_NEGATIVE pour 0 passager", () => {
    const result = calculer_devis(validInput({ passengerCount: 0 }));

    expect(result).toMatchObject({ ok: false, review: "PAX_ZERO_OR_NEGATIVE" });
  });

  it("retourne HUMAN_REVIEW UNKNOWN_ROUTE_NO_DISTANCE pour une distance <= 0", () => {
    const result = calculer_devis(validInput({ distanceKm: 0 }));

    expect(result).toMatchObject({ ok: false, review: "UNKNOWN_ROUTE_NO_DISTANCE" });
  });

  it("ne crée aucune ligne d'option et ne change pas le total sans option", () => {
    const quote = expectQuote(calculer_devis(validInput()));

    expect(quote.breakdown.options.items).toEqual([]);
    expect(quote.breakdown.options.totalEur).toBe(0);
  });

  it("option nuit chauffeur : ligne placeholder, total inchangé, aucun prix inventé", () => {
    const base = expectQuote(calculer_devis(validInput()));
    const quote = expectQuote(calculer_devis(validInput({ options: { driverOvernight: true } })));

    const line = quote.breakdown.options.items?.find((item) => item.code === "driver_overnight");
    expect(line?.label).toBe("Nuit chauffeur");
    expect(line?.pricingStatus).toBe("TO_CONFIRM");
    expect(line?.amountEur).toBe(0);
    expect(quote.breakdown.options.totalEur).toBe(0);
    expect(quote.price_ttc).toBe(base.price_ttc);
  });

  it("option guide : ligne placeholder, total inchangé", () => {
    const base = expectQuote(calculer_devis(validInput()));
    const quote = expectQuote(calculer_devis(validInput({ options: { guide: true } })));

    const line = quote.breakdown.options.items?.find((item) => item.code === "guide");
    expect(line?.label).toBe("Guide / accompagnateur");
    expect(line?.pricingStatus).toBe("TO_CONFIRM");
    expect(line?.amountEur).toBe(0);
    expect(quote.price_ttc).toBe(base.price_ttc);
  });

  it("option guide avec jours confirmés : ligne PRICED à 80 €/jour ajoutée au total", () => {
    const base = expectQuote(calculer_devis(validInput()));
    const quote = expectQuote(calculer_devis(validInput({ options: { guide: true, guideDays: 2 } })));

    const line = quote.breakdown.options.items?.find((item) => item.code === "guide");
    expect(line?.pricingStatus).toBe("PRICED");
    expect(line?.amountEur).toBe(160);
    expect(line?.note).toMatch(/2 jours × 80/);
    expect(quote.breakdown.options.totalEur).toBe(160);
    expect(quote.price_ttc).toBeGreaterThan(base.price_ttc);
  });

  it("option nuit chauffeur avec nuits confirmées : ligne PRICED à 120 €/nuit ajoutée au total", () => {
    const base = expectQuote(calculer_devis(validInput()));
    const quote = expectQuote(calculer_devis(validInput({ options: { driverOvernight: true, driverNights: 1 } })));

    const line = quote.breakdown.options.items?.find((item) => item.code === "driver_overnight");
    expect(line?.pricingStatus).toBe("PRICED");
    expect(line?.amountEur).toBe(120);
    expect(line?.note).toMatch(/1 nuit × 120/);
    expect(quote.breakdown.options.totalEur).toBe(120);
    expect(quote.price_ttc).toBeGreaterThan(base.price_ttc);
  });

  it("option péages sans montant contrôlé : placeholder 'inclus/à confirmer', total inchangé", () => {
    const base = expectQuote(calculer_devis(validInput()));
    const quote = expectQuote(calculer_devis(validInput({ options: { tolls: true } })));

    const line = quote.breakdown.options.items?.find((item) => item.code === "tolls");
    expect(line?.label).toBe("Péages");
    expect(line?.pricingStatus).toBe("INCLUDED");
    expect(line?.amountEur).toBe(0);
    expect(line?.note).toMatch(/confirmer/i);
    expect(quote.price_ttc).toBe(base.price_ttc);
  });

  it("option péages avec forfait contrôlé : ligne PRICED ajoutée au total", () => {
    const base = expectQuote(calculer_devis(validInput()));
    const quote = expectQuote(calculer_devis(validInput({ options: { tollPackageEur: 120 } })));

    const line = quote.breakdown.options.items?.find((item) => item.code === "tolls");
    expect(line?.pricingStatus).toBe("PRICED");
    expect(line?.amountEur).toBe(120);
    expect(quote.breakdown.options.totalEur).toBe(120);
    expect(quote.price_ttc).toBeGreaterThan(base.price_ttc);
  });

  it("TVA reste calculée par le moteur et visible dans le breakdown", () => {
    const quote = expectQuote(calculer_devis(validInput()));

    expect(quote.vat_rate).toBe(DEFAULT_PRICING_RULES.vatRate);
    expect(quote.breakdown.vat.rate).toBe(DEFAULT_PRICING_RULES.vatRate);
    expect(quote.vat_amount).toBeCloseTo(quote.price_ht * DEFAULT_PRICING_RULES.vatRate, 2);
  });

  it("retourne le même deterministic_hash pour le même input", () => {
    const input = validInput({
      options: {
        guideDays: 2,
        driverNights: 1,
        tollsIncluded: true,
        tollPackageEur: 120,
      },
    });
    const firstQuote = expectQuote(calculer_devis(input, DEFAULT_PRICING_RULES));
    const secondQuote = expectQuote(calculer_devis(input, DEFAULT_PRICING_RULES));

    expect(firstQuote.deterministic_hash).toHaveLength(64);
    expect(firstQuote.deterministic_hash).toBe(secondQuote.deterministic_hash);
  });
});
