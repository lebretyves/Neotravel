import { z } from "zod";
import { createHumanReview } from "@/features/human-review/services/createHumanReview";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { updateLeadRecord } from "@/shared/lib/data/leadRepository";
import { getQuoteRecordById, updateQuoteStatus } from "@/shared/lib/data/quoteRepository";
import { AppError } from "@/shared/lib/utils/errors";

export const QuoteActionParamsSchema = z.object({
 quoteId: z.string().min(1)
});

export const QuoteChangeRequestSchema = z.object({
 message: z.string().min(1),
 requestedBy: z.string().optional()
});

async function requireQuote(quoteId: string) {
 const quote = await getQuoteRecordById(quoteId);
 if (!quote) throw new AppError("Devis introuvable.", "NOT_FOUND");
 return quote;
}

function assertQuoteActionable(status: string) {
 if (status === "ACCEPTED" || status === "REFUSED" || status === "CLOSED") {
  throw new AppError("Devis deja finalise.", "QUOTE_FINALIZED");
 }
}

export async function acceptQuote(quoteId: string) {
 const quote = await requireQuote(quoteId);
 assertQuoteActionable(quote.status);
 const updated = await updateQuoteStatus(quote.id, "ACCEPTED");
 await updateLeadRecord(quote.leadId, { status: "WON" });

 await createAuditLog({
  entityType: "quote",
  entityId: quote.id,
  action: "quote.accepted",
  actor: "user",
  input: { quoteId },
  output: { status: "ACCEPTED", leadStatus: "WON" },
  payload: { leadId: quote.leadId, status: "ACCEPTED", leadStatus: "WON" }
 });

 return updated;
}

export async function refuseQuote(quoteId: string) {
 const quote = await requireQuote(quoteId);
 assertQuoteActionable(quote.status);
 const updated = await updateQuoteStatus(quote.id, "REFUSED");
 await updateLeadRecord(quote.leadId, { status: "LOST" });

 await createAuditLog({
  entityType: "quote",
  entityId: quote.id,
  action: "quote.refused",
  actor: "user",
  input: { quoteId },
  output: { status: "REFUSED", leadStatus: "LOST" },
  payload: { leadId: quote.leadId, status: "REFUSED", leadStatus: "LOST" }
 });

 return updated;
}

export async function requestQuoteChange(quoteId: string, input: z.infer<typeof QuoteChangeRequestSchema>) {
 const quote = await requireQuote(quoteId);
 assertQuoteActionable(quote.status);
 await updateLeadRecord(quote.leadId, {
  status: "HUMAN_REVIEW",
  humanReviewReason: "QUOTE_CHANGE_REQUEST"
 });
 const review = await createHumanReview({
  leadId: quote.leadId,
  rawMessage: input.message,
  reason: "QUOTE_CHANGE_REQUEST",
  reasons: ["QUOTE_CHANGE_REQUEST"]
 });

 await createAuditLog({
  entityType: "quote",
  entityId: quote.id,
  action: auditActions.humanReviewCreated,
  actor: "user",
  input: { quoteId, ...input },
  output: { status: "HUMAN_REVIEW" },
  payload: {
   leadId: quote.leadId,
   status: "HUMAN_REVIEW",
   reason: "QUOTE_CHANGE_REQUEST"
  }
 });

 return {
  quoteId,
  leadId: quote.leadId,
  status: "HUMAN_REVIEW",
  review
 };
}
