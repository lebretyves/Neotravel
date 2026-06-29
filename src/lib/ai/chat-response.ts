export type ChatApiStatus =
  | "INCOMPLETE"
  | "HUMAN_REVIEW"
  | "QUOTE_READY"
  | "QUALIFIED"
  | "ERROR";

export type QuoteBreakdownData = {
  distance?: {
    distanceKm: number;
    source?: string;
    pricingMode: "forfait_grid" | "long_distance_formula";
    gridCeilingKm?: number;
    oneWayBaseEur: number;
  };
  trip?: {
    type: string;
    multiplier: 1 | 2;
    baseAfterTripTypeEur: number;
  };
  coefficients?: {
    seasonality: number;
    leadTime: number;
    capacity: number;
    total: number;
    amountEur: number;
  };
  options?: {
    tollPackageEur: number;
    totalEur: number;
  };
  margin?: {
    rate: number;
    amountEur: number;
  };
  vat?: {
    rate: number;
    amountEur: number;
  };
  totals?: {
    beforeMarginEur: number;
    priceHtEur: number;
    priceTtcEur: number;
  };
};

export type QuoteSummary = {
  quoteNumber: string;
  vehicleCode: string;
  distanceKm: number;
  priceHt: number;
  vatAmount: number;
  priceTtc: number;
  departureCity?: string;
  arrivalCity?: string;
  departureDate?: string;
  passengerCount?: number;
  breakdown?: QuoteBreakdownData;
};

export type ExtractedFields = {
  clientType: string | null;
  contactName: string | null;
  organization: string | null;
  departureCity: string | null;
  arrivalCity: string | null;
  departureDate: string | null;
  returnDate: string | null;
  passengerCount: number | null;
  tripType: "one_way" | "round_trip" | null;
  email: string | null;
  phone: string | null;
  options: string[];
  // Options removed by the user this turn ("enlève mon guide"). The front clears them from
  // its selection — a union-only merge could never drop an already-chosen option.
  removedOptions: string[];
  multiDestination: boolean;
  stops: string[];
};

export type LeadWarningCode =
  | "DEPARTURE_DATE_INVALID"
  | "DEPARTURE_DATE_PAST"
  | "RETURN_BEFORE_DEPARTURE"
  | "PASSENGER_COUNT_INVALID";

export type LeadWarningField = "departureDate" | "returnDate" | "passengerCount";

export type LeadWarning = {
  field: LeadWarningField;
  code: LeadWarningCode;
  message: string;
  blocking: boolean;
};

export type ChatApiResponse = {
  status: ChatApiStatus;
  message: string;
  leadId?: string;
  quoteId?: string;
  missingFields?: string[];
  reviewReason?: string;
  quote?: QuoteSummary;
  extractedFields?: ExtractedFields;
  warnings?: LeadWarning[];
};

export function chatJson(response: ChatApiResponse, init?: ResponseInit): Response {
  return Response.json(response, init);
}
