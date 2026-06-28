import { createServerSupabaseClient } from "@/lib/supabase/server";
import { storedQuoteCalculation } from "@/shared/lib/quotes/storedQuoteCalculation";
import type { Quote } from "@/shared/types/quote";

export async function getQuoteById(quoteId: string): Promise<Quote | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, lead_id, quote_number, price_ht, vat_rate, vat_amount, tva_10pct, price_ttc, currency, breakdown, deterministic_hash, matrices_version, status, calculation",
    )
    .eq("id", quoteId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load quote: ${error.message}`);
  if (!data || !data.lead_id) return null;

  return {
    id: data.id,
    leadId: data.lead_id,
    status: data.status as Quote["status"],
    calculation:
      (data.calculation as Quote["calculation"] | null) ??
      storedQuoteCalculation({
        quoteNumber: data.quote_number,
        priceHt: data.price_ht,
        vatRate: data.vat_rate,
        vatAmount: data.vat_amount ?? data.tva_10pct,
        priceTtc: data.price_ttc,
        currency: data.currency,
        breakdown: data.breakdown,
        deterministicHash: data.deterministic_hash,
        matrixVersion: data.matrices_version,
      }),
  };
}
