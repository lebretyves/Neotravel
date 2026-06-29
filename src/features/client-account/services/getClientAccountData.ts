import type { ClientSession } from "@/shared/lib/auth/requireClient";
import { listLeads } from "@/shared/lib/data/leadRepository";
import { listQuotes } from "@/shared/lib/data/quoteRepository";
import { quoteOutcomeDisplay } from "@/features/dashboard/services/quoteOutcome";
import type { Client } from "@/shared/types/client";
import type { Lead, LeadStatus } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";

export type ClientAccountTableRow = [string, string, string, string];

export type ClientAccountQuoteRow = {
  id: string;
  reference: string;
  route: string;
  amountLabel: string;
  statusLabel: string;
  href: string;
};

export type ClientAccountLeadRow = {
  id: string;
  reference: string;
  route: string;
  statusLabel: string;
  dateLabel: string;
};

export type ClientAccountData = {
  client: Client;
  displayName: string;
  leads: ClientAccountLeadRow[];
  quotes: ClientAccountQuoteRow[];
  stats: {
    demandCount: number;
    activeDemandCount: number;
    quoteCount: number;
    pendingQuoteCount: number;
    nextActionLabel: string;
    nextActionDetail: string;
  };
  latestQuote: ClientAccountQuoteRow | null;
  activity: ClientAccountTableRow[];
};

const ACTIVE_LEAD_STATUSES = new Set<LeadStatus>([
  "NEW",
  "INCOMPLETE",
  "QUALIFIED",
  "HIGH_VALUE",
  "HUMAN_REVIEW",
  "QUOTE_READY",
  "QUOTE_SENT",
  "FOLLOWUP_1",
  "FOLLOWUP_2",
  "FOLLOWUP_SCHEDULED"
]);

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Nouvelle",
  INCOMPLETE: "Incomplète",
  QUALIFIED: "Qualifiée",
  HIGH_VALUE: "Prioritaire",
  HUMAN_REVIEW: "Revue humaine",
  QUOTE_READY: "Devis prêt",
  QUOTE_SENT: "Devis envoyé",
  FOLLOWUP_1: "Relance J+2",
  FOLLOWUP_2: "Relance J+7",
  FOLLOWUP_SCHEDULED: "Relance programmée",
  WON: "Gagnée",
  LOST: "Perdue",
  CLOSED: "Clôturée"
};

function formatDate(value: string | null | undefined) {
  if (!value) return "À confirmer";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function routeLabel(lead: Lead) {
  if (lead.departureCity && lead.arrivalCity) return `${lead.departureCity} -> ${lead.arrivalCity}`;
  return "Trajet à confirmer";
}

function leadReference(lead: Lead) {
  return `DMD-${lead.id.slice(0, 8).toUpperCase()}`;
}

function belongsToClient(lead: Lead, session: ClientSession) {
  const emailMatch =
    lead.email && session.email && lead.email.toLowerCase() === session.email.toLowerCase();
  const orgMatch =
    session.client.organization &&
    lead.organization &&
    lead.organization.toLowerCase() === session.client.organization.toLowerCase();
  return Boolean(emailMatch || orgMatch);
}

function mapLeadRow(lead: Lead): ClientAccountLeadRow {
  return {
    id: lead.id,
    reference: leadReference(lead),
    route: routeLabel(lead),
    statusLabel: LEAD_STATUS_LABELS[lead.status] ?? lead.status,
    dateLabel: formatDate(lead.departureDate ?? lead.updatedAt ?? lead.createdAt)
  };
}

function mapQuoteRow(quote: Quote, lead: Lead | undefined): ClientAccountQuoteRow {
  const outcome = quoteOutcomeDisplay(quote, lead);
  return {
    id: quote.id,
    reference: quote.calculation.quoteNumber,
    route: lead ? routeLabel(lead) : "Trajet lié",
    amountLabel: `${formatEuro(quote.calculation.priceTtc)} TTC`,
    statusLabel: outcome.label,
    href: `/client/devis/${quote.id}`
  };
}

function buildActivity(leads: Lead[], quotes: Quote[], quoteRows: ClientAccountQuoteRow[]): ClientAccountTableRow[] {
  const quoteRowById = new Map(quoteRows.map((row) => [row.id, row]));
  const events: Array<{ at: number; row: ClientAccountTableRow }> = [];

  for (const quote of quotes) {
    const row = quoteRowById.get(quote.id);
    if (!row) continue;
    const stamp = quote.updatedAt ?? quote.createdAt;
    events.push({
      at: stamp ? new Date(stamp).getTime() : 0,
      row: [formatDate(stamp), `Devis ${row.reference}`, row.statusLabel, row.amountLabel]
    });
  }

  for (const lead of leads) {
    const stamp = lead.updatedAt ?? lead.createdAt;
    events.push({
      at: stamp ? new Date(stamp).getTime() : 0,
      row: [formatDate(stamp), `Demande ${leadReference(lead)}`, LEAD_STATUS_LABELS[lead.status], routeLabel(lead)]
    });
  }

  return events
    .sort((a, b) => b.at - a.at)
    .slice(0, 6)
    .map((event) => event.row);
}

export async function getClientAccountData(session: ClientSession): Promise<ClientAccountData> {
  const [allLeads, allQuotes] = await Promise.all([listLeads(), listQuotes()]);

  const leads = allLeads.filter((lead) => belongsToClient(lead, session)).sort((a, b) => {
    const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });

  const leadIds = new Set(leads.map((lead) => lead.id));
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));

  const clientQuotes = allQuotes
    .filter((quote) => leadIds.has(quote.leadId))
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });

  const quotes = clientQuotes.map((quote) => mapQuoteRow(quote, leadById.get(quote.leadId)));

  const activeDemandCount = leads.filter((lead) => ACTIVE_LEAD_STATUSES.has(lead.status)).length;
  const pendingQuoteCount = quotes.filter(
    (quote) => quote.statusLabel === "Prêt" || quote.statusLabel === "Envoyé"
  ).length;

  const latestQuote = quotes[0] ?? null;
  const nextActionLabel = pendingQuoteCount > 0 ? "Validation" : activeDemandCount > 0 ? "Suivi" : "Aucune";
  const nextActionDetail = latestQuote?.reference ?? (leads[0] ? leadReference(leads[0]) : "—");

  return {
    client: session.client,
    displayName: session.name,
    leads: leads.map(mapLeadRow),
    quotes,
    stats: {
      demandCount: leads.length,
      activeDemandCount,
      quoteCount: quotes.length,
      pendingQuoteCount,
      nextActionLabel,
      nextActionDetail
    },
    latestQuote,
    activity: buildActivity(leads, clientQuotes, quotes)
  };
}
