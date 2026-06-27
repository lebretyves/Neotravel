import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Quote } from "@/shared/types/quote";

type QuoteRow = {
 id: string;
 lead_id: string;
 status: Quote["status"] | "CLOSED";
 quote_number?: string | null;
 price_ht?: number | null;
 vat_amount?: number | null;
 tva_10pct?: number | null;
 price_ttc?: number | null;
 currency?: "EUR" | null;
 deterministic_hash?: string | null;
 distance_km?: number | null;
 breakdown?: Quote["calculation"]["breakdown"] | null;
 calculation?: Quote["calculation"] | null;
 created_at?: string | null;
};

function toDatabaseQuoteStatus(status: Quote["status"]) {
 if (status === "ACCEPTED" || status === "REFUSED") return "CLOSED";
 return status;
}

function fallbackCalculation(row: QuoteRow): Quote["calculation"] {
 const priceTtc = Number(row.price_ttc ?? 0);
 const priceHt = Number(row.price_ht ?? priceTtc);
 const vatAmount = Number(row.vat_amount ?? row.tva_10pct ?? Math.max(0, priceTtc - priceHt));
 const breakdown = row.breakdown ?? {
  routeLabel: "Route non renseignee",
  matrixVersion: "claudio",
  distanceKm: Number(row.distance_km ?? 0),
  basePriceSource: "route_pricing",
  vehicleCode: "standard",
  vehicleLabel: "Autocar",
  transferPricingMode: "flat_rate_under_180km",
  formulaLabel: "Base Claudio",
  basePriceEur: priceHt,
  options: [],
  optionsTotal: 0,
  subtotal: priceHt,
  seasonCoeff: 1,
  urgencyCoeff: 1,
  capacityCoeff: 1,
  coeffMultiplier: 1,
  afterCoeff: priceHt,
  margin: 0,
  vatAmount
 };

 return {
  baseAmount: breakdown.basePriceEur,
  passengerAmount: 0,
  optionsAmount: breakdown.optionsTotal,
  subtotal: breakdown.subtotal,
  vatAmount,
  totalAmount: priceTtc,
  currency: row.currency ?? "EUR",
  quoteNumber: row.quote_number ?? row.id,
  priceHt,
  vatRate: priceHt > 0 ? vatAmount / priceHt : 0.1,
  priceTtc,
  deterministicHash: row.deterministic_hash ?? row.id,
  basePriceSource: breakdown.basePriceSource,
  distanceKm: breakdown.distanceKm,
  breakdown,
  coefficients: {
   season: breakdown.seasonCoeff,
   urgency: breakdown.urgencyCoeff,
   capacity: breakdown.capacityCoeff,
   multiplier: breakdown.coeffMultiplier
  },
  lines: []
 };
}

function toQuote(row: QuoteRow): Quote {
 return {
  id: row.id,
  leadId: row.lead_id,
  status: row.status,
  calculation: row.calculation ?? fallbackCalculation(row),
  createdAt: row.created_at ?? undefined,
  updatedAt: null
 };
}

const quoteSelection =
 "id, lead_id, status, quote_number, price_ht, vat_amount, tva_10pct, price_ttc, currency, deterministic_hash, distance_km, breakdown, calculation, created_at";

export async function createQuoteRecord(input: Parameters<typeof demoStore.createQuote>[0]) {
 if (shouldUseDemoData()) return demoStore.createQuote(input);

 const supabase = createSupabaseAdminClient();
 const { calculation } = input;
 const { data, error } = await supabase
  .from("quotes")
  .insert({
   lead_id: input.leadId,
   status: toDatabaseQuoteStatus(input.status ?? "QUOTE_READY"),
   quote_number: calculation.quoteNumber,
   price_ht: calculation.subtotal,
   vat_amount: calculation.vatAmount,
   tva_10pct: calculation.vatAmount,
   price_ttc: calculation.totalAmount,
   currency: calculation.currency,
   breakdown: calculation.breakdown,
   calculation,
   deterministic_hash: calculation.deterministicHash,
   distance_km: calculation.distanceKm,
   distance_source: calculation.basePriceSource === "route_pricing" ? "seed" : "manual",
   matrices_version: calculation.breakdown.matrixVersion
  })
  .select(quoteSelection)
  .single();

 if (error) throw error;
 return toQuote(data as QuoteRow);
}

export async function getQuoteRecordById(id: string) {
 if (shouldUseDemoData()) return demoStore.getQuoteById(id);

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("quotes")
  .select(quoteSelection)
  .eq("id", id)
  .maybeSingle();

 if (error) throw error;
 return data ? toQuote(data as QuoteRow) : null;
}

export async function listQuotes() {
 if (shouldUseDemoData()) return demoStore.listQuotes();

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("quotes")
  .select(quoteSelection)
  .order("created_at", { ascending: false });

 if (error) throw error;
 return (data as QuoteRow[]).map(toQuote);
}

export async function updateQuoteStatus(id: string, status: Quote["status"]) {
 if (!shouldUseDemoData()) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
   .from("quotes")
   .update({ status: toDatabaseQuoteStatus(status) })
   .eq("id", id)
   .select(quoteSelection)
   .single();

  if (error) throw error;
  return toQuote(data as QuoteRow);
 }

 const quote = demoStore.getQuoteById(id);
 if (!quote) return null;
 quote.status = status;
 return quote;
}
