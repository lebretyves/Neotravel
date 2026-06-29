import type { OptionRates, PricingRules } from "../domain/types";

// Official supplément tariffs (Tableau 3). Kept here so both the in-code defaults and the
// DB-driven matrix mapping fall back to the same controlled values when none are stored.
export const DEFAULT_OPTION_RATES: OptionRates = {
  guideDayRateEur: 80,
  driverNightRateEur: 120,
};

export const DEFAULT_PRICING_RULES: PricingRules = {
  version: "mvp-2026-06-24",
  forfaitDistanceGrid: [
    { distanceKm: 10, priceEur: 250 },
    { distanceKm: 20, priceEur: 250 },
    { distanceKm: 30, priceEur: 250 },
    { distanceKm: 40, priceEur: 320 },
    { distanceKm: 50, priceEur: 350 },
    { distanceKm: 60, priceEur: 390 },
    { distanceKm: 70, priceEur: 430 },
    { distanceKm: 80, priceEur: 500 },
    { distanceKm: 90, priceEur: 540 },
    { distanceKm: 100, priceEur: 580 },
    { distanceKm: 110, priceEur: 620 },
    { distanceKm: 120, priceEur: 660 },
    { distanceKm: 130, priceEur: 700 },
    { distanceKm: 140, priceEur: 740 },
    { distanceKm: 150, priceEur: 780 },
    { distanceKm: 160, priceEur: 820 },
    { distanceKm: 170, priceEur: 860 },
    { distanceKm: 180, priceEur: 900 },
  ],
  longDistanceRatePerKmPerLeg: 2.5,
  seasonality: {
    low: { months: [11, 1, 2, 8], coefficient: -0.07 },
    medium: { months: [12, 10, 9], coefficient: 0 },
    high: { months: [3, 4, 7], coefficient: 0.1 },
    veryHigh: { months: [5, 6], coefficient: 0.15 },
  },
  leadTime: [
    { code: "DD_PRIORITAIRE", maxDaysInclusive: 14, coefficient: 0.1 },
    {
      code: "DD_URGENT",
      minDaysExclusive: 14,
      maxDaysInclusive: 30,
      coefficient: 0.05,
    },
    {
      code: "DD_NORMAL",
      minDaysExclusive: 30,
      maxDaysInclusive: 90,
      coefficient: -0.05,
    },
    { code: "DD_3MOISETPLUS", minDaysExclusive: 90, coefficient: -0.1 },
  ],
  capacity: [
    { maxPassengersInclusive: 19, coefficient: -0.05, vehicleCode: "MINIBUS_19" },
    {
      minPassengersExclusive: 19,
      maxPassengersInclusive: 53,
      coefficient: 0,
      vehicleCode: "COACH_53",
    },
    {
      minPassengersExclusive: 53,
      maxPassengersInclusive: 63,
      coefficient: 0.15,
      vehicleCode: "COACH_63",
    },
    {
      minPassengersExclusive: 63,
      maxPassengersInclusive: 67,
      coefficient: 0.2,
      vehicleCode: "COACH_67",
    },
    {
      minPassengersExclusive: 67,
      maxPassengersInclusive: 85,
      coefficient: 0.4,
      vehicleCode: "COACH_85",
    },
  ],
  optionRates: DEFAULT_OPTION_RATES,
  marginRate: 0.15,
  vatRate: 0.1,
};
