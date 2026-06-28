import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { storedQuoteCalculation } from "@/shared/lib/quotes/storedQuoteCalculation";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Quote } from "@/shared/types/quote";

type QuoteRow = {
  id: string;
  lead_id: string | null;
  status: Quote["status"];
  calculation: Quote["calculation"] | null;
  quote_number: string | null;
  price_ht: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  tva_10pct: number | null;
  price_ttc: number | null;
  currency: string | null;
  breakdown: Record<string, unknown> | null;
  deterministic_hash: string | null;
  matrices_version: string | null;
};

function toQuote(row: QuoteRow): Quote | null {
  if (!row.lead_id) return null;

  return {
    id: row.id,
    leadId: row.lead_id,
    status: row.status,
    calculation:
      row.calculation ??
      storedQuoteCalculation({
        quoteNumber: row.quote_number,
        priceHt: row.price_ht,
        vatRate: row.vat_rate,
        vatAmount: row.vat_amount ?? row.tva_10pct,
        priceTtc: row.price_ttc,
        currency: row.currency,
        breakdown: row.breakdown,
        deterministicHash: row.deterministic_hash,
        matrixVersion: row.matrices_version,
      })
  };
}

function requireQuote(row: QuoteRow): Quote {
  const quote = toQuote(row);
  if (!quote) throw new Error("Quote is not linked to a lead.");
  return quote;
}

const quoteSelection =
  "id, lead_id, status, calculation, quote_number, price_ht, vat_rate, vat_amount, tva_10pct, price_ttc, currency, breakdown, deterministic_hash, matrices_version";

export async function createQuoteRecord(input: Parameters<typeof demoStore.createQuote>[0]) {
  if (shouldUseDemoData()) return demoStore.createQuote(input);

  const supabase = createSupabaseAdminClient();
  const { calculation } = input;
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      lead_id: input.leadId,
      status: input.status ?? "QUOTE_READY",
      price_ht: calculation.subtotal,
      vat_amount: calculation.vatAmount,
      price_ttc: calculation.totalAmount,
      currency: calculation.currency,
      breakdown: calculation.breakdown,
      calculation,
      deterministic_hash: calculation.deterministicHash
    })
    .select(quoteSelection)
    .single();

  if (error) throw error;
  return requireQuote(data as QuoteRow);
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
  return (data as QuoteRow[]).map(toQuote).filter((quote): quote is Quote => Boolean(quote));
}

export async function updateQuoteStatus(id: string, status: Quote["status"]) {
  if (!shouldUseDemoData()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("quotes")
      .update({ status })
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
