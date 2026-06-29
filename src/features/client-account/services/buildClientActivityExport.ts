import type { ClientSession } from "@/shared/lib/auth/requireClient";
import { listLeads } from "@/shared/lib/data/leadRepository";
import { listQuotes } from "@/shared/lib/data/quoteRepository";
import { quoteOutcomeDisplay } from "@/features/dashboard/services/quoteOutcome";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import { getClientAccountData } from "./getClientAccountData";

export type ClientExportOptions = {
  includeDemands: boolean;
  includeQuotes: boolean;
  includeMessages: boolean;
};

function belongsToClient(lead: Lead, session: ClientSession) {
  const emailMatch =
    lead.email && session.email && lead.email.toLowerCase() === session.email.toLowerCase();
  const orgMatch =
    session.client.organization &&
    lead.organization &&
    lead.organization.toLowerCase() === session.client.organization.toLowerCase();
  return Boolean(emailMatch || orgMatch);
}

function serializeLead(lead: Lead) {
  return {
    id: lead.id,
    reference: `DMD-${lead.id.slice(0, 8).toUpperCase()}`,
    status: lead.status,
    clientType: lead.clientType ?? null,
    contactName: lead.contactName ?? null,
    organization: lead.organization ?? null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    departureCity: lead.departureCity,
    arrivalCity: lead.arrivalCity,
    departureDate: lead.departureDate,
    returnDate: lead.returnDate,
    passengerCount: lead.passengerCount,
    tripType: lead.tripType,
    hasIntermediateStop: lead.hasIntermediateStop ?? false,
    intermediateStops: lead.intermediateStops ?? [],
    options: lead.options ?? [],
    createdAt: lead.createdAt ?? null,
    updatedAt: lead.updatedAt ?? null,
  };
}

function serializeQuote(quote: Quote, lead: Lead | undefined) {
  const outcome = quoteOutcomeDisplay(quote, lead);
  return {
    id: quote.id,
    leadId: quote.leadId,
    reference: quote.calculation.quoteNumber,
    status: quote.status,
    statusLabel: outcome.label,
    route:
      lead?.departureCity && lead?.arrivalCity
        ? `${lead.departureCity} -> ${lead.arrivalCity}`
        : null,
    departureDate: lead?.departureDate ?? null,
    passengerCount: lead?.passengerCount ?? null,
    priceHt: quote.calculation.priceHt,
    priceTtc: quote.calculation.priceTtc,
    currency: quote.calculation.currency,
    pdfUrl: `/api/quotes/${quote.id}/pdf`,
    clientViewUrl: `/client/devis/${quote.id}`,
    createdAt: quote.createdAt ?? null,
    updatedAt: quote.updatedAt ?? null,
  };
}

export async function buildClientActivityExport(session: ClientSession, options: ClientExportOptions) {
  const [allLeads, allQuotes, accountData] = await Promise.all([
    listLeads(),
    listQuotes(),
    getClientAccountData(session),
  ]);

  const leads = allLeads
    .filter((lead) => belongsToClient(lead, session))
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime());

  const leadIds = new Set(leads.map((lead) => lead.id));
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));

  const quotes = allQuotes
    .filter((quote) => leadIds.has(quote.leadId))
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime());

  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    format: "neotravel-client-export-v1",
    account: {
      id: session.client.id,
      email: session.client.email,
      displayName: session.name,
      organization: session.client.organization ?? null,
      contactName: session.client.contactName ?? null,
      phone: session.client.phone ?? null,
    },
  };

  if (options.includeDemands) {
    payload.demands = leads.map(serializeLead);
  }

  if (options.includeQuotes) {
    payload.quotes = quotes.map((quote) => serializeQuote(quote, leadById.get(quote.leadId)));
  }

  if (options.includeMessages) {
    payload.messages = accountData.activity.map((row) => ({
      date: row[0],
      subject: row[1],
      status: row[2],
      detail: row[3],
    }));
  }

  return payload;
}
