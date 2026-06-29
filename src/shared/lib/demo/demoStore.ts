import { pricingRules } from "@/data/pricing-rules";
import { routePricing } from "@/data/route-pricing";
import { mockLeads } from "@/data/mock-leads";
import { mockQuotes } from "@/data/mock-quotes";
import { mockFollowups } from "@/data/mock-followups";
import {
  getDemoScenario,
  getScenarioAuditLogs,
  getScenarioFollowups,
  getScenarioLeads,
  getScenarioQuotes
} from "@/data/demo-scenarios";
import type { AuditLog } from "@/shared/types/audit-log";
import type { Followup } from "@/shared/types/followup";
import type { Lead, LeadStatus } from "@/shared/types/lead";
import type { ModelRun } from "@/shared/types/model-run";
import type { Quote, QuoteCalculation } from "@/shared/types/quote";
import type { Client, ClientInput } from "@/shared/types/client";
import type { DistanceCacheEntry } from "@/shared/lib/distance/distanceSchemas";

type RoutePricingRow = {
  routeKey: string;
  departureCity: string;
  arrivalCity: string;
  distanceKm: number;
  basePriceEur: number;
  active: boolean;
  version: number;
};

type PricingRuleRow = {
  key: string;
  ruleType: string;
  label: string;
  value: unknown;
  unit: string;
  active: boolean;
  version: number;
  metadata?: Record<string, unknown>;
};

type DemoStoreState = {
  clients: Client[];
  leads: Lead[];
  quotes: Quote[];
  followups: Followup[];
  auditLogs: AuditLog[];
  modelRuns: ModelRun[];
  distanceCache: DistanceCacheEntry[];
};

declare global {
  var __neoTravelDemoStore: DemoStoreState | undefined;
}

const demoPricingRules: PricingRuleRow[] = [
  {
    key: "vat_standard_transport",
    ruleType: "vat",
    label: "TVA transport voyageurs",
    value: pricingRules.vatRate,
    unit: "rate",
    active: true,
    version: 1,
    metadata: { source: "kickoff" }
  },
  {
    key: "margin_standard",
    ruleType: "margin",
    label: "Marge commerciale standard",
    value: 0.15,
    unit: "rate",
    active: true,
    version: 1,
    metadata: { source: "kickoff" }
  },
  {
    key: "option_guide",
    ruleType: "option",
    label: "Guide accompagnateur",
    value: 80,
    unit: "eur_per_day",
    active: true,
    version: 1,
    metadata: { code: "guide", source: "kickoff" }
  },
  {
    key: "option_driver_night",
    ruleType: "option",
    label: "Nuit chauffeur",
    value: 120,
    unit: "eur_per_night",
    active: true,
    version: 1,
    metadata: { code: "nuit_chauffeur", source: "kickoff" }
  },
  {
    key: "option_tolls",
    ruleType: "option",
    label: "Peages estimes",
    value: 120,
    unit: "eur",
    active: true,
    version: 1,
    metadata: { code: "peages", source: "demo_fixture" }
  }
];

function createInitialStore(): DemoStoreState {
  return {
    clients: [],
    leads: [...mockLeads],
    quotes: [...mockQuotes],
    followups: [...mockFollowups],
    auditLogs: [],
    modelRuns: [],
    distanceCache: []
  };
}

const store = globalThis.__neoTravelDemoStore ?? (globalThis.__neoTravelDemoStore = createInitialStore());

function nowIso() {
  return new Date().toISOString();
}

function hydrateStoredDemoTimeline() {
  const leadFixtureById = new Map(mockLeads.map((lead) => [lead.id, lead]));
  const quoteFixtureById = new Map(mockQuotes.map((quote) => [quote.id, quote]));

  store.leads = store.leads.map((lead) => {
    const fixture = leadFixtureById.get(lead.id);
    if (!fixture) return lead;
      return {
        ...lead,
      hasIntermediateStop: lead.hasIntermediateStop ?? fixture.hasIntermediateStop ?? false,
      intermediateStops: lead.intermediateStops ?? fixture.intermediateStops ?? [],
        createdAt: lead.createdAt ?? fixture.createdAt ?? null,
      updatedAt: lead.updatedAt ?? fixture.updatedAt ?? null,
      qualifiedAt: lead.qualifiedAt ?? fixture.qualifiedAt ?? null
    };
  });

  store.quotes = store.quotes.map((quote) => {
    const fixture = quoteFixtureById.get(quote.id);
    if (!fixture) return quote;
    return {
      ...quote,
      createdAt: quote.createdAt ?? fixture.createdAt ?? null,
      updatedAt: quote.updatedAt ?? fixture.updatedAt ?? null
    };
  });
}

hydrateStoredDemoTimeline();

function routeKeyToCities(routeKey: string) {
  const [departureCity, arrivalCity] = routeKey.split("__").map((part) => part.slice(0, 1).toUpperCase() + part.slice(1));
  return { departureCity, arrivalCity };
}

export const demoStore = {
  createClient(input: ClientInput) {
    const client: Client = {
      id: crypto.randomUUID(),
      organization: input.organization,
      contactName: input.contactName ?? null,
      email: input.email,
      phone: input.phone ?? null,
      active: input.active ?? true,
      createdAt: nowIso()
    };
    store.clients.push(client);
    return client;
  },

  listClients() {
    return store.clients;
  },

  createLead(input: Partial<Lead>) {
    const createdAt = input.createdAt ?? nowIso();
    const lead: Lead = {
      id: input.id ?? crypto.randomUUID(),
      status: (input.status ?? "NEW") as LeadStatus,
      rawMessage: input.rawMessage,
      clientType: input.clientType ?? null,
      contactName: input.contactName ?? null,
      organization: input.organization ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      departureCity: input.departureCity ?? null,
      arrivalCity: input.arrivalCity ?? null,
      departureDate: input.departureDate ?? null,
      returnDate: input.returnDate ?? null,
      passengerCount: input.passengerCount ?? null,
      tripType: input.tripType ?? null,
      hasIntermediateStop: input.hasIntermediateStop ?? false,
      intermediateStops: input.intermediateStops ?? [],
      options: input.options ?? [],
      missingFields: input.missingFields ?? [],
      confidence: input.confidence ?? null,
      humanReviewReason: input.humanReviewReason ?? null,
      aiSummary: input.aiSummary ?? null,
      createdAt,
      updatedAt: input.updatedAt ?? createdAt,
      qualifiedAt: input.qualifiedAt ?? null
    };
    store.leads.unshift(lead);
    return lead;
  },

  updateLead(id: string, patch: Partial<Lead>) {
    const lead = store.leads.find((item) => item.id === id);
    if (!lead) return null;
    Object.assign(lead, patch);
    return lead;
  },

  getLeadById(id: string) {
    return store.leads.find((lead) => lead.id === id) ?? null;
  },

  listLeads() {
    return store.leads;
  },

  createQuote(input: { leadId: string; calculation: QuoteCalculation; status?: Quote["status"]; createdAt?: string | null; updatedAt?: string | null }) {
    const createdAt = input.createdAt ?? nowIso();
    const quote: Quote = {
      id: crypto.randomUUID(),
      leadId: input.leadId,
      status: input.status ?? "QUOTE_READY",
      calculation: input.calculation,
      createdAt,
      updatedAt: input.updatedAt ?? createdAt
    };
    store.quotes.unshift(quote);
    return quote;
  },

  getQuoteById(id: string) {
    return store.quotes.find((quote) => quote.id === id) ?? null;
  },

  listQuotes() {
    return store.quotes;
  },

  createFollowup(input: Omit<Followup, "id" | "status"> & { status?: Followup["status"] }) {
    const followup: Followup = {
      id: crypto.randomUUID(),
      status: input.status ?? "SCHEDULED",
      leadId: input.leadId,
      quoteId: input.quoteId,
      channel: input.channel,
      dueAt: input.dueAt
    };
    store.followups.unshift(followup);
    return followup;
  },

  listFollowups() {
    return store.followups;
  },

  createAuditLog(input: Omit<AuditLog, "id" | "createdAt">) {
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      ...input
    };
    store.auditLogs.unshift(auditLog);
    return auditLog;
  },

  listAuditLogs() {
    return store.auditLogs;
  },

  createModelRun(input: Omit<ModelRun, "id" | "createdAt">) {
    const modelRun: ModelRun = {
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      ...input
    };
    store.modelRuns.unshift(modelRun);
    return modelRun;
  },

  listModelRuns() {
    return store.modelRuns;
  },

  listPricingRules(): PricingRuleRow[] {
    return demoPricingRules;
  },

  listPricingMatrices(): PricingRuleRow[] {
    return this.listPricingRules();
  },

  listRoutePricing(): RoutePricingRow[] {
    return Object.entries(routePricing).map(([routeKey, route]) => ({
      routeKey,
      ...routeKeyToCities(routeKey),
      distanceKm: route.distanceKm,
      basePriceEur: route.demoBasePriceEur,
      active: true,
      version: 1
    }));
  },

  findDistanceCache(departureNormalized: string, arrivalNormalized: string) {
    return (
      store.distanceCache.find(
        (entry) =>
          (entry.departureNormalized === departureNormalized && entry.arrivalNormalized === arrivalNormalized) ||
          (entry.departureNormalized === arrivalNormalized && entry.arrivalNormalized === departureNormalized)
      ) ?? null
    );
  },

  createDistanceCache(input: DistanceCacheEntry) {
    const entry: DistanceCacheEntry = {
      id: input.id ?? crypto.randomUUID(),
      ...input
    };
    const existingIndex = store.distanceCache.findIndex(
      (item) =>
        item.departureNormalized === entry.departureNormalized && item.arrivalNormalized === entry.arrivalNormalized
    );
    if (existingIndex >= 0) store.distanceCache.splice(existingIndex, 1);
    store.distanceCache.unshift(entry);
    return entry;
  },

  loadScenario(id: string) {
    const scenario = getDemoScenario(id);
    if (!scenario) return null;

    store.clients = [];
    store.leads = getScenarioLeads(scenario);
    store.quotes = getScenarioQuotes(scenario);
    store.followups = getScenarioFollowups(scenario);
    store.auditLogs = getScenarioAuditLogs(scenario);
    store.modelRuns = [];
    store.distanceCache = [];

    return {
      scenario,
      leads: store.leads,
      quotes: store.quotes,
      followups: store.followups,
      auditLogs: store.auditLogs
    };
  },

  reset() {
    store.clients = [];
    store.leads = [...mockLeads];
    store.quotes = [...mockQuotes];
    store.followups = [...mockFollowups];
    store.auditLogs = [];
    store.modelRuns = [];
    store.distanceCache = [];
  }
};
