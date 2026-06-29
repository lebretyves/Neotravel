import type { Quote, QuoteCalculation } from "@/shared/types/quote";

const DEMO_HASH = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function createCalculation(input: {
  quoteNumber: string;
  routeLabel: string;
  distanceKm: number;
  baseAmount: number;
  optionsAmount?: number;
  totalAmount: number;
}): QuoteCalculation {
  const optionsAmount = input.optionsAmount ?? 0;
  const priceHt = Math.round(input.totalAmount / 1.1);
  const vatAmount = input.totalAmount - priceHt;

  return {
    baseAmount: input.baseAmount,
    passengerAmount: 0,
    optionsAmount,
    subtotal: priceHt,
    vatAmount,
    totalAmount: input.totalAmount,
    currency: "EUR",
    quoteNumber: input.quoteNumber,
    priceHt,
    vatRate: 0.1,
    priceTtc: input.totalAmount,
    deterministicHash: DEMO_HASH,
    basePriceSource: "route_pricing",
    distanceKm: input.distanceKm,
    breakdown: {
      routeLabel: input.routeLabel,
      matrixVersion: "demo-v12",
      distanceKm: input.distanceKm,
      basePriceSource: "route_pricing",
      vehicleCode: "coach_50",
      vehicleLabel: "Autocar 50 places",
      transferPricingMode: input.distanceKm <= 180 ? "flat_rate_under_180km" : "long_distance_over_180km",
      formulaLabel: "Fixture demo controlee, moteur de pricing reel non court-circuite.",
      basePriceEur: input.baseAmount,
      options: [],
      optionsTotal: optionsAmount,
      subtotal: priceHt,
      seasonCoeff: 1,
      urgencyCoeff: 1,
      capacityCoeff: 1,
      coeffMultiplier: 1,
      afterCoeff: priceHt,
      margin: Math.round(priceHt * 0.15),
      vatAmount
    },
    coefficients: {
      season: 1,
      urgency: 1,
      capacity: 1,
      multiplier: 1
    },
    lines: [
      { label: "Base trajet", amount: input.baseAmount },
      { label: "Options", amount: optionsAmount },
      { label: "TVA 10%", amount: vatAmount }
    ]
  };
}

export const mockQuotes: Quote[] = [
  {
    id: "demo-quote-alpha",
    leadId: "demo-lead-alpha",
    status: "QUOTE_SENT",
    createdAt: "2026-01-08T10:18:00.000Z",
    updatedAt: "2026-01-08T10:42:00.000Z",
    calculation: createCalculation({
      quoteNumber: "NT-DEMO-ALPHA",
      routeLabel: "Paris -> Lyon",
      distanceKm: 465,
      baseAmount: 2450,
      optionsAmount: 120,
      totalAmount: 3270
    })
  },
  {
    id: "demo-quote-urgent",
    leadId: "demo-lead-urgent-treatable",
    status: "QUOTE_SENT",
    createdAt: "2026-03-11T09:28:00.000Z",
    updatedAt: "2026-03-11T09:55:00.000Z",
    calculation: createCalculation({
      quoteNumber: "NT-DEMO-URGENT",
      routeLabel: "Paris -> Lille",
      distanceKm: 225,
      baseAmount: 1350,
      totalAmount: 1835
    })
  },
  {
    id: "demo-quote-accepted",
    leadId: "demo-lead-accepted",
    status: "ACCEPTED",
    createdAt: "2026-05-09T11:05:00.000Z",
    updatedAt: "2026-05-10T15:10:00.000Z",
    calculation: createCalculation({
      quoteNumber: "NT-DEMO-WON",
      routeLabel: "Lyon -> Marseille",
      distanceKm: 315,
      baseAmount: 1750,
      optionsAmount: 80,
      totalAmount: 2385
    })
  },
  {
    id: "demo-quote-no-response",
    leadId: "demo-lead-no-response",
    status: "QUOTE_SENT",
    createdAt: "2026-05-17T10:30:00.000Z",
    updatedAt: "2026-05-17T10:50:00.000Z",
    calculation: createCalculation({
      quoteNumber: "NT-DEMO-NO-RESPONSE",
      routeLabel: "Paris -> Lille",
      distanceKm: 225,
      baseAmount: 1350,
      totalAmount: 1810
    })
  },
  {
    id: "demo-quote-refused",
    leadId: "demo-lead-refused",
    status: "REFUSED",
    createdAt: "2026-06-04T16:00:00.000Z",
    updatedAt: "2026-06-06T09:20:00.000Z",
    calculation: createCalculation({
      quoteNumber: "NT-DEMO-LOST",
      routeLabel: "Nantes -> Bordeaux",
      distanceKm: 345,
      baseAmount: 1950,
      totalAmount: 2520
    })
  }
];
