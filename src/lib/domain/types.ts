export type TripType = "one_way" | "round_trip";

export type DistanceSource = "seed" | "api" | "manual";

export type HumanReviewCode =
  | "PAX_ZERO_OR_NEGATIVE"
  | "PAX_OVER_85"
  | "INVALID_DATE"
  | "DEPARTURE_IN_PAST"
  | "UNKNOWN_ROUTE_NO_DISTANCE";

export type QuoteOptions = {
  guideDays?: number;
  driverNights?: number;
  tollsIncluded?: boolean;
  tollPackageEur?: number;
  // MVP requested-option flags (detected from the chat). They never carry a price; the
  // engine decides whether an official amount exists or the line is a placeholder.
  guide?: boolean;
  driverOvernight?: boolean;
  tolls?: boolean;
};

export type OptionPricingStatus = "PRICED" | "TO_CONFIRM" | "INCLUDED";

export type QuoteOptionLine = {
  code: string;
  label: string;
  // 0 € is only a technical placeholder when no official amount exists — see pricingStatus.
  amountEur: number;
  pricingStatus: OptionPricingStatus;
  note: string;
};

export type QuoteInput = {
  leadId?: string;
  departureCity?: string;
  arrivalCity?: string;
  departureDate: string;
  requestDate: string;
  tripType: TripType;
  passengerCount: number;
  distanceKm?: number;
  distanceSource?: DistanceSource;
  options?: QuoteOptions;
};

export type DistancePricingRule = {
  distanceKm: number;
  priceEur: number;
};

export type SeasonPricingRule = {
  months: number[];
  coefficient: number;
};

export type LeadTimePricingRule = {
  code: "DD_PRIORITAIRE" | "DD_URGENT" | "DD_NORMAL" | "DD_3MOISETPLUS";
  minDaysExclusive?: number;
  maxDaysInclusive?: number;
  coefficient: number;
};

export type CapacityPricingRule = {
  minPassengersExclusive?: number;
  maxPassengersInclusive: number;
  coefficient: number;
  vehicleCode: string;
};

export type PricingRules = {
  version: string;
  forfaitDistanceGrid: DistancePricingRule[];
  longDistanceRatePerKmPerLeg: number;
  seasonality: {
    low: SeasonPricingRule;
    medium: SeasonPricingRule;
    high: SeasonPricingRule;
    veryHigh: SeasonPricingRule;
  };
  leadTime: LeadTimePricingRule[];
  capacity: CapacityPricingRule[];
  optionRates: OptionRates;
  marginRate: number;
  vatRate: number;
};

export type OptionRates = {
  // Official supplément tariffs (Tableau 3). Guide is billed per day, driver per overnight.
  guideDayRateEur: number;
  driverNightRateEur: number;
};

export type QuoteBreakdown = {
  distance: {
    distanceKm: number;
    source?: DistanceSource;
    pricingMode: "forfait_grid" | "long_distance_formula";
    gridCeilingKm?: number;
    oneWayBaseEur: number;
  };
  trip: {
    type: TripType;
    multiplier: 1 | 2;
    baseAfterTripTypeEur: number;
  };
  coefficients: {
    seasonality: number;
    leadTime: number;
    capacity: number;
    total: number;
    amountEur: number;
  };
  options: {
    // Optional only for backward compatibility with quotes stored before option lines
    // existed; the engine always produces it.
    items?: QuoteOptionLine[];
    tollPackageEur: number;
    totalEur: number;
  };
  margin: {
    rate: number;
    amountEur: number;
  };
  vat: {
    rate: number;
    amountEur: number;
  };
  totals: {
    beforeMarginEur: number;
    priceHtEur: number;
    priceTtcEur: number;
  };
};

export type QuoteOutput = {
  quote_number: string;
  vehicle_code: string;
  price_ht: number;
  vat_rate: number;
  vat_amount: number;
  price_ttc: number;
  breakdown: QuoteBreakdown;
  deterministic_hash: string;
  matrices_version: string;
};

export type QuoteResult =
  | { ok: true; quote: QuoteOutput }
  | { ok: false; review: HumanReviewCode; message: string };
