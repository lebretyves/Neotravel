import { getAuditLogs } from "@/features/admin/services/getAuditLogs";
import { getModelRuns } from "@/features/admin/services/getModelRuns";
import { listFollowups, listLeads, listQuotes } from "@/shared/lib/data";
import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";

export type GrowthPeriodKey = "today" | "7d" | "30d" | "month" | "custom";

export type GrowthFilters = {
 period?: GrowthPeriodKey;
 from?: string;
 to?: string;
 source?: string;
 status?: string;
 urgency?: string;
 clientType?: string;
};

type GrowthAlertSeverity = "info" | "warning" | "critical";

export type GrowthDashboardData = {
 period: {
  from: string;
  to: string;
  label: string;
 };
 filters: Required<Omit<GrowthFilters, "from" | "to">> & { from: string; to: string };
 kpis: {
  requestsReceived: number;
  requestsEvolutionRate: number | null;
  qualifiedLeads: number;
  qualificationRate: number;
  averageLeadToQuoteMinutes: number | null;
  quotesGenerated: number;
  quotesAmount: number;
  conversionRate: number;
  potentialRevenue: number;
  wonRevenue: number;
  overdueFollowups: number;
 };
 funnel: Array<{
  stage: string;
  volume: number;
  stepConversionRate: number;
  globalConversionRate: number;
  revenue: number;
  averageDelayMinutes: number | null;
  href?: string;
 }>;
 performance: {
  quoteSentRate: number;
  quoteAcceptedRate: number;
  averageQuoteAmount: number;
  averageWonAmount: number;
  hotLeads: number;
  leadsWithoutAction24h: number;
  humanReviewCount: number;
 };
 reactivity: {
  averageFirstResponseMinutes: number | null;
  averageQualificationMinutes: number | null;
  averageQuoteGenerationMinutes: number | null;
  fastHandledLeads: number;
  pendingQualification: number;
  pendingQuoteSend: number;
 };
 followups: {
  planned: number;
  sent: number;
  overdue: number;
  urgentJ2: number;
  finalJ7: number;
  completionRate: number;
  responseAfterFollowupRate: number | null;
  items: Array<{
   id: string;
   client: string;
   quoteReference: string;
   type: string;
   dueAt: string;
   status: string;
   href: string;
  }>;
 };
 sources: Array<{
  source: string;
  volume: number;
  qualificationRate: number;
  conversionRate: number;
  potentialRevenue: number;
  wonRevenue: number;
 }>;
 alerts: Array<{
  id: string;
  type: string;
  label: string;
  severity: GrowthAlertSeverity;
  message: string;
  targetType: "lead" | "quote" | "followup";
  targetId: string;
  href?: string;
  actionLabel: string;
  disabledReason?: string;
 }>;
 automationGain: {
  automatedStandardLeads: number;
  automatedFollowupsSent: number;
  estimatedHoursSaved: number;
  estimatedAiCost: number;
  averageAiCostPerQuote: number | null;
  avoidedHumanReviews: number | null;
 };
 charts: {
  evolution: Array<{ label: string; requests: number; quotes: number }>;
  statusDistribution: Array<{ label: string; value: number; tone: "blue" | "green" | "gold" | "red" }>;
 };
 empty: boolean;
 limitations: string[];
};

export type GrowthMetricKey =
 | "requests_received"
 | "qualified_leads"
 | "quotes_generated"
 | "quotes_sent"
 | "quotes_accepted"
 | "potential_revenue"
 | "won_revenue"
 | "followups_planned"
 | "followups_sent"
 | "followups_overdue"
 | "conversion_rate"
 | "average_lead_to_quote_minutes";

export type GrowthChartType = "line" | "bar" | "pie" | "funnel";
export type GrowthGroupBy = "day" | "week" | "month" | "source" | "status" | "client_type";

export type GrowthChartFilters = GrowthFilters & {
 metric?: GrowthMetricKey;
 groupBy?: GrowthGroupBy;
 chartType?: GrowthChartType;
};

export type GrowthChartData = {
 metric: GrowthMetricKey;
 period: GrowthPeriodKey;
 groupBy: GrowthGroupBy;
 chartType: GrowthChartType;
 data: Array<{ label: string; value: number }>;
 empty: boolean;
 note?: string;
};

export type GrowthDetailsFilters = GrowthFilters & {
 metric?: GrowthMetricKey;
};

export type GrowthDetailsData = {
 metric: GrowthMetricKey;
 period: GrowthPeriodKey;
 data: Array<{
  id: string;
  date: string;
  client: string;
  source: string;
  status: string;
  quoteReference: string;
  amount: number | null;
  lastAction: string;
  nextFollowup: string | null;
  href: string;
  action: string;
 }>;
 empty: boolean;
 note?: string;
};

const QUALIFIED_STATUSES = new Set(["QUALIFIED", "HIGH_VALUE", "QUOTE_READY", "QUOTE_SENT", "FOLLOWUP_1", "FOLLOWUP_2", "FOLLOWUP_SCHEDULED", "WON"]);
const SENT_QUOTE_STATUSES = new Set(["QUOTE_SENT", "ACCEPTED", "REFUSED"]);
const WON_QUOTE_STATUSES = new Set(["ACCEPTED"]);
const LOST_QUOTE_STATUSES = new Set(["REFUSED"]);

// Finalized quotes are stored as CLOSED; the won/lost truth lives on the lead (WON/LOST).
// Reflect the lead outcome back onto the quote status so every metric below is correct
// against real Supabase data (demo ACCEPTED/REFUSED fixtures pass through unchanged).
function applyLeadOutcome(quotes: Quote[], leads: Lead[]): Quote[] {
 const statusByLead = new Map(leads.map((lead) => [lead.id, lead.status]));
 return quotes.map((quote) => {
  const leadStatus = statusByLead.get(quote.leadId);
  if (leadStatus === "WON") return { ...quote, status: "ACCEPTED" as const };
  if (leadStatus === "LOST") return { ...quote, status: "REFUSED" as const };
  return quote;
 });
}
const GROWTH_METRICS: GrowthMetricKey[] = [
 "requests_received",
 "qualified_leads",
 "quotes_generated",
 "quotes_sent",
 "quotes_accepted",
 "potential_revenue",
 "won_revenue",
 "followups_planned",
 "followups_sent",
 "followups_overdue",
 "conversion_rate",
 "average_lead_to_quote_minutes"
];
const GROWTH_GROUPS: GrowthGroupBy[] = ["day", "week", "month", "source", "status", "client_type"];
const GROWTH_CHART_TYPES: GrowthChartType[] = ["line", "bar", "pie", "funnel"];

function isoDate(date: Date) {
 return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
 const copy = new Date(date);
 copy.setHours(0, 0, 0, 0);
 return copy;
}

function endOfDay(date: Date) {
 const copy = new Date(date);
 copy.setHours(23, 59, 59, 999);
 return copy;
}

function parsePeriod(filters: GrowthFilters) {
 const now = new Date();
 const period = filters.period ?? "30d";
 let from = new Date(now);
 let to = endOfDay(now);
 let label = "30 derniers jours";

 if (period === "today") {
  from = startOfDay(now);
  label = "Aujourd'hui";
 } else if (period === "7d") {
  from.setDate(now.getDate() - 6);
  from = startOfDay(from);
  label = "7 derniers jours";
 } else if (period === "month") {
  from = new Date(now.getFullYear(), now.getMonth(), 1);
  label = "Mois en cours";
 } else if (period === "custom" && filters.from && filters.to) {
  from = startOfDay(new Date(filters.from));
  to = endOfDay(new Date(filters.to));
  label = "Periode personnalisee";
 } else {
  from.setDate(now.getDate() - 29);
  from = startOfDay(from);
 }

 return { from, to, label, key: period };
}

function dateOrNull(value?: string | null) {
 if (!value) return null;
 const date = new Date(value);
 return Number.isNaN(date.getTime()) ? null : date;
}

function leadDate(lead: Lead) {
 return dateOrNull(lead.createdAt) ?? dateOrNull(lead.updatedAt) ?? dateOrNull(lead.departureDate);
}

function quoteDate(quote: Quote, lead?: Lead) {
 return dateOrNull(quote.createdAt) ?? dateOrNull(quote.updatedAt) ?? (lead ? leadDate(lead) : null);
}

function followupDate(followup: Followup) {
 return dateOrNull(followup.createdAt) ?? dateOrNull(followup.dueAt);
}

function inRange(date: Date | null, from: Date, to: Date) {
 if (!date) return true;
 return date >= from && date <= to;
}

function percent(part: number, total: number) {
 if (total <= 0) return 0;
 return Math.round((part / total) * 100);
}

function average(values: number[]) {
 const usable = values.filter((value) => Number.isFinite(value) && value >= 0);
 if (usable.length === 0) return null;
 return Math.round(usable.reduce((sum, value) => sum + value, 0) / usable.length);
}

function minutesBetween(from: Date | null, to: Date | null) {
 if (!from || !to || to < from) return null;
 return Math.round((to.getTime() - from.getTime()) / 60000);
}

function quoteAmount(quote: Quote) {
 return quote.calculation.priceTtc ?? quote.calculation.totalAmount ?? 0;
}

function leadClient(lead?: Lead) {
 return lead?.organization ?? lead?.email ?? "Client non renseigne";
}

function leadSource(lead: Lead) {
 return lead.source?.trim() || "Non renseigne";
}

function isUrgentLead(lead: Lead) {
 return lead.status === "HIGH_VALUE" || lead.status === "HUMAN_REVIEW" || (lead.confidence ?? 1) < 0.55;
}

function isCompleteLead(lead: Lead) {
 return lead.status !== "INCOMPLETE" && (lead.missingFields?.length ?? 0) === 0;
}

function statusMatches(lead: Lead, quotes: Quote[], followups: Followup[], status: string) {
 if (!status || status === "all") return true;
 if (status === "qualified") return QUALIFIED_STATUSES.has(lead.status);
 if (status === "quote_sent") return quotes.some((quote) => quote.leadId === lead.id && SENT_QUOTE_STATUSES.has(quote.status));
 if (status === "accepted") return quotes.some((quote) => quote.leadId === lead.id && WON_QUOTE_STATUSES.has(quote.status)) || lead.status === "WON";
 if (status === "refused") return quotes.some((quote) => quote.leadId === lead.id && LOST_QUOTE_STATUSES.has(quote.status)) || lead.status === "LOST";
 if (status === "followup_pending") return followups.some((followup) => followup.leadId === lead.id && followup.status === "SCHEDULED");
 if (status === "human_review") return lead.status === "HUMAN_REVIEW";
 return true;
}

function evolutionBuckets(from: Date, to: Date) {
 const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
 const bucketCount = Math.min(days, 14);
 const bucketSize = Math.ceil(days / bucketCount);
 return Array.from({ length: bucketCount }, (_, index) => {
  const start = new Date(from);
  start.setDate(from.getDate() + index * bucketSize);
  const end = new Date(start);
  end.setDate(start.getDate() + bucketSize - 1);
  return {
   start,
   end: endOfDay(end > to ? to : end),
   label: start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
  };
 }).filter((bucket) => bucket.start <= to);
}

function actionDate(logs: Awaited<ReturnType<typeof getAuditLogs>>, entityId: string, tests: string[]) {
 const found = logs
  .filter((log) => log.entityId === entityId && tests.some((test) => log.action.toLowerCase().includes(test)))
  .map((log) => dateOrNull(log.createdAt))
  .filter((date): date is Date => Boolean(date))
  .sort((a, b) => a.getTime() - b.getTime())[0];
 return found ?? null;
}

function normalizeMetric(value?: GrowthMetricKey | string | null): GrowthMetricKey {
 return GROWTH_METRICS.includes(value as GrowthMetricKey) ? (value as GrowthMetricKey) : "requests_received";
}

function normalizeGroupBy(value?: GrowthGroupBy | string | null): GrowthGroupBy {
 return GROWTH_GROUPS.includes(value as GrowthGroupBy) ? (value as GrowthGroupBy) : "day";
}

function normalizeChartType(value?: GrowthChartType | string | null): GrowthChartType {
 return GROWTH_CHART_TYPES.includes(value as GrowthChartType) ? (value as GrowthChartType) : "line";
}

function isRecurringLead(lead: Lead, leads: Lead[]) {
 return Boolean(lead.email && leads.filter((item) => item.email === lead.email).length > 1);
}

async function getGrowthContext(filters: GrowthFilters = {}) {
 const [leads, rawQuotes, followups] = await Promise.all([listLeads(), listQuotes(), listFollowups()]);
 const quotes = applyLeadOutcome(rawQuotes, leads);
 const period = parsePeriod(filters);
 const normalized = {
  period: period.key,
  source: filters.source ?? "all",
  status: filters.status ?? "all",
  urgency: filters.urgency ?? "all",
  clientType: filters.clientType ?? "all",
  from: isoDate(period.from),
  to: isoDate(period.to)
 };
 const leadById = new Map(leads.map((lead) => [lead.id, lead]));
 const quoteById = new Map(quotes.map((quote) => [quote.id, quote]));
 const eligibleLeads = leads.filter((lead) => {
  const sourceOk = normalized.source === "all" || leadSource(lead).toLowerCase() === normalized.source.toLowerCase();
  const urgencyOk = normalized.urgency === "all" || (normalized.urgency === "urgent" ? isUrgentLead(lead) : !isUrgentLead(lead));
  const clientTypeOk = normalized.clientType === "all" || (normalized.clientType === "recurring" ? isRecurringLead(lead, leads) : true);
  return sourceOk && urgencyOk && clientTypeOk && statusMatches(lead, quotes, followups, normalized.status);
 });
 const eligibleLeadIds = new Set(eligibleLeads.map((lead) => lead.id));
 const periodLeads = eligibleLeads.filter((lead) => inRange(leadDate(lead), period.from, period.to));
 const periodQuotes = quotes.filter((quote) => eligibleLeadIds.has(quote.leadId) && inRange(quoteDate(quote, leadById.get(quote.leadId)), period.from, period.to));
 const periodFollowups = followups.filter((followup) => eligibleLeadIds.has(followup.leadId) && inRange(followupDate(followup), period.from, period.to));

 return { leads, quotes, followups, period, normalized, leadById, quoteById, eligibleLeads, periodLeads, periodQuotes, periodFollowups };
}

function startOfWeek(date: Date) {
 const copy = startOfDay(date);
 const day = copy.getDay() || 7;
 copy.setDate(copy.getDate() - day + 1);
 return copy;
}

function chartTimeLabel(date: Date, groupBy: GrowthGroupBy) {
 if (groupBy === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
 if (groupBy === "week") {
  const first = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((startOfWeek(date).getTime() - startOfWeek(first).getTime()) / 86400000);
  return `S${String(Math.floor(days / 7) + 1).padStart(2, "0")} ${date.getFullYear()}`;
 }
 return isoDate(date);
}

function timeLabels(from: Date, to: Date, groupBy: GrowthGroupBy) {
 if (!["day", "week", "month"].includes(groupBy)) return [];
 const labels: string[] = [];
 const cursor = groupBy === "week" ? startOfWeek(from) : groupBy === "month" ? new Date(from.getFullYear(), from.getMonth(), 1) : startOfDay(from);
 while (cursor <= to) {
  labels.push(chartTimeLabel(cursor, groupBy));
  if (groupBy === "month") cursor.setMonth(cursor.getMonth() + 1);
  else if (groupBy === "week") cursor.setDate(cursor.getDate() + 7);
  else cursor.setDate(cursor.getDate() + 1);
 }
 return labels;
}

function leadStatusLabel(status: string) {
 const labels: Record<string, string> = {
  NEW: "Nouveau",
  INCOMPLETE: "Incomplet",
  QUALIFIED: "Qualifie",
  HIGH_VALUE: "Prioritaire",
  HUMAN_REVIEW: "Reprise humaine",
  QUOTE_READY: "Devis pret",
  QUOTE_SENT: "Devis envoye",
  FOLLOWUP_1: "Relance 1",
  FOLLOWUP_2: "Relance 2",
  FOLLOWUP_SCHEDULED: "Relance planifiee",
  WON: "Gagne",
  LOST: "Perdu",
  CLOSED: "Clos"
 };
 return labels[status] ?? status;
}

function quoteStatusLabel(status: string) {
 const labels: Record<string, string> = {
  QUOTE_READY: "Pret",
  QUOTE_SENT: "Envoye",
  ACCEPTED: "Accepte",
  REFUSED: "Refuse"
 };
 return labels[status] ?? status;
}

function followupStatusLabel(status: string) {
 const labels: Record<string, string> = {
  SCHEDULED: "Planifiee",
  SENT: "Envoyee",
  OPENED: "Ouverte",
  REPLIED: "Repondue"
 };
 return labels[status] ?? status;
}

function clientTypeLabel(lead?: Lead, leads: Lead[] = []) {
 if (!lead) return "Non renseigne";
 return isRecurringLead(lead, leads) ? "Client recurrent" : "Client nouveau";
}

function chartGroupLabel(
 date: Date | null,
 groupBy: GrowthGroupBy,
 lead: Lead | undefined,
 status: string,
 leads: Lead[]
) {
 if (["day", "week", "month"].includes(groupBy)) return date ? chartTimeLabel(date, groupBy) : "Sans date";
 if (groupBy === "source") return lead ? leadSource(lead) : "Non renseigne";
 if (groupBy === "client_type") return clientTypeLabel(lead, leads);
 return status;
}

type GrowthMetricEvent = {
 id: string;
 date: Date | null;
 lead?: Lead;
 status: string;
 value: number;
};

function metricEvents(context: Awaited<ReturnType<typeof getGrowthContext>>, metric: GrowthMetricKey): GrowthMetricEvent[] {
 const now = new Date();
 if (metric === "requests_received") {
  return context.periodLeads.map((lead) => ({ id: lead.id, date: leadDate(lead), lead, status: leadStatusLabel(lead.status), value: 1 }));
 }
 if (metric === "qualified_leads") {
  return context.periodLeads
   .filter((lead) => QUALIFIED_STATUSES.has(lead.status))
   .map((lead) => ({ id: lead.id, date: leadDate(lead), lead, status: leadStatusLabel(lead.status), value: 1 }));
 }
 if (metric === "followups_planned" || metric === "followups_sent" || metric === "followups_overdue") {
  return context.periodFollowups
   .filter((followup) => {
    if (metric === "followups_planned") return followup.status === "SCHEDULED";
    if (metric === "followups_sent") return followup.status !== "SCHEDULED";
    const dueAt = dateOrNull(followup.dueAt);
    return followup.status === "SCHEDULED" && Boolean(dueAt && dueAt < now);
   })
   .map((followup) => {
    const lead = context.leadById.get(followup.leadId);
    return {
     id: followup.id,
     date: dateOrNull(followup.dueAt) ?? followupDate(followup),
     lead,
     status: followupStatusLabel(followup.status),
     value: 1
    };
   });
 }

 return context.periodQuotes
  .filter((quote) => {
   if (metric === "quotes_sent") return SENT_QUOTE_STATUSES.has(quote.status);
   if (metric === "quotes_accepted") return WON_QUOTE_STATUSES.has(quote.status);
   if (metric === "potential_revenue") return quote.status !== "REFUSED";
   if (metric === "won_revenue") return WON_QUOTE_STATUSES.has(quote.status);
   if (metric === "average_lead_to_quote_minutes") {
    const lead = context.leadById.get(quote.leadId);
    return minutesBetween(lead ? leadDate(lead) : null, quoteDate(quote, lead)) !== null;
   }
   return true;
  })
  .map((quote) => {
   const lead = context.leadById.get(quote.leadId);
   const leadToQuote = minutesBetween(lead ? leadDate(lead) : null, quoteDate(quote, lead));
   return {
    id: quote.id,
    date: quoteDate(quote, lead),
    lead,
    status: quoteStatusLabel(quote.status),
    value:
     metric === "potential_revenue" || metric === "won_revenue"
      ? quoteAmount(quote)
      : metric === "average_lead_to_quote_minutes"
       ? leadToQuote ?? 0
       : 1
   };
  });
}

function aggregateEvents(
 context: Awaited<ReturnType<typeof getGrowthContext>>,
 metric: GrowthMetricKey,
 groupBy: GrowthGroupBy
) {
 const events = metricEvents(context, metric);
 const groups = new Map<string, number[]>();
 timeLabels(context.period.from, context.period.to, groupBy).forEach((label) => groups.set(label, []));

 events.forEach((event) => {
  const label = chartGroupLabel(event.date, groupBy, event.lead, event.status, context.leads);
  groups.set(label, [...(groups.get(label) ?? []), event.value]);
 });

 return Array.from(groups.entries())
  .map(([label, values]) => ({
   label,
   value:
    metric === "average_lead_to_quote_minutes"
     ? average(values) ?? 0
     : values.reduce((sum, value) => sum + value, 0)
  }))
  .filter((point) => !["source", "status", "client_type"].includes(groupBy) || point.value > 0);
}

function aggregateConversionRate(context: Awaited<ReturnType<typeof getGrowthContext>>, groupBy: GrowthGroupBy) {
 const sentGroups = new Map<string, number>();
 const wonGroups = new Map<string, number>();
 timeLabels(context.period.from, context.period.to, groupBy).forEach((label) => {
  sentGroups.set(label, 0);
  wonGroups.set(label, 0);
 });

 context.periodQuotes
  .filter((quote) => SENT_QUOTE_STATUSES.has(quote.status))
  .forEach((quote) => {
   const lead = context.leadById.get(quote.leadId);
   const label = chartGroupLabel(quoteDate(quote, lead), groupBy, lead, quoteStatusLabel(quote.status), context.leads);
   sentGroups.set(label, (sentGroups.get(label) ?? 0) + 1);
   if (WON_QUOTE_STATUSES.has(quote.status)) wonGroups.set(label, (wonGroups.get(label) ?? 0) + 1);
  });

 return Array.from(sentGroups.entries())
  .map(([label, sent]) => ({ label, value: percent(wonGroups.get(label) ?? 0, sent) }))
  .filter((point) => !["source", "status", "client_type"].includes(groupBy) || point.value > 0);
}

export async function getGrowthChartData(filters: GrowthChartFilters = {}): Promise<GrowthChartData> {
 const metric = normalizeMetric(filters.metric);
 const groupBy = normalizeGroupBy(filters.groupBy);
 const chartType = normalizeChartType(filters.chartType);
 const context = await getGrowthContext(filters);
 const data = metric === "conversion_rate" ? aggregateConversionRate(context, groupBy) : aggregateEvents(context, metric, groupBy);
 const hasSignal = data.some((point) => point.value > 0);

 return {
  metric,
  period: context.period.key,
  groupBy,
  chartType,
  data,
  empty: !hasSignal,
  note: hasSignal ? undefined : "Aucune donnee disponible pour cet indicateur sur la periode selectionnee."
 };
}

function nextFollowupForLead(followups: Followup[], leadId: string) {
 return followups
  .filter((followup) => followup.leadId === leadId && followup.status === "SCHEDULED")
  .map((followup) => dateOrNull(followup.dueAt))
  .filter((date): date is Date => Boolean(date))
  .sort((a, b) => a.getTime() - b.getTime())[0];
}

export async function getGrowthDetailsData(filters: GrowthDetailsFilters = {}): Promise<GrowthDetailsData> {
 const metric = normalizeMetric(filters.metric);
 const context = await getGrowthContext(filters);
 const events = metric === "conversion_rate" ? metricEvents(context, "quotes_sent") : metricEvents(context, metric);
 const quoteByEventId = new Map(context.quotes.map((quote) => [quote.id, quote]));
 const rows = events
  .map((event) => {
   const quote = quoteByEventId.get(event.id);
   const lead = event.lead ?? (quote ? context.leadById.get(quote.leadId) : undefined);
   const nextFollowup = lead ? nextFollowupForLead(context.followups, lead.id) : null;
   const date = event.date ?? new Date(0);

   return {
    id: event.id,
    date: event.date ? event.date.toISOString() : "",
    client: leadClient(lead),
    source: lead ? leadSource(lead) : "Non renseigne",
    status: quote ? quoteStatusLabel(quote.status) : event.status,
    quoteReference: quote?.calculation.quoteNumber ?? "Sans devis",
    amount: quote ? quoteAmount(quote) : null,
    lastAction: event.date ? event.date.toISOString() : "",
    nextFollowup: nextFollowup ? nextFollowup.toISOString() : null,
    href: quote ? `/client/devis/${quote.id}` : lead ? `/dashboard/demandes/${lead.id}` : "/dashboard/croissance",
    action: "Voir",
    sortDate: date.getTime()
   };
  })
  .sort((a, b) => b.sortDate - a.sortDate)
  .slice(0, 80)
  .map((row) => ({
   id: row.id,
   date: row.date,
   client: row.client,
   source: row.source,
   status: row.status,
   quoteReference: row.quoteReference,
   amount: row.amount,
   lastAction: row.lastAction,
   nextFollowup: row.nextFollowup,
   href: row.href,
   action: row.action
  }));

 return {
  metric,
  period: context.period.key,
  data: rows,
  empty: rows.length === 0,
  note: rows.length === 0 ? "Aucune donnee disponible pour cet indicateur sur la periode selectionnee." : undefined
 };
}

export async function getGrowthDashboardData(filters: GrowthFilters = {}): Promise<GrowthDashboardData> {
 const [leads, rawQuotes, followups, auditLogs, modelRuns] = await Promise.all([
  listLeads(),
  listQuotes(),
  listFollowups(),
  getAuditLogs(),
  getModelRuns()
 ]);
 const quotes = applyLeadOutcome(rawQuotes, leads);

 const period = parsePeriod(filters);
 const normalized = {
  period: period.key,
  source: filters.source ?? "all",
  status: filters.status ?? "all",
  urgency: filters.urgency ?? "all",
  clientType: filters.clientType ?? "all",
  from: isoDate(period.from),
  to: isoDate(period.to)
 };

 const leadById = new Map(leads.map((lead) => [lead.id, lead]));
 const quoteById = new Map(quotes.map((quote) => [quote.id, quote]));
 const eligibleLeads = leads.filter((lead) => {
  const sourceOk = normalized.source === "all" || leadSource(lead).toLowerCase() === normalized.source.toLowerCase();
  const urgencyOk = normalized.urgency === "all" || (normalized.urgency === "urgent" ? isUrgentLead(lead) : !isUrgentLead(lead));
  const clientTypeOk =
   normalized.clientType === "all" ||
   (normalized.clientType === "recurring" ? Boolean(lead.email && leads.filter((item) => item.email === lead.email).length > 1) : true);
  return sourceOk && urgencyOk && clientTypeOk && statusMatches(lead, quotes, followups, normalized.status);
 });
 const eligibleLeadIds = new Set(eligibleLeads.map((lead) => lead.id));

 const periodLeads = eligibleLeads.filter((lead) => inRange(leadDate(lead), period.from, period.to));
 const periodQuotes = quotes.filter((quote) => eligibleLeadIds.has(quote.leadId) && inRange(quoteDate(quote, leadById.get(quote.leadId)), period.from, period.to));
 const periodFollowups = followups.filter((followup) => eligibleLeadIds.has(followup.leadId) && inRange(followupDate(followup), period.from, period.to));

 const previousFrom = new Date(period.from);
 const previousTo = new Date(period.from);
 previousFrom.setTime(period.from.getTime() - (period.to.getTime() - period.from.getTime()) - 1);
 previousTo.setTime(period.from.getTime() - 1);
 const previousRequests = eligibleLeads.filter((lead) => inRange(leadDate(lead), previousFrom, previousTo)).length;

 const completeLeads = periodLeads.filter(isCompleteLead);
 const qualifiedLeads = periodLeads.filter((lead) => QUALIFIED_STATUSES.has(lead.status));
 const quoteReady = periodQuotes.filter((quote) => quote.status === "QUOTE_READY");
 const sentQuotes = periodQuotes.filter((quote) => SENT_QUOTE_STATUSES.has(quote.status));
 const wonQuotes = periodQuotes.filter((quote) => WON_QUOTE_STATUSES.has(quote.status));
 const lostQuotes = periodQuotes.filter((quote) => LOST_QUOTE_STATUSES.has(quote.status));
 const overdueFollowups = periodFollowups.filter((followup) => followup.status === "SCHEDULED" && dateOrNull(followup.dueAt) && dateOrNull(followup.dueAt)! < new Date());

 const leadToQuoteMinutes = periodQuotes
  .map((quote) => {
   const lead = leadById.get(quote.leadId);
   return minutesBetween(lead ? leadDate(lead) : null, quoteDate(quote, lead));
  })
  .filter((value): value is number => value !== null);
 const potentialRevenue = periodQuotes
  .filter((quote) => quote.status !== "REFUSED")
  .reduce((sum, quote) => sum + quoteAmount(quote), 0);
 const wonRevenue = wonQuotes.reduce((sum, quote) => sum + quoteAmount(quote), 0);
 const quotesAmount = periodQuotes.reduce((sum, quote) => sum + quoteAmount(quote), 0);

 const stageData = [
  { stage: "Demandes recues", volume: periodLeads.length, revenue: 0, averageDelayMinutes: null, href: "/dashboard/demandes" },
  { stage: "Demandes completes", volume: completeLeads.length, revenue: 0, averageDelayMinutes: null, href: "/dashboard/demandes" },
  { stage: "Leads qualifies", volume: qualifiedLeads.length, revenue: 0, averageDelayMinutes: average(leadToQuoteMinutes), href: "/dashboard/demandes" },
  { stage: "Devis prets", volume: quoteReady.length, revenue: quoteReady.reduce((sum, quote) => sum + quoteAmount(quote), 0), averageDelayMinutes: average(leadToQuoteMinutes), href: "/dashboard/devis" },
  { stage: "Devis envoyes", volume: sentQuotes.length, revenue: sentQuotes.reduce((sum, quote) => sum + quoteAmount(quote), 0), averageDelayMinutes: average(leadToQuoteMinutes), href: "/dashboard/devis" },
  { stage: "Relances planifiees", volume: periodFollowups.filter((followup) => followup.status === "SCHEDULED").length, revenue: 0, averageDelayMinutes: null, href: "/dashboard/relances" },
  { stage: "Devis acceptes", volume: wonQuotes.length, revenue: wonRevenue, averageDelayMinutes: average(leadToQuoteMinutes), href: "/dashboard/devis" },
  { stage: "Dossiers perdus / refuses", volume: lostQuotes.length + periodLeads.filter((lead) => lead.status === "LOST" || lead.status === "CLOSED").length, revenue: lostQuotes.reduce((sum, quote) => sum + quoteAmount(quote), 0), averageDelayMinutes: null, href: "/dashboard/devis" }
 ];

 const funnel = stageData.map((stage, index) => {
  const previous = index === 0 ? stage.volume : stageData[index - 1].volume;
  return {
   ...stage,
   stepConversionRate: index === 0 ? 100 : percent(stage.volume, previous),
   globalConversionRate: index === 0 ? 100 : percent(stage.volume, periodLeads.length)
  };
 });

 const qualificationMinutes = periodLeads
  .map((lead) => minutesBetween(leadDate(lead), dateOrNull(lead.qualifiedAt) ?? actionDate(auditLogs, lead.id, ["qualified", "status_changed"])))
  .filter((value): value is number => value !== null);
 const quoteGenerationMinutes = leadToQuoteMinutes;
 const firstResponseMinutes = periodLeads
  .map((lead) => minutesBetween(leadDate(lead), actionDate(auditLogs, lead.id, ["clarify", "human_review", "lead.qualified", "status_changed"])))
  .filter((value): value is number => value !== null);

 const sourceRows = Array.from(new Set(periodLeads.map(leadSource))).map((source) => {
  const sourceLeads = periodLeads.filter((lead) => leadSource(lead) === source);
  const ids = new Set(sourceLeads.map((lead) => lead.id));
  const sourceQuotes = periodQuotes.filter((quote) => ids.has(quote.leadId));
  const sourceSentQuotes = sourceQuotes.filter((quote) => SENT_QUOTE_STATUSES.has(quote.status));
  const sourceWonQuotes = sourceQuotes.filter((quote) => WON_QUOTE_STATUSES.has(quote.status));
  return {
   source,
   volume: sourceLeads.length,
   qualificationRate: percent(sourceLeads.filter((lead) => QUALIFIED_STATUSES.has(lead.status)).length, sourceLeads.length),
   conversionRate: percent(sourceWonQuotes.length, sourceSentQuotes.length),
   potentialRevenue: sourceQuotes.filter((quote) => quote.status !== "REFUSED").reduce((sum, quote) => sum + quoteAmount(quote), 0),
   wonRevenue: sourceWonQuotes.reduce((sum, quote) => sum + quoteAmount(quote), 0)
  };
 });

 const alerts: GrowthDashboardData["alerts"] = [
  ...overdueFollowups.slice(0, 4).map((followup) => ({
   id: followup.id,
   type: "overdue_followup",
   label: "Relance en retard",
   severity: "critical" as const,
   message: `${leadClient(leadById.get(followup.leadId))} a une relance prevue depassee.`,
   targetType: "followup" as const,
   targetId: followup.id,
   href: `/dashboard/demandes/${followup.leadId}`,
   actionLabel: "Voir le lead"
  })),
  ...sentQuotes
   .filter((quote) => {
    const date = quoteDate(quote, leadById.get(quote.leadId));
    return date ? Date.now() - date.getTime() > 3 * 86400000 : false;
   })
   .slice(0, 4)
   .map((quote) => ({
    id: quote.id,
    type: "quote_without_response",
    label: "Devis sans reponse",
    severity: "warning" as const,
    message: `${leadClient(leadById.get(quote.leadId))} n'a pas encore repondu au devis ${quote.calculation.quoteNumber}.`,
    targetType: "quote" as const,
    targetId: quote.id,
    href: `/client/devis/${quote.id}`,
    actionLabel: "Voir le devis"
   })),
  ...periodLeads
   .filter((lead) => isUrgentLead(lead) && !periodQuotes.some((quote) => quote.leadId === lead.id))
   .slice(0, 4)
   .map((lead) => ({
    id: lead.id,
    type: "urgent_without_quote",
    label: "Urgent sans devis",
    severity: "critical" as const,
    message: `${leadClient(lead)} doit etre repris avant generation de devis.`,
    targetType: "lead" as const,
    targetId: lead.id,
    href: `/dashboard/demandes/${lead.id}`,
    actionLabel: "Passer en revue"
   }))
 ];

 const buckets = evolutionBuckets(period.from, period.to);
 const evolution = buckets.map((bucket) => ({
  label: bucket.label,
  requests: periodLeads.filter((lead) => inRange(leadDate(lead), bucket.start, bucket.end)).length,
  quotes: periodQuotes.filter((quote) => inRange(quoteDate(quote, leadById.get(quote.leadId)), bucket.start, bucket.end)).length
 }));

 const sentFollowups = periodFollowups.filter((followup) => followup.status !== "SCHEDULED");
 const standardAutomatedLeads = periodLeads.filter((lead) => lead.status !== "HUMAN_REVIEW" && isCompleteLead(lead)).length;
 const aiCost = modelRuns.reduce((sum, run) => sum + (run.costEur ?? 0), 0);

 return {
  period: { from: isoDate(period.from), to: isoDate(period.to), label: period.label },
  filters: normalized,
  kpis: {
   requestsReceived: periodLeads.length,
   requestsEvolutionRate: previousRequests === 0 ? null : percent(periodLeads.length - previousRequests, previousRequests),
   qualifiedLeads: qualifiedLeads.length,
   qualificationRate: percent(qualifiedLeads.length, periodLeads.length),
   averageLeadToQuoteMinutes: average(leadToQuoteMinutes),
   quotesGenerated: periodQuotes.length,
   quotesAmount,
   conversionRate: percent(wonQuotes.length, sentQuotes.length),
   potentialRevenue,
   wonRevenue,
   overdueFollowups: overdueFollowups.length
  },
  funnel,
  performance: {
   quoteSentRate: percent(sentQuotes.length, qualifiedLeads.length),
   quoteAcceptedRate: percent(wonQuotes.length, sentQuotes.length),
   averageQuoteAmount: average(periodQuotes.map(quoteAmount)) ?? 0,
   averageWonAmount: average(wonQuotes.map(quoteAmount)) ?? 0,
   hotLeads: periodLeads.filter((lead) => lead.status === "HIGH_VALUE").length,
   leadsWithoutAction24h: periodLeads.filter((lead) => {
    const updated = dateOrNull(lead.updatedAt) ?? leadDate(lead);
    return updated ? Date.now() - updated.getTime() > 86400000 && !["WON", "LOST", "CLOSED"].includes(lead.status) : false;
   }).length,
   humanReviewCount: periodLeads.filter((lead) => lead.status === "HUMAN_REVIEW").length
  },
  reactivity: {
   averageFirstResponseMinutes: average(firstResponseMinutes),
   averageQualificationMinutes: average(qualificationMinutes),
   averageQuoteGenerationMinutes: average(quoteGenerationMinutes),
   fastHandledLeads: leadToQuoteMinutes.filter((value) => value <= 240).length,
   pendingQualification: periodLeads.filter((lead) => lead.status === "NEW" || lead.status === "INCOMPLETE").length,
   pendingQuoteSend: quoteReady.length
  },
  followups: {
   planned: periodFollowups.filter((followup) => followup.status === "SCHEDULED").length,
   sent: sentFollowups.length,
   overdue: overdueFollowups.length,
   urgentJ2: periodFollowups.filter((followup) => {
    const quote = followup.quoteId ? quoteById.get(followup.quoteId) : null;
    const diff = minutesBetween(quote ? quoteDate(quote, leadById.get(quote.leadId)) : null, dateOrNull(followup.dueAt));
    return diff !== null && diff <= 2.5 * 1440;
   }).length,
   finalJ7: periodFollowups.filter((followup) => {
    const quote = followup.quoteId ? quoteById.get(followup.quoteId) : null;
    const diff = minutesBetween(quote ? quoteDate(quote, leadById.get(quote.leadId)) : null, dateOrNull(followup.dueAt));
    return diff !== null && diff > 2.5 * 1440;
   }).length,
   completionRate: percent(sentFollowups.length, periodFollowups.length),
   responseAfterFollowupRate: periodFollowups.length ? percent(periodFollowups.filter((followup) => followup.status === "REPLIED").length, periodFollowups.length) : null,
   items: periodFollowups.slice(0, 8).map((followup) => {
    const quote = followup.quoteId ? quoteById.get(followup.quoteId) : null;
    return {
     id: followup.id,
     client: leadClient(leadById.get(followup.leadId)),
     quoteReference: quote?.calculation.quoteNumber ?? followup.quoteId ?? "Sans devis",
     type: leadById.get(followup.leadId) && isUrgentLead(leadById.get(followup.leadId) as Lead) ? "J+2 urgente" : "Standard",
     dueAt: followup.dueAt,
     status: followup.status,
     href: `/dashboard/demandes/${followup.leadId}`
    };
   })
  },
  sources: sourceRows,
  alerts,
  automationGain: {
   automatedStandardLeads: standardAutomatedLeads,
   automatedFollowupsSent: sentFollowups.length,
   estimatedHoursSaved: Math.round(((standardAutomatedLeads * 18 + sentFollowups.length * 7) / 60) * 10) / 10,
   estimatedAiCost: aiCost,
   averageAiCostPerQuote: periodQuotes.length ? Math.round((aiCost / periodQuotes.length) * 100) / 100 : null,
   avoidedHumanReviews: null
  },
  charts: {
   evolution,
   statusDistribution: [
    { label: "Qualifies", value: qualifiedLeads.length, tone: "blue" },
    { label: "Devis envoyes", value: sentQuotes.length, tone: "gold" },
    { label: "Acceptes", value: wonQuotes.length, tone: "green" },
    { label: "Refuses", value: lostQuotes.length, tone: "red" }
   ]
  },
  empty: periodLeads.length === 0 && periodQuotes.length === 0 && periodFollowups.length === 0,
  limitations: []
 };
}
