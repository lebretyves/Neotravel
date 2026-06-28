import type { PricingResult } from "./pricing";

export type QuoteCalculation = {
  baseAmount: number;
  passengerAmount: number;
  optionsAmount: number;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  currency: "EUR";
  quoteNumber: string;
  priceHt: number;
  vatRate: number;
  priceTtc: number;
  deterministicHash: string;
  basePriceSource: PricingResult["basePriceSource"];
  distanceKm: number;
  breakdown: PricingResult["breakdown"];
  coefficients: {
    season: number;
    urgency: number;
    capacity: number;
    multiplier: number;
  };
  lines: Array<{
    label: string;
    amount: number;
  }>;
};

export type Quote = {
  id: string;
  leadId: string;
  calculation: QuoteCalculation;
  status: "QUOTE_READY" | "QUOTE_SENT" | "ACCEPTED" | "REFUSED" | "CLOSED";
  createdAt?: string | null;
  updatedAt?: string | null;
};
