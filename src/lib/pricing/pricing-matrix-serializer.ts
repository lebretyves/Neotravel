import type {
  CapacityPricingRule,
  LeadTimePricingRule,
  PricingRules,
  SeasonPricingRule
} from "../domain/types";
import { DEFAULT_OPTION_RATES, DEFAULT_PRICING_RULES } from "./pricing-rules";

export type RawPricingMatrix = {
  forfait_distance_grid: Array<{
    distance_km: number;
    price_eur: number;
  }>;
  long_distance: {
    multiplier?: number;
    price_per_km: number;
  };
  seasonality: {
    low: SeasonPricingRule;
    medium: SeasonPricingRule;
    high: SeasonPricingRule;
    very_high: SeasonPricingRule;
  };
  departure_delay: {
    priority: {
      max_days_inclusive: number;
      coefficient: number;
    };
    urgent: {
      min_days_exclusive: number;
      max_days_inclusive: number;
      coefficient: number;
    };
    normal: {
      min_days_exclusive: number;
      max_days_inclusive: number;
      coefficient: number;
    };
    three_months_plus: {
      min_days_exclusive: number;
      coefficient: number;
    };
  };
  capacity: Array<{
    min_passengers_exclusive?: number;
    max_passengers_inclusive: number;
    coefficient: number;
  }>;
  options?: {
    guide_day_rate_eur?: number;
    driver_night_rate_eur?: number;
  };
  margin_rate: number;
  vat_rate: number;
};

export function defaultPricingRules(): PricingRules {
  return structuredClone(DEFAULT_PRICING_RULES);
}

export function pricingRulesToRaw(rules: PricingRules): RawPricingMatrix {
  const leadTimeByCode = Object.fromEntries(rules.leadTime.map((rule) => [rule.code, rule])) as Record<
    LeadTimePricingRule["code"],
    LeadTimePricingRule
  >;

  return {
    forfait_distance_grid: rules.forfaitDistanceGrid.map((row) => ({
      distance_km: row.distanceKm,
      price_eur: row.priceEur
    })),
    long_distance: {
      multiplier: 2,
      price_per_km: rules.longDistanceRatePerKmPerLeg
    },
    seasonality: {
      low: rules.seasonality.low,
      medium: rules.seasonality.medium,
      high: rules.seasonality.high,
      very_high: rules.seasonality.veryHigh
    },
    departure_delay: {
      priority: {
        max_days_inclusive: leadTimeByCode.DD_PRIORITAIRE.maxDaysInclusive ?? 14,
        coefficient: leadTimeByCode.DD_PRIORITAIRE.coefficient
      },
      urgent: {
        min_days_exclusive: leadTimeByCode.DD_URGENT.minDaysExclusive ?? 14,
        max_days_inclusive: leadTimeByCode.DD_URGENT.maxDaysInclusive ?? 30,
        coefficient: leadTimeByCode.DD_URGENT.coefficient
      },
      normal: {
        min_days_exclusive: leadTimeByCode.DD_NORMAL.minDaysExclusive ?? 30,
        max_days_inclusive: leadTimeByCode.DD_NORMAL.maxDaysInclusive ?? 90,
        coefficient: leadTimeByCode.DD_NORMAL.coefficient
      },
      three_months_plus: {
        min_days_exclusive: leadTimeByCode.DD_3MOISETPLUS.minDaysExclusive ?? 90,
        coefficient: leadTimeByCode.DD_3MOISETPLUS.coefficient
      }
    },
    capacity: rules.capacity.map((rule) => ({
      min_passengers_exclusive: rule.minPassengersExclusive,
      max_passengers_inclusive: rule.maxPassengersInclusive,
      coefficient: rule.coefficient
    })),
    options: {
      guide_day_rate_eur: rules.optionRates.guideDayRateEur,
      driver_night_rate_eur: rules.optionRates.driverNightRateEur
    },
    margin_rate: rules.marginRate,
    vat_rate: rules.vatRate
  };
}

export function rawToPricingRules(version: string, raw: RawPricingMatrix): PricingRules {
  return {
    version,
    forfaitDistanceGrid: raw.forfait_distance_grid.map((row) => ({
      distanceKm: row.distance_km,
      priceEur: row.price_eur
    })),
    longDistanceRatePerKmPerLeg: raw.long_distance.price_per_km,
    seasonality: {
      low: raw.seasonality.low,
      medium: raw.seasonality.medium,
      high: raw.seasonality.high,
      veryHigh: raw.seasonality.very_high
    },
    leadTime: mapLeadTimeRules(raw),
    capacity: mapCapacityRules(raw),
    optionRates: {
      guideDayRateEur: raw.options?.guide_day_rate_eur ?? DEFAULT_OPTION_RATES.guideDayRateEur,
      driverNightRateEur: raw.options?.driver_night_rate_eur ?? DEFAULT_OPTION_RATES.driverNightRateEur
    },
    marginRate: raw.margin_rate,
    vatRate: raw.vat_rate
  };
}

function mapLeadTimeRules(raw: RawPricingMatrix): LeadTimePricingRule[] {
  return [
    {
      code: "DD_PRIORITAIRE",
      maxDaysInclusive: raw.departure_delay.priority.max_days_inclusive,
      coefficient: raw.departure_delay.priority.coefficient
    },
    {
      code: "DD_URGENT",
      minDaysExclusive: raw.departure_delay.urgent.min_days_exclusive,
      maxDaysInclusive: raw.departure_delay.urgent.max_days_inclusive,
      coefficient: raw.departure_delay.urgent.coefficient
    },
    {
      code: "DD_NORMAL",
      minDaysExclusive: raw.departure_delay.normal.min_days_exclusive,
      maxDaysInclusive: raw.departure_delay.normal.max_days_inclusive,
      coefficient: raw.departure_delay.normal.coefficient
    },
    {
      code: "DD_3MOISETPLUS",
      minDaysExclusive: raw.departure_delay.three_months_plus.min_days_exclusive,
      coefficient: raw.departure_delay.three_months_plus.coefficient
    }
  ];
}

function mapCapacityRules(raw: RawPricingMatrix): CapacityPricingRule[] {
  return raw.capacity.map((rule) => ({
    minPassengersExclusive: rule.min_passengers_exclusive,
    maxPassengersInclusive: rule.max_passengers_inclusive,
    coefficient: rule.coefficient,
    vehicleCode: getVehicleCode(rule.max_passengers_inclusive)
  }));
}

function getVehicleCode(maxPassengersInclusive: number): string {
  if (maxPassengersInclusive <= 19) return "MINIBUS_19";
  return `COACH_${maxPassengersInclusive}`;
}
