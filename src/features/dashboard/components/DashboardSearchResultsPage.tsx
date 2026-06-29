import Link from "next/link";
import { listFollowups, listLeads, listQuotes } from "@/shared/lib/data";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import { isLostQuote, isWonQuote, quoteOutcomeDisplay } from "@/features/dashboard/services/quoteOutcome";
import { formatCommercialDate, leadDisplayName, leadRouteLabel } from "@/features/dashboard/services/leadPipelinePresentation";
import { DashboardHeader, DataTable, KpiGrid, Note, Panel } from "./DashboardPageKit";
import { StatusBadge } from "./StatusBadge";
import styles from "./dashboard.module.css";

type ResultRow = {
 type: string;
 title: string;
 detail: string;
 status: string;
 href: string;
 tone?: "review" | "won" | "danger";
};

function normalize(value: string) {
 return value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();
}

function matchesQuery(values: Array<string | number | null | undefined>, query: string) {
 const words = normalize(query)
  .split(/\s+/)
  .map((word) => word.trim())
  .filter(Boolean);
 if (words.length === 0) return false;

 const haystack = normalize(values.filter((value) => value !== null && value !== undefined).join(" "));
 return words.every((word) => haystack.includes(word));
}

function euro(value: number) {
 return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function buildLeadRows(leads: Lead[], query: string): ResultRow[] {
 return leads
  .filter((lead) =>
   matchesQuery(
    [
     leadDisplayName(lead),
     leadRouteLabel(lead),
     lead.status,
     lead.email,
     lead.phone,
     lead.organization,
     lead.contactName,
     lead.departureCity,
     lead.arrivalCity,
     lead.departureDate,
     lead.passengerCount,
     lead.options.join(" ")
    ],
    query
   )
  )
  .map((lead) => ({
   type: "Demande",
   title: leadDisplayName(lead),
   detail: leadRouteLabel(lead),
   status: lead.status,
   href: `/dashboard/demandes/${lead.id}`,
   tone: lead.status === "HUMAN_REVIEW" ? "review" : lead.status === "LOST" || lead.status === "CLOSED" ? "danger" : undefined
  }));
}

function buildQuoteRows(quotes: Quote[], leadById: Map<string, Lead>, query: string): ResultRow[] {
 return quotes
  .filter((quote) => {
   const lead = leadById.get(quote.leadId);
   const outcome = quoteOutcomeDisplay(quote, lead);
   return matchesQuery(
    [
     quote.calculation.quoteNumber,
     leadDisplayName(lead),
     leadRouteLabel(lead),
     outcome.label,
     quote.status,
     quote.calculation.priceTtc,
     quote.calculation.distanceKm
    ],
    query
   );
  })
  .map((quote) => {
   const lead = leadById.get(quote.leadId);
   const outcome = quoteOutcomeDisplay(quote, lead);
   return {
    type: "Devis",
    title: quote.calculation.quoteNumber,
    detail: `${leadDisplayName(lead)} · ${euro(quote.calculation.priceTtc)}`,
    status: outcome.status,
    href: `/client/devis/${quote.id}`,
    tone: isWonQuote(quote, lead) ? "won" : isLostQuote(quote, lead) ? "danger" : undefined
   };
  });
}

export async function DashboardSearchResultsPage({ query }: { query: string }) {
 const [leads, quotes, followups] = await Promise.all([listLeads(), listQuotes(), listFollowups()]);
 const leadById = new Map(leads.map((lead) => [lead.id, lead]));
 const leadRows = buildLeadRows(leads, query);
 const quoteRows = buildQuoteRows(quotes, leadById, query);
 const followupRows: ResultRow[] = followups
  .filter((followup) => {
   const lead = leadById.get(followup.leadId);
   return matchesQuery(
    [leadDisplayName(lead), leadRouteLabel(lead), followup.status, followup.channel, followup.quoteId, followup.dueAt],
    query
   );
  })
  .map((followup) => {
   const lead = leadById.get(followup.leadId);
   return {
    type: "Relance",
    title: leadDisplayName(lead),
    detail: `${followup.channel} · ${formatCommercialDate(followup.dueAt)}`,
    status: followup.status,
    href: `/dashboard/relances/${followup.id}`
   };
  });

 const rows = [...leadRows, ...quoteRows, ...followupRows];

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Recherche"
    subtitle={query ? `Resultats correspondant a "${query}".` : "Saisissez un mot-cle dans la recherche du dashboard."}
    actionHref="/dashboard"
    actionLabel="Retour dashboard"
   />
   <KpiGrid
    kpis={[
     { label: "Resultats", value: rows.length, tone: "blue" },
     { label: "Demandes", value: leadRows.length, tone: "gold", href: query ? `/dashboard/recherche?q=${encodeURIComponent(query)}` : undefined },
     { label: "Devis", value: quoteRows.length, tone: "green" },
     { label: "Relances", value: followupRows.length, tone: "blue" }
    ]}
   />
   <Panel
    title="Liste des resultats"
    subtitle="Cliquez sur une ligne pour ouvrir directement le dossier, le devis ou la demande associee."
    action={
     <Link className={styles.secondary} href="/dashboard">
      Retour dashboard
     </Link>
    }
   >
    {!query ? (
     <Note>Aucune recherche lancee.</Note>
    ) : rows.length === 0 ? (
     <Note>Aucun resultat pour cette recherche.</Note>
    ) : (
     <DataTable
      columns={["Type", "Resultat", "Detail", "Statut", "Action"]}
      columnsTemplate=".75fr 1.25fr 1.5fr .9fr .7fr"
      rows={rows.map((row) => ({
       cells: [row.type, row.title, row.detail, <StatusBadge key="s" status={row.status} />, "Ouvrir"],
       href: row.href,
       tone: row.tone
      }))}
     />
    )}
   </Panel>
  </main>
 );
}
