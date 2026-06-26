import { z } from "zod";

import { logAuditEvent } from "@/lib/audit/audit-service";
import { markHumanReview, updateLeadStatus } from "@/lib/leads/lead-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppError } from "@/shared/lib/utils/errors";
import { triggerSendQuote } from "@/shared/lib/n8n/triggerSendQuote";

export const QuoteActionParamsSchema = z.object({
  quoteId: z.string().uuid(),
});

export const QuoteChangeRequestSchema = z.object({
  message: z.string().min(1),
  requestedBy: z.string().optional(),
});

type StoredQuote = {
  id: string;
  lead_id: string | null;
  status: "QUOTE_READY" | "QUOTE_SENT" | "CLOSED";
  quote_number?: string;
  price_ttc?: number;
};

async function requireQuote(quoteId: string): Promise<StoredQuote> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("id, lead_id, status, quote_number, price_ttc")
    .eq("id", quoteId)
    .maybeSingle();

  if (error) throw new AppError("Lecture du devis impossible.", "NOT_FOUND");
  if (!data?.lead_id) throw new AppError("Devis introuvable.", "NOT_FOUND");

  return data as StoredQuote;
}

function assertQuoteActionable(status: StoredQuote["status"]) {
  if (status === "CLOSED") {
    throw new AppError("Devis déjà finalisé.", "QUOTE_FINALIZED");
  }
}

async function closeQuote(quoteId: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("quotes").update({ status: "CLOSED" }).eq("id", quoteId);

  if (error) throw new AppError("Mise à jour du devis impossible.", "NOT_FOUND");
}

export async function acceptQuote(quoteId: string) {
  const quote = await requireQuote(quoteId);
  assertQuoteActionable(quote.status);
  await closeQuote(quote.id);
  await updateLeadStatus(quote.lead_id!, "WON", { quoteId: quote.id });
  await logAuditEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "QUOTE_ACCEPTED",
    metadata: { leadId: quote.lead_id },
  });

  // Load the lead's email via the clients join (email is in clients, not leads)
  const supabase = createServerSupabaseClient();
  const { data: leadData } = await supabase
    .from("leads")
    .select("clients(email)")
    .eq("id", quote.lead_id!)
    .maybeSingle();
  const clientRow = (leadData as { clients?: { email?: string | null } | { email?: string | null }[] | null } | null)?.clients;
  const email = (Array.isArray(clientRow) ? clientRow[0]?.email : clientRow?.email) ?? null;

  if (email && quote.quote_number) {
    const priceTtc = quote.price_ttc ?? 0;
    const formatted = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(priceTtc);
    const preview = `Devis NeoTravel N° ${quote.quote_number} — ${formatted} TTC`;
    triggerSendQuote({ quote_id: quote.id, email, preview, scheduled_at: new Date().toISOString() }).catch(() => {});
  }

  return { id: quote.id, leadId: quote.lead_id, status: "CLOSED", email };
}

export async function refuseQuote(quoteId: string) {
  const quote = await requireQuote(quoteId);
  assertQuoteActionable(quote.status);
  await closeQuote(quote.id);
  await updateLeadStatus(quote.lead_id!, "LOST", { quoteId: quote.id });
  await logAuditEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "QUOTE_REFUSED",
    metadata: { leadId: quote.lead_id },
  });

  return { id: quote.id, leadId: quote.lead_id, status: "CLOSED" };
}

export async function requestQuoteChange(
  quoteId: string,
  input: z.infer<typeof QuoteChangeRequestSchema>,
) {
  const quote = await requireQuote(quoteId);
  assertQuoteActionable(quote.status);
  await markHumanReview(quote.lead_id!, "QUOTE_CHANGE_REQUEST");
  await logAuditEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "QUOTE_CHANGE_REQUESTED",
    metadata: {
      leadId: quote.lead_id,
      requestedBy: input.requestedBy,
      messageLength: input.message.length,
    },
  });

  return { quoteId, leadId: quote.lead_id, status: "HUMAN_REVIEW" };
}
