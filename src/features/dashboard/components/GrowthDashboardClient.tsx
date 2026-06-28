"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BarChart3, ListChecks, RefreshCw, TrendingUp } from "lucide-react";
import type {
 GrowthChartData,
 GrowthChartType,
 GrowthDashboardData,
 GrowthDetailsData,
 GrowthGroupBy,
 GrowthMetricKey
} from "@/features/dashboard/services/getGrowthDashboardData";
import styles from "./dashboard.module.css";

type LoadState =
 | { status: "loading"; data?: GrowthDashboardData; error?: never }
 | { status: "ready"; data: GrowthDashboardData; error?: never }
 | { status: "error"; data?: GrowthDashboardData; error: string };

type RemoteState<T> =
 | { status: "idle"; data?: T; error?: never }
 | { status: "loading"; data?: T; error?: never }
 | { status: "ready"; data: T; error?: never }
 | { status: "error"; data?: T; error: string };

type GrowthTab = "summary" | "chart" | "details";

const tabs: Array<{ value: GrowthTab; label: string }> = [
 { value: "summary", label: "Vue synthese" },
 { value: "chart", label: "Vue graphique" },
 { value: "details", label: "Detail des donnees" }
];

const metricOptions: Array<{ value: GrowthMetricKey; label: string }> = [
 { value: "requests_received", label: "Demandes recues" },
 { value: "qualified_leads", label: "Leads qualifies" },
 { value: "quotes_generated", label: "Devis generes" },
 { value: "quotes_sent", label: "Devis envoyes" },
 { value: "quotes_accepted", label: "Devis acceptes" },
 { value: "potential_revenue", label: "CA potentiel" },
 { value: "won_revenue", label: "CA gagne" },
 { value: "followups_planned", label: "Relances planifiees" },
 { value: "followups_sent", label: "Relances envoyees" },
 { value: "followups_overdue", label: "Relances en retard" },
 { value: "conversion_rate", label: "Taux de conversion" },
 { value: "average_lead_to_quote_minutes", label: "Delai moyen lead -> devis" }
];

const chartTypeOptions: Array<{ value: GrowthChartType; label: string }> = [
 { value: "line", label: "Courbe" },
 { value: "bar", label: "Barres" },
 { value: "pie", label: "Camembert" },
 { value: "funnel", label: "Funnel" }
];

const groupByOptions: Array<{ value: GrowthGroupBy; label: string }> = [
 { value: "day", label: "Par jour" },
 { value: "week", label: "Par semaine" },
 { value: "month", label: "Par mois" },
 { value: "source", label: "Par source" },
 { value: "status", label: "Par statut" },
 { value: "client_type", label: "Par type client" }
];

const periodOptions = [
 { value: "today", label: "Aujourd'hui" },
 { value: "7d", label: "7 jours" },
 { value: "30d", label: "30 jours" },
 { value: "month", label: "Mois en cours" },
 { value: "custom", label: "Personnalise" }
];

const sourceOptions = [
 { value: "all", label: "Toutes sources" },
 { value: "Site web", label: "Site web" },
 { value: "Formulaire", label: "Formulaire" },
 { value: "Telephone", label: "Telephone" },
 { value: "Campagne Ads", label: "Campagne Ads" },
 { value: "Partenaire", label: "Partenaire" },
 { value: "Client recurrent", label: "Client recurrent" },
 { value: "Non renseigne", label: "Non renseigne" }
];

const statusOptions = [
 { value: "all", label: "Tous statuts" },
 { value: "qualified", label: "Qualifie" },
 { value: "quote_sent", label: "Devis envoye" },
 { value: "accepted", label: "Accepte" },
 { value: "refused", label: "Refuse" },
 { value: "followup_pending", label: "Relance en attente" },
 { value: "human_review", label: "Reprise humaine" }
];

const urgencyOptions = [
 { value: "all", label: "Toutes urgences" },
 { value: "standard", label: "Standard" },
 { value: "urgent", label: "Urgent" }
];

const clientTypeOptions = [
 { value: "all", label: "Tous clients" },
 { value: "recurring", label: "Client recurrent" }
];

function euro(value: number) {
 return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function percent(value: number | null) {
 return value === null ? "n/a" : `${value}%`;
}

function duration(minutes: number | null) {
 if (minutes === null) return "n/a";
 if (minutes < 60) return `${minutes} min`;
 if (minutes < 1440) return `${Math.round((minutes / 60) * 10) / 10} h`;
 return `${Math.round((minutes / 1440) * 10) / 10} j`;
}

function metricLabel(metric: GrowthMetricKey) {
 return metricOptions.find((option) => option.value === metric)?.label ?? metric;
}

function metricValue(metric: GrowthMetricKey, value: number | null) {
 if (value === null) return "-";
 if (metric === "potential_revenue" || metric === "won_revenue") return euro(value);
 if (metric === "conversion_rate") return percent(value);
 if (metric === "average_lead_to_quote_minutes") return duration(value);
 return new Intl.NumberFormat("fr-FR").format(value);
}

function shortDate(value: string) {
 return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function tableDate(value: string | null) {
 if (!value) return "-";
 return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function dateInputValue(date: Date) {
 return date.toISOString().slice(0, 10);
}

function rangeFromPreset(preset: string) {
 const now = new Date();
 const to = dateInputValue(now);
 const from = new Date(now);

 if (preset === "today") return { from: to, to };
 if (preset === "7d") {
  from.setDate(now.getDate() - 6);
  return { from: dateInputValue(from), to };
 }
 if (preset === "month") {
  return { from: dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)), to };
 }

 from.setDate(now.getDate() - 29);
 return { from: dateInputValue(from), to };
}

function buildQuery(filters: Record<string, string>) {
 const params = new URLSearchParams();
 Object.entries(filters).forEach(([key, value]) => {
  if (value && value !== "all") params.set(key, value);
 });
 return params.toString();
}

function toneClass(tone?: "blue" | "green" | "gold" | "red") {
 if (tone === "green") return styles.growthToneGreen;
 if (tone === "gold") return styles.growthToneGold;
 if (tone === "red") return styles.growthToneRed;
 return styles.growthToneBlue;
}

function GrowthFilters({
 filters,
 setFilters,
 refresh,
 loading
}: {
 filters: Record<string, string>;
 setFilters: (next: Record<string, string>) => void;
 refresh: () => void;
 loading: boolean;
}) {
 const update = (key: string, value: string) => setFilters({ ...filters, [key]: value });
 const setRange = (period: string, from: string, to: string) => setFilters({ ...filters, period, from, to });

 return (
  <section className={styles.growthFilters} aria-label="Filtres croissance">
   <GrowthDateRangePicker
    period={filters.period}
    from={filters.from}
    to={filters.to}
    setRange={setRange}
   />
   <label>
    Source
    <select value={filters.source} onChange={(event) => update("source", event.target.value)}>
     {sourceOptions.map((option) => (
      <option key={option.value} value={option.value}>
       {option.label}
      </option>
     ))}
    </select>
   </label>
   <label>
    Statut
    <select value={filters.status} onChange={(event) => update("status", event.target.value)}>
     {statusOptions.map((option) => (
      <option key={option.value} value={option.value}>
       {option.label}
      </option>
     ))}
    </select>
   </label>
   <label>
    Urgence
    <select value={filters.urgency} onChange={(event) => update("urgency", event.target.value)}>
     {urgencyOptions.map((option) => (
      <option key={option.value} value={option.value}>
       {option.label}
      </option>
     ))}
    </select>
   </label>
   <label>
    Type client
    <select value={filters.clientType} onChange={(event) => update("clientType", event.target.value)}>
     {clientTypeOptions.map((option) => (
      <option key={option.value} value={option.value}>
       {option.label}
      </option>
     ))}
    </select>
   </label>
   <button className={styles.secondary} type="button" onClick={refresh} disabled={loading}>
    <RefreshCw aria-hidden="true" size={15} />
    Actualiser
   </button>
  </section>
 );
}

function GrowthKpiCard({
 label,
 value,
 detail,
 tone,
 href,
 onShowDetails
}: {
 label: string;
 value: string | number;
 detail: string;
 tone?: "blue" | "green" | "gold" | "red";
 href?: string;
 onShowDetails?: () => void;
}) {
 return (
  <article className={`${styles.growthKpiCard} ${toneClass(tone)}`}>
   <span>{label}</span>
   <strong>{value}</strong>
   <small>{detail}</small>
   {href ? (
    <Link href={href} className={styles.growthKpiAction}>
     Voir tous
     <ArrowRight aria-hidden="true" size={14} />
    </Link>
   ) : (
    <button className={styles.growthKpiAction} type="button" onClick={onShowDetails} disabled={!onShowDetails}>
     Voir tous
     <ArrowRight aria-hidden="true" size={14} />
    </button>
   )}
  </article>
 );
}

function GrowthFunnel({ data }: { data: GrowthDashboardData }) {
 const max = Math.max(1, ...data.funnel.map((stage) => stage.volume));

 return (
  <section className={styles.growthPanel}>
   <div className={styles.growthPanelHeader}>
    <div>
     <h2>Entonnoir commercial</h2>
     <p>Conversion et valeur associee a chaque etape du pipeline.</p>
    </div>
   </div>
   <div className={styles.growthFunnel}>
    {data.funnel.map((stage) => (
     <div className={styles.growthFunnelRow} key={stage.stage}>
      <div>
       <strong>{stage.stage}</strong>
       <span>{stage.volume} dossiers</span>
      </div>
      <div className={styles.growthFunnelTrack} aria-hidden="true">
       <span style={{ width: `${Math.max(4, (stage.volume / max) * 100)}%` }} />
      </div>
      <span>{stage.stepConversionRate}% etape</span>
      <span>{stage.globalConversionRate}% global</span>
      <span>{stage.revenue ? euro(stage.revenue) : "-"}</span>
      <span>{duration(stage.averageDelayMinutes)}</span>
      {stage.href ? (
       <Link href={stage.href} className={styles.growthInlineLink}>
        Voir
       </Link>
      ) : (
       <span>-</span>
      )}
     </div>
    ))}
   </div>
  </section>
 );
}

function GrowthPerformanceTable({ data }: { data: GrowthDashboardData }) {
 const rows = [
  ["Devis envoyes / leads qualifies", percent(data.performance.quoteSentRate)],
  ["Devis acceptes / devis envoyes", percent(data.performance.quoteAcceptedRate)],
  ["Panier moyen devis", euro(data.performance.averageQuoteAmount)],
  ["CA moyen par dossier gagne", euro(data.performance.averageWonAmount)],
  ["Leads chauds", data.performance.hotLeads],
  ["Leads sans action 24h", data.performance.leadsWithoutAction24h],
  ["Demandes en reprise humaine", data.performance.humanReviewCount]
 ];

 return (
  <section className={styles.growthPanel}>
   <div className={styles.growthPanelHeader}>
    <div>
     <h2>Performance commerciale</h2>
     <p>Qualite de transformation des demandes et valeur moyenne.</p>
    </div>
   </div>
   <div className={styles.growthMetricList}>
    {rows.map(([label, value]) => (
     <div key={String(label)}>
      <span>{label}</span>
      <strong>{value}</strong>
     </div>
    ))}
   </div>
  </section>
 );
}

function GrowthFollowups({ data }: { data: GrowthDashboardData }) {
 return (
  <section className={styles.growthPanel}>
   <div className={styles.growthPanelHeader}>
    <div>
     <h2>Relances automatisees</h2>
     <p>Relances issues du planning interne ou des webhooks n8n branches au back-office.</p>
    </div>
   </div>
   <div className={styles.growthMiniStats}>
    <span>Planifiees <strong>{data.followups.planned}</strong></span>
    <span>Envoyees <strong>{data.followups.sent}</strong></span>
    <span>En retard <strong>{data.followups.overdue}</strong></span>
    <span>J+2 <strong>{data.followups.urgentJ2}</strong></span>
    <span>J+7 <strong>{data.followups.finalJ7}</strong></span>
   </div>
   {data.followups.items.length ? (
    <div className={styles.growthTable}>
     <div className={styles.growthTableHead}>
      <span>Client</span>
      <span>Reference devis</span>
      <span>Type relance</span>
      <span>Date prevue</span>
      <span>Statut</span>
      <span>Action</span>
     </div>
     {data.followups.items.map((item) => (
      <div className={styles.growthTableRow} key={item.id}>
       <strong>{item.client}</strong>
       <span>{item.quoteReference}</span>
       <span>{item.type}</span>
       <span>{shortDate(item.dueAt)}</span>
       <span>{item.status}</span>
       <Link href={item.href}>Voir</Link>
      </div>
     ))}
    </div>
   ) : (
    <p className={styles.growthEmptyLine}>Aucune relance sur cette periode.</p>
   )}
  </section>
 );
}

function GrowthSources({ data }: { data: GrowthDashboardData }) {
 return (
  <section className={styles.growthPanel}>
   <div className={styles.growthPanelHeader}>
    <div>
     <h2>Sources de demandes</h2>
     <p>Origine des demandes et contribution au revenu.</p>
    </div>
   </div>
   {data.sources.length ? (
    <div className={styles.growthTable}>
     <div className={styles.growthTableHead}>
      <span>Source</span>
      <span>Volume</span>
      <span>Qualification</span>
      <span>Conversion</span>
      <span>CA potentiel</span>
      <span>CA gagne</span>
     </div>
     {data.sources.map((source) => (
      <div className={styles.growthTableRow} key={source.source}>
       <strong>{source.source}</strong>
       <span>{source.volume}</span>
       <span>{percent(source.qualificationRate)}</span>
       <span>{percent(source.conversionRate)}</span>
       <span>{euro(source.potentialRevenue)}</span>
       <span>{euro(source.wonRevenue)}</span>
      </div>
     ))}
    </div>
   ) : (
    <p className={styles.growthEmptyLine}>Aucune source disponible pour cette periode.</p>
   )}
  </section>
 );
}

function GrowthAlerts({ data }: { data: GrowthDashboardData }) {
 return (
  <section className={styles.growthPanel}>
   <div className={styles.growthPanelHeader}>
    <div>
     <h2>Alertes croissance</h2>
     <p>Opportunites a risque a reprendre commercialement.</p>
    </div>
   </div>
   <div className={styles.growthAlerts}>
    {data.alerts.length ? (
     data.alerts.map((alert) => (
      <article className={styles.growthAlert} data-severity={alert.severity} key={`${alert.type}-${alert.id}`}>
       <AlertTriangle aria-hidden="true" size={18} />
       <div>
        <strong>{alert.label}</strong>
        <span>{alert.message}</span>
        {alert.disabledReason ? <small>{alert.disabledReason}</small> : null}
       </div>
       {alert.href ? (
        <Link href={alert.href}>
         {alert.actionLabel}
         <ArrowRight aria-hidden="true" size={14} />
        </Link>
       ) : (
        <button type="button" disabled>
         {alert.actionLabel}
        </button>
       )}
      </article>
     ))
    ) : (
     <p className={styles.growthEmptyLine}>Aucune alerte active sur cette periode.</p>
    )}
   </div>
  </section>
 );
}

function GrowthAutomationGain({ data }: { data: GrowthDashboardData }) {
 return (
  <section className={styles.growthPanel}>
   <div className={styles.growthPanelHeader}>
    <div>
     <h2>Gain d'automatisation</h2>
     <p>Temps libere pour les cas complexes, pas une reduction d'effectif.</p>
    </div>
   </div>
   <div className={styles.growthMetricList}>
    <div>
     <span>Leads standards traites automatiquement</span>
     <strong>{data.automationGain.automatedStandardLeads}</strong>
    </div>
    <div>
     <span>Relances automatisees envoyees</span>
     <strong>{data.automationGain.automatedFollowupsSent}</strong>
    </div>
    <div>
     <span>Temps estime economise</span>
     <strong>{data.automationGain.estimatedHoursSaved} h</strong>
    </div>
    <div>
     <span>Cout IA estime</span>
     <strong>{euro(data.automationGain.estimatedAiCost)}</strong>
    </div>
    <div>
     <span>Cout moyen IA par devis</span>
     <strong>{data.automationGain.averageAiCostPerQuote === null ? "n/a" : euro(data.automationGain.averageAiCostPerQuote)}</strong>
    </div>
   </div>
  </section>
 );
}

function GrowthCharts({ data }: { data: GrowthDashboardData }) {
 const maxEvolution = Math.max(1, ...data.charts.evolution.flatMap((item) => [item.requests, item.quotes]));
 const maxStatus = Math.max(1, ...data.charts.statusDistribution.map((item) => item.value));

 return (
  <div className={styles.growthTwoGrid}>
   <section className={styles.growthPanel}>
    <div className={styles.growthPanelHeader}>
     <div>
      <h2>Evolution demandes / devis</h2>
      <p>Volume sur la periode filtree.</p>
     </div>
    </div>
    <div className={styles.growthChartBars}>
     {data.charts.evolution.map((item) => (
      <div key={item.label}>
       <span className={styles.growthBarPair}>
        <i style={{ height: `${Math.max(4, (item.requests / maxEvolution) * 100)}%` }} />
        <b style={{ height: `${Math.max(4, (item.quotes / maxEvolution) * 100)}%` }} />
       </span>
       <small>{item.label}</small>
      </div>
     ))}
    </div>
   </section>
   <section className={styles.growthPanel}>
    <div className={styles.growthPanelHeader}>
     <div>
      <h2>Conversion par statut</h2>
      <p>Lecture rapide du pipeline actif.</p>
     </div>
    </div>
    <div className={styles.growthStatusChart}>
     {data.charts.statusDistribution.map((item) => (
      <div key={item.label}>
       <span>{item.label}</span>
       <strong>{item.value}</strong>
       <em>
        <i className={toneClass(item.tone)} style={{ width: `${Math.max(3, (item.value / maxStatus) * 100)}%` }} />
       </em>
      </div>
     ))}
    </div>
   </section>
  </div>
 );
}

function GrowthTabs({ activeTab, setActiveTab }: { activeTab: GrowthTab; setActiveTab: (tab: GrowthTab) => void }) {
 return (
  <nav className={styles.growthTabs} aria-label="Vues croissance">
   {tabs.map((tab) => (
    <button
     aria-pressed={activeTab === tab.value}
     className={styles.growthTab}
     key={tab.value}
     type="button"
     onClick={() => setActiveTab(tab.value)}
    >
     {tab.value === "chart" ? <BarChart3 aria-hidden="true" size={16} /> : null}
     {tab.value === "details" ? <ListChecks aria-hidden="true" size={16} /> : null}
     {tab.value === "summary" ? <TrendingUp aria-hidden="true" size={16} /> : null}
     {tab.label}
    </button>
   ))}
  </nav>
 );
}

function GrowthDateRangePicker({
 period,
 from,
 to,
 setRange
}: {
 period: string;
 from: string;
 to: string;
 setRange: (period: string, from: string, to: string) => void;
}) {
 const applyPreset = (value: string) => {
  const range = rangeFromPreset(value);
  setRange(value, range.from, range.to);
 };

 const updateCustomFrom = (value: string) => {
  setRange("custom", value, to);
 };

 const updateCustomTo = (value: string) => {
  setRange("custom", from, value);
 };

 return (
  <div className={styles.growthDatePicker}>
   <span>Periode</span>
   <div className={styles.growthDatePresets} aria-label="Periodes rapides">
    {periodOptions.filter((option) => option.value !== "custom").map((option) => (
     <button
      aria-pressed={period === option.value}
      key={option.value}
      type="button"
      onClick={() => applyPreset(option.value)}
     >
      {option.label}
     </button>
    ))}
   </div>
   <div className={styles.growthDateFields}>
    <label>
     Du
     <input type="date" value={from} onChange={(event) => updateCustomFrom(event.target.value)} />
    </label>
    <label>
     Au
     <input type="date" value={to} onChange={(event) => updateCustomTo(event.target.value)} />
    </label>
   </div>
  </div>
 );
}

function GrowthMetricMultiPicker({
 metrics,
 setMetrics
}: {
 metrics: GrowthMetricKey[];
 setMetrics: (metrics: GrowthMetricKey[]) => void;
}) {
 const toggleMetric = (metric: GrowthMetricKey) => {
  if (metrics.includes(metric)) {
   if (metrics.length === 1) return;
   setMetrics(metrics.filter((item) => item !== metric));
   return;
  }
  setMetrics([...metrics, metric]);
 };

 return (
  <fieldset className={styles.growthMetricPicker}>
   <legend>Indicateurs</legend>
   <div>
    {metricOptions.map((option) => (
     <button
      aria-pressed={metrics.includes(option.value)}
      key={option.value}
      type="button"
      onClick={() => toggleMetric(option.value)}
     >
      {option.label}
     </button>
    ))}
   </div>
  </fieldset>
 );
}

function ChartControls({
 metrics,
 setMetrics,
 chartType,
 setChartType,
 groupBy,
 setGroupBy
}: {
 metrics: GrowthMetricKey[];
 setMetrics: (metrics: GrowthMetricKey[]) => void;
 chartType: GrowthChartType;
 setChartType: (chartType: GrowthChartType) => void;
 groupBy: GrowthGroupBy;
 setGroupBy: (groupBy: GrowthGroupBy) => void;
}) {
 const updateChartType = (value: string) => setChartType(value as GrowthChartType);
 const updateGroupBy = (value: string) => setGroupBy(value as GrowthGroupBy);

 return (
  <section className={styles.growthChartControls} aria-label="Filtres graphique croissance">
   <GrowthMetricMultiPicker metrics={metrics} setMetrics={setMetrics} />
   <label>
    Type de graphique
    <select value={chartType} onInput={(event) => updateChartType(event.currentTarget.value)} onChange={(event) => updateChartType(event.target.value)}>
     {chartTypeOptions.map((option) => (
      <option key={option.value} value={option.value}>
       {option.label}
      </option>
     ))}
    </select>
   </label>
   <label>
    Groupement
    <select value={groupBy} onInput={(event) => updateGroupBy(event.currentTarget.value)} onChange={(event) => updateGroupBy(event.target.value)}>
     {groupByOptions.map((option) => (
      <option key={option.value} value={option.value}>
       {option.label}
      </option>
     ))}
    </select>
   </label>
  </section>
 );
}

function GrowthDynamicChart({ data }: { data: GrowthChartData }) {
 const max = Math.max(1, ...data.data.map((point) => point.value));
 const total = data.data.reduce((sum, point) => sum + point.value, 0);
 const pieStops = data.data.reduce(
  (result, point, index) => {
   const percentValue = total ? (point.value / total) * 100 : 0;
   const from = result.cursor;
   const to = from + percentValue;
   const color = ["#123885", "#d51b29", "#0b8554", "#dba23e", "#637188", "#7b61ff"][index % 6];
   return {
    cursor: to,
    stops: [...result.stops, `${color} ${from}% ${to}%`]
   };
  },
  { cursor: 0, stops: [] as string[] }
 ).stops.join(", ");

 if (data.empty || data.data.length === 0) {
  return <p className={styles.growthEmptyLine}>Aucune donnee disponible pour cet indicateur sur la periode selectionnee.</p>;
 }

 if (data.chartType === "pie") {
  return (
   <div className={styles.growthPieWrap}>
    <div className={styles.growthPie} style={{ background: `conic-gradient(${pieStops})` }} aria-hidden="true" />
    <div className={styles.growthPieLegend}>
     {data.data.map((point) => (
      <div key={point.label}>
       <span>{point.label}</span>
       <strong>{metricValue(data.metric, point.value)}</strong>
      </div>
     ))}
    </div>
   </div>
  );
 }

 if (data.chartType === "funnel") {
  return (
   <div className={styles.growthDynamicFunnel}>
    {data.data.map((point) => (
     <div key={point.label}>
      <span>{point.label}</span>
      <em aria-hidden="true">
       <i style={{ width: `${Math.max(5, (point.value / max) * 100)}%` }} />
      </em>
      <strong>{metricValue(data.metric, point.value)}</strong>
     </div>
    ))}
   </div>
  );
 }

 return (
  <div className={data.chartType === "line" ? styles.growthLineChart : styles.growthDynamicBars}>
   {data.data.map((point) => (
    <div key={point.label}>
     <span title={`${point.label} : ${metricValue(data.metric, point.value)}`}>
      <i style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }} />
     </span>
     <small>{point.label}</small>
     <strong>{metricValue(data.metric, point.value)}</strong>
    </div>
   ))}
  </div>
 );
}

function GrowthChartTab({
 chartState,
 metrics
}: {
 chartState: RemoteState<GrowthChartData[]>;
 metrics: GrowthMetricKey[];
}) {
 return (
  <div className={styles.growthChartStack}>
   {chartState.status === "loading" && !chartState.data ? (
    <section className={styles.growthPanel}>
     <p className={styles.growthEmptyLine}>Chargement des graphiques...</p>
    </section>
   ) : null}
   {chartState.status === "error" ? (
    <section className={styles.growthPanel}>
     <p className={styles.growthEmptyLine}>{chartState.error}</p>
    </section>
   ) : null}
   {chartState.data
    ? chartState.data.map((item) => (
      <section className={styles.growthPanel} key={item.metric}>
       <div className={styles.growthPanelHeader}>
        <div>
         <h2>{metricLabel(item.metric)}</h2>
         <p>Graphique calcule par le backend selon l'indicateur, la periode et le groupement choisis.</p>
        </div>
       </div>
       <GrowthDynamicChart data={item} />
      </section>
     ))
    : null}
   {!chartState.data && metrics.length === 0 ? (
    <section className={styles.growthPanel}>
     <p className={styles.growthEmptyLine}>Selectionne au moins un indicateur.</p>
    </section>
   ) : null}
  </div>
 );
}

function GrowthDetailsTable({ item }: { item: GrowthDetailsData }) {
 return (
  <section className={styles.growthPanel}>
   <div className={styles.growthPanelHeader}>
    <div>
     <h2>{metricLabel(item.metric)}</h2>
     <p>Detail filtre depuis le backend.</p>
    </div>
   </div>
   {item.empty ? (
    <p className={styles.growthEmptyLine}>Aucune donnee disponible pour cet indicateur sur la periode selectionnee.</p>
   ) : null}
   {!item.empty ? (
    <div className={styles.growthDetailsTable}>
     <div className={styles.growthDetailsHead}>
      <span>Date</span>
      <span>Client</span>
      <span>Source</span>
      <span>Statut</span>
      <span>Reference devis</span>
      <span>Montant</span>
      <span>Derniere action</span>
      <span>Relance prevue</span>
      <span>Action</span>
     </div>
     {item.data.map((row) => (
      <div className={styles.growthDetailsRow} key={row.id}>
       <span>{tableDate(row.date)}</span>
       <strong>{row.client}</strong>
       <span>{row.source}</span>
       <span>{row.status}</span>
       <span>{row.quoteReference}</span>
       <span>{row.amount === null ? "-" : euro(row.amount)}</span>
       <span>{tableDate(row.lastAction)}</span>
       <span>{tableDate(row.nextFollowup)}</span>
       <Link href={row.href}>{row.action}</Link>
      </div>
     ))}
    </div>
   ) : null}
  </section>
 );
}

function GrowthDetailsTab({
 detailsState,
 metrics
}: {
 detailsState: RemoteState<GrowthDetailsData[]>;
 metrics: GrowthMetricKey[];
}) {
 return (
  <div className={styles.growthChartStack}>
   {detailsState.status === "loading" && !detailsState.data ? (
    <section className={styles.growthPanel}>
     <p className={styles.growthEmptyLine}>Chargement des donnees...</p>
    </section>
   ) : null}
   {detailsState.status === "error" ? (
    <section className={styles.growthPanel}>
     <p className={styles.growthEmptyLine}>{detailsState.error}</p>
    </section>
   ) : null}
   {detailsState.data ? detailsState.data.map((item) => <GrowthDetailsTable item={item} key={item.metric} />) : null}
   {!detailsState.data && metrics.length === 0 ? (
    <section className={styles.growthPanel}>
     <p className={styles.growthEmptyLine}>Selectionne au moins un indicateur.</p>
    </section>
   ) : null}
  </div>
 );
}

export function GrowthDashboardClient() {
 const today = new Date().toISOString().slice(0, 10);
 const defaultFrom = useMemo(() => {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toISOString().slice(0, 10);
 }, []);
 const [filters, setFilters] = useState<Record<string, string>>({
  period: "30d",
  from: defaultFrom,
  to: today,
  source: "all",
  status: "all",
  urgency: "all",
  clientType: "all"
 });
 const [reloadKey, setReloadKey] = useState(0);
 const [state, setState] = useState<LoadState>({ status: "loading" });
 const [activeTab, setActiveTab] = useState<GrowthTab>("summary");
 const [selectedMetrics, setSelectedMetrics] = useState<GrowthMetricKey[]>(["requests_received"]);
 const [detailsMetrics, setDetailsMetrics] = useState<GrowthMetricKey[]>(["requests_received"]);
 const [chartType, setChartType] = useState<GrowthChartType>("line");
 const [groupBy, setGroupBy] = useState<GrowthGroupBy>("day");
 const [chartState, setChartState] = useState<RemoteState<GrowthChartData[]>>({ status: "idle" });
 const [detailsState, setDetailsState] = useState<RemoteState<GrowthDetailsData[]>>({ status: "idle" });
 const query = useMemo(() => buildQuery(filters), [filters]);
 const chartBaseParams = useMemo(
  () => ({
   period: filters.period,
   from: filters.from,
   to: filters.to,
   source: filters.source,
   status: filters.status,
   urgency: filters.urgency,
   clientType: filters.clientType,
   groupBy,
   chartType
  }),
  [chartType, filters.clientType, filters.from, filters.period, filters.source, filters.status, filters.to, filters.urgency, groupBy]
 );
 const detailsBaseParams = useMemo(
  () => ({
   period: filters.period,
   from: filters.from,
   to: filters.to,
   source: filters.source,
   status: filters.status,
   urgency: filters.urgency,
   clientType: filters.clientType
  }),
  [filters.clientType, filters.from, filters.period, filters.source, filters.status, filters.to, filters.urgency]
 );

 useEffect(() => {
  const controller = new AbortController();
  setState((previous) => ({ status: "loading", data: previous.data }));

  fetch(`/api/dashboard/growth${query ? `?${query}` : ""}`, { signal: controller.signal })
   .then(async (response) => {
    if (!response.ok) throw new Error("Impossible de charger les indicateurs.");
    return (await response.json()) as GrowthDashboardData;
   })
   .then((data) => setState({ status: "ready", data }))
   .catch((error: Error) => {
    if (error.name === "AbortError") return;
    setState((previous) => ({ status: "error", data: previous.data, error: error.message }));
   });

  return () => controller.abort();
 }, [query, reloadKey]);

 useEffect(() => {
  if (activeTab !== "chart") return;
  if (selectedMetrics.length === 0) {
   setChartState({ status: "ready", data: [] });
   return;
  }
  const controller = new AbortController();
  setChartState((previous) => ({ status: "loading", data: previous.data }));

  Promise.all(
   selectedMetrics.map((metric) => {
    const queryString = buildQuery({ ...chartBaseParams, metric });
    return fetch(`/api/dashboard/growth/chart?${queryString}`, { signal: controller.signal }).then(async (response) => {
     if (!response.ok) throw new Error("Impossible de charger les graphiques.");
     return (await response.json()) as GrowthChartData;
    });
   })
  )
   .then((data) => setChartState({ status: "ready", data }))
   .catch((error: Error) => {
    if (error.name === "AbortError") return;
    setChartState((previous) => ({ status: "error", data: previous.data, error: error.message }));
   });

  return () => controller.abort();
 }, [activeTab, chartBaseParams, selectedMetrics]);

 useEffect(() => {
  if (activeTab !== "details") return;
  if (detailsMetrics.length === 0) {
   setDetailsState({ status: "ready", data: [] });
   return;
  }
  const controller = new AbortController();
  setDetailsState((previous) => ({ status: "loading", data: previous.data }));

  Promise.all(
   detailsMetrics.map((metric) => {
    const queryString = buildQuery({ ...detailsBaseParams, metric });
    return fetch(`/api/dashboard/growth/details?${queryString}`, { signal: controller.signal }).then(async (response) => {
     if (!response.ok) throw new Error("Impossible de charger le detail des donnees.");
     return (await response.json()) as GrowthDetailsData;
    });
   })
  )
   .then((data) => setDetailsState({ status: "ready", data }))
   .catch((error: Error) => {
    if (error.name === "AbortError") return;
    setDetailsState((previous) => ({ status: "error", data: previous.data, error: error.message }));
   });

  return () => controller.abort();
 }, [activeTab, detailsBaseParams, detailsMetrics]);

 const showDetails = (metric: GrowthMetricKey) => {
  setDetailsMetrics([metric]);
  setActiveTab("details");
 };

 const data = state.data;
 const loading = state.status === "loading";

 return (
  <main className={styles.page} data-no-translate>
   <header className={styles.growthHero}>
    <div>
     <p className={styles.eyebrow}>Dashboard NeoTravel</p>
     <h1>Croissance commerciale</h1>
     <p>Suivi de la conversion des demandes, du premier contact au devis accepte.</p>
    </div>
    <div className={styles.growthHeroBadge}>
     <TrendingUp aria-hidden="true" size={20} />
     <span>{data ? data.period.label : "Chargement"}</span>
     {data ? <strong>{data.period.from} - {data.period.to}</strong> : null}
    </div>
   </header>

      <section className={styles.growthObjective}>
        <strong>Objectif</strong>
        <span>
          Piloter la performance commerciale, suivre la conversion des demandes et prioriser les opportunites generant
          le plus de valeur.
        </span>
      </section>

   <GrowthFilters filters={filters} setFilters={setFilters} refresh={() => setReloadKey((key) => key + 1)} loading={loading} />
   <GrowthTabs activeTab={activeTab} setActiveTab={setActiveTab} />

   {state.status === "error" ? (
    <section className={styles.growthError} role="alert">
     <strong>Erreur de chargement</strong>
     <span>{state.error}</span>
    </section>
   ) : null}

   {loading && !data ? (
    <section className={styles.growthLoading} aria-live="polite">
     Chargement des indicateurs commerciaux...
    </section>
   ) : null}

   {data ? (
    <>
     {data.empty ? (
      <section className={styles.growthEmptyState}>
       <h2>Aucune donnee commerciale disponible sur cette periode.</h2>
       <p>
        Les indicateurs se mettront a jour automatiquement des que des demandes, devis ou relances seront
        enregistres.
       </p>
      </section>
     ) : null}

     {activeTab === "summary" ? (
      <>
       <section className={styles.growthKpiGrid} aria-label="KPI croissance">
        <GrowthKpiCard
         label="Demandes recues"
         value={data.kpis.requestsReceived}
         detail={data.kpis.requestsEvolutionRate === null ? "Pas de periode precedente" : `${percent(data.kpis.requestsEvolutionRate)} vs precedent`}
         tone="blue"
         href="/dashboard/demandes?status=received"
        />
        <GrowthKpiCard
         label="Leads qualifies"
         value={data.kpis.qualifiedLeads}
         detail={`${percent(data.kpis.qualificationRate)} des demandes`}
         tone="green"
         href="/dashboard/demandes?status=qualified"
        />
        <GrowthKpiCard
         label="Delai lead -> devis"
         value={duration(data.kpis.averageLeadToQuoteMinutes)}
         detail="Moyenne sur devis generes"
         tone="gold"
         onShowDetails={() => showDetails("average_lead_to_quote_minutes")}
        />
        <GrowthKpiCard
         label="Devis generes"
         value={data.kpis.quotesGenerated}
         detail={euro(data.kpis.quotesAmount)}
         tone="blue"
         href="/dashboard/devis?status=generated"
        />
        <GrowthKpiCard
         label="Taux de conversion"
         value={percent(data.kpis.conversionRate)}
         detail="Acceptes / envoyes"
         tone="green"
         onShowDetails={() => showDetails("conversion_rate")}
        />
        <GrowthKpiCard
         label="CA potentiel"
         value={euro(data.kpis.potentialRevenue)}
         detail="Devis ouverts non refuses"
         tone="blue"
         href="/dashboard/devis?status=open"
        />
        <GrowthKpiCard
         label="CA gagne"
         value={euro(data.kpis.wonRevenue)}
         detail="Devis acceptes"
         tone="green"
         href="/dashboard/devis?status=accepted"
        />
        <GrowthKpiCard
         label="Relances en retard"
         value={data.kpis.overdueFollowups}
         detail={data.kpis.overdueFollowups > 0 ? "Action requise" : "Aucune alerte"}
         tone={data.kpis.overdueFollowups > 0 ? "red" : "green"}
         href="/dashboard/relances?status=overdue"
        />
       </section>

       <GrowthCharts data={data} />
       <GrowthFunnel data={data} />

       <div className={styles.growthTwoGrid}>
        <GrowthPerformanceTable data={data} />
        <section className={styles.growthPanel}>
         <div className={styles.growthPanelHeader}>
          <div>
           <h2>Reactivite commerciale</h2>
           <p>Delais moyens et dossiers en attente d'action.</p>
          </div>
         </div>
         <div className={styles.growthMetricList}>
          <div><span>Delai moyen premiere reponse</span><strong>{duration(data.reactivity.averageFirstResponseMinutes)}</strong></div>
          <div><span>Delai moyen qualification</span><strong>{duration(data.reactivity.averageQualificationMinutes)}</strong></div>
          <div><span>Delai moyen generation devis</span><strong>{duration(data.reactivity.averageQuoteGenerationMinutes)}</strong></div>
          <div><span>Leads traites rapidement</span><strong>{data.reactivity.fastHandledLeads}</strong></div>
          <div><span>En attente qualification</span><strong>{data.reactivity.pendingQualification}</strong></div>
          <div><span>Devis en attente d'envoi</span><strong>{data.reactivity.pendingQuoteSend}</strong></div>
         </div>
        </section>
       </div>

       <GrowthFollowups data={data} />
       <div className={styles.growthTwoGrid}>
        <GrowthSources data={data} />
        <GrowthAlerts data={data} />
       </div>
       <GrowthAutomationGain data={data} />
      </>
     ) : null}

     {activeTab === "chart" ? (
      <>
       <ChartControls
        metrics={selectedMetrics}
        setMetrics={setSelectedMetrics}
        chartType={chartType}
        setChartType={setChartType}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
       />
       <GrowthChartTab chartState={chartState} metrics={selectedMetrics} />
      </>
     ) : null}

     {activeTab === "details" ? (
      <>
       <section className={styles.growthChartControls} aria-label="Filtres detail croissance">
        <GrowthMetricMultiPicker metrics={detailsMetrics} setMetrics={setDetailsMetrics} />
       </section>
       <GrowthDetailsTab detailsState={detailsState} metrics={detailsMetrics} />
      </>
     ) : null}

    </>
   ) : null}
  </main>
 );
}
