import { getAuditLogs } from "@/features/admin/services/getAuditLogs";
import { getModelRuns } from "@/features/admin/services/getModelRuns";
import { getPricingAdminData } from "@/features/admin/services/getPricingRules";
import { getIntegrationsStatus } from "@/features/integrations/integrations";
import { humanReviewReasonLabel } from "@/features/human-review/reasonLabels";
import { listFollowups, listLeads, listQuotes } from "@/shared/lib/data";
import { isWonQuote, quoteOutcomeDisplay } from "@/features/dashboard/services/quoteOutcome";
import {
 formatCommercialDate,
 getLeadCommercialAction,
 latestQuoteByLeadId,
 leadDisplayName,
 leadRouteLabel,
 nextScheduledFollowup,
 quoteLabel
} from "@/features/dashboard/services/leadPipelinePresentation";
import { getDataMode } from "@/shared/lib/demo/demoMode";
import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import styles from "./dashboard.module.css";
import { AutomationWorkflowsManager } from "./AutomationWorkflowsManager";
import { CardList, DashboardHeader, DataTable, KpiGrid, Note, Panel } from "./DashboardPageKit";
import { PricingSettingsEditor } from "./PricingSettingsEditor";
import { StatusBadge } from "./StatusBadge";

function euro(value: number) {
 return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

const PRIORITY_STATUSES = new Set(["NEW", "INCOMPLETE", "HUMAN_REVIEW"]);
const QUALIFIED_LEAD_STATUSES = new Set<Lead["status"]>([
 "QUALIFIED",
 "HIGH_VALUE",
 "QUOTE_READY",
 "QUOTE_SENT",
 "FOLLOWUP_1",
 "FOLLOWUP_2",
 "FOLLOWUP_SCHEDULED",
 "WON"
]);

function filterLeadsByStatus(leads: Lead[], status?: string) {
 if (status === "qualified") return leads.filter((lead) => QUALIFIED_LEAD_STATUSES.has(lead.status));
 return leads;
}

function filterQuotesByStatus(quotes: Quote[], leadById: Map<string, Lead>, status?: string) {
 if (status === "open") return quotes.filter((quote) => quote.status === "QUOTE_READY" || quote.status === "QUOTE_SENT");
 if (status === "accepted") return quotes.filter((quote) => isWonQuote(quote, leadById.get(quote.leadId)));
 return quotes;
}

function filterFollowupsByStatus(followups: Followup[], status?: string) {
 if (status !== "overdue") return followups;
 const now = Date.now();
 return followups.filter((followup) => followup.status === "SCHEDULED" && new Date(followup.dueAt).getTime() < now);
}

export async function CommercialLeadsPage({ status }: { status?: string }) {
 const [leads, followups, quotes] = await Promise.all([listLeads(), listFollowups(), listQuotes()]);
 const visibleLeads = filterLeadsByStatus(leads, status);
 const toTreat = leads.filter((lead) => PRIORITY_STATUSES.has(lead.status)).length;
 const quoteByLeadId = latestQuoteByLeadId(quotes);

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Demandes"
    subtitle="Tous les prospects, leur statut, la priorité et la prochaine action."
    actionHref="/client/demande"
    actionLabel="Nouvelle demande"
   />
   <KpiGrid
    kpis={[
     { label: "Demandes", value: leads.length, tone: "blue" },
     { label: "À traiter", value: toTreat, tone: "red" },
     { label: "À valider", value: leads.filter((lead) => lead.status === "HUMAN_REVIEW").length, tone: "gold" },
     { label: "À compléter", value: leads.filter((lead) => lead.status === "INCOMPLETE").length, tone: "gold" }
    ]}
   />
   <Panel
    title="Toutes les demandes"
    subtitle="Chaque ligne est un dossier commercial : statut, blocage éventuel, devis et prochaine action."
   >
    {visibleLeads.length === 0 ? (
     <Note>Aucune demande pour ce filtre.</Note>
    ) : (
     <DataTable
      columns={["Dossier", "Trajet", "Statut", "Prochaine action", "Devis", "Relance"]}
      columnsTemplate="1.15fr 1.1fr .85fr 1.35fr .9fr .8fr"
      rows={visibleLeads.map((lead) => {
       const quote = quoteByLeadId.get(lead.id);
       const followup = nextScheduledFollowup(lead.id, followups);
       const action = getLeadCommercialAction({ lead, quote, followup });
       return {
        cells: [
         leadDisplayName(lead),
         leadRouteLabel(lead),
         <StatusBadge key="s" status={lead.status} />,
         action.label,
         quoteLabel(quote),
         followup ? formatCommercialDate(followup.dueAt) : "Aucune"
        ],
        href: `/dashboard/demandes/${lead.id}`,
        tone: action.tone === "critical" ? "review" : action.tone === "warning" ? "danger" : undefined
       };
      })}
     />
    )}
   </Panel>
  </main>
 );
}

export async function HumanReviewDashboardPage() {
 const [leads, quotes] = await Promise.all([listLeads(), listQuotes()]);
 const humanLeads = leads.filter((lead) => lead.status === "HUMAN_REVIEW");

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Validation humaine"
    subtitle="Dossiers repris par un commercial : informations à confirmer, cas urgents ou sensibles."
    actionHref="/dashboard/agenda-commerciaux"
    actionLabel="Voir l'agenda"
   />
   <KpiGrid
    kpis={[
     { label: "À valider", value: humanLeads.length, tone: "red" },
     { label: "Demandes totales", value: leads.length, tone: "blue" },
     { label: "Devis en attente", value: quotes.filter((quote) => quote.status === "QUOTE_READY").length, tone: "gold" },
     {
      label: "Avec date de départ",
      value: humanLeads.filter((lead) => lead.departureDate).length,
      tone: "blue"
     }
    ]}
   />
   <Panel
    title="Dossiers à reprendre"
    subtitle="Chaque dossier ici vient d'un lead passé « À valider ». Il est aussi placé dans l'agenda à sa date de départ."
   >
    {humanLeads.length === 0 ? (
     <Note>
      Aucun dossier à valider. Passez une demande au statut « À valider » depuis sa fiche pour la voir apparaître
      ici et dans l&apos;agenda.
     </Note>
    ) : (
     <DataTable
     columns={["Client", "Trajet", "Raison", "Date de départ", "Action"]}
     columnsTemplate="1.2fr 1fr 1.4fr 1fr .7fr"
     rows={humanLeads.map((lead) => ({
       cells: [
        leadDisplayName(lead),
        leadRouteLabel(lead),
        humanReviewReasonLabel(lead.humanReviewReason),
        lead.departureDate ? new Date(lead.departureDate).toLocaleDateString("fr-FR") : "À préciser",
        "Reprendre"
       ],
       href: `/dashboard/demandes/${lead.id}`,
       tone: "review"
      }))}
     />
    )}
   </Panel>
  </main>
 );
}

export async function QuotesDashboardPage({ status }: { status?: string }) {
 const [quotes, leads] = await Promise.all([listQuotes(), listLeads()]);
 const leadById = new Map(leads.map((lead) => [lead.id, lead]));
 const visibleQuotes = filterQuotesByStatus(quotes, leadById, status);
 const quoteTotal = quotes.reduce((sum, quote) => sum + quote.calculation.priceTtc, 0);
 const acceptedCount = quotes.filter((quote) => isWonQuote(quote, leadById.get(quote.leadId))).length;

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Devis"
    subtitle="Propositions générées, envoyées, acceptées ou refusées. Le prix vient uniquement du moteur de calcul."
   />
   <KpiGrid
    kpis={[
     { label: "Devis", value: quotes.length, tone: "blue" },
     { label: "Envoyés", value: quotes.filter((quote) => quote.status === "QUOTE_SENT").length, tone: "gold" },
     { label: "Acceptés", value: acceptedCount, tone: "green" },
     { label: "CA potentiel", value: euro(quoteTotal), tone: "blue" }
    ]}
   />
   <Panel title="Propositions">
    {visibleQuotes.length === 0 ? (
     <Note>Aucun devis pour ce filtre.</Note>
    ) : (
     <DataTable
      columns={["Devis", "Client", "Montant", "Statut", "Action"]}
      columnsTemplate="1fr 1.2fr .9fr 1fr .8fr"
      rows={visibleQuotes.map((quote) => {
       const lead = leadById.get(quote.leadId);
       const outcome = quoteOutcomeDisplay(quote, lead);
       return {
        cells: [
         quote.calculation.quoteNumber,
         leadDisplayName(lead),
         euro(quote.calculation.priceTtc),
         <StatusBadge key="s" status={outcome.status} />,
         "Ouvrir"
        ],
        href: `/client/devis/${quote.id}`
       };
      })}
     />
    )}
   </Panel>
   <Note>Le PDF et le dashboard affichent le devis existant : ils ne recalculent jamais les montants.</Note>
  </main>
 );
}

export async function FollowupsDashboardPage({ status }: { status?: string }) {
 const [followups, leads] = await Promise.all([listFollowups(), listLeads()]);
 const visibleFollowups = filterFollowupsByStatus(followups, status);
 const leadById = new Map(leads.map((lead) => [lead.id, lead]));
 const scheduled = followups.filter((followup) => followup.status === "SCHEDULED").length;

 return (
  <main className={styles.page}>
   <DashboardHeader title="Relances" subtitle="Planning des relances et de leur statut d'envoi, par demande." />
   <KpiGrid
    kpis={[
     { label: "Relances", value: followups.length, tone: "blue" },
     { label: "Programmées", value: scheduled, tone: "gold" },
     { label: "Envoyées", value: followups.filter((followup) => followup.status !== "SCHEDULED").length, tone: "green" }
    ]}
   />
   <Panel title="Planning des relances" subtitle="Chaque relance apparaît aussi dans l'Agenda à sa date d'échéance.">
    {visibleFollowups.length === 0 ? (
     <Note>Aucune relance pour ce filtre.</Note>
    ) : (
     <DataTable
      columns={["Dossier", "Devis", "Date", "Canal", "Statut"]}
      columnsTemplate="1.2fr 1fr .9fr .8fr 1fr"
      rows={visibleFollowups.map((followup) => {
       const lead = leadById.get(followup.leadId);
       return {
        cells: [
         leadDisplayName(lead),
         followup.quoteId ?? "Devis",
         new Date(followup.dueAt).toLocaleDateString("fr-FR"),
         followup.channel,
         <StatusBadge key="s" status={followup.status} />
        ],
        href: `/dashboard/demandes/${followup.leadId}`
       };
      })}
     />
    )}
   </Panel>
  </main>
 );
}

export async function CostsLogsDashboardPage() {
 const [logs, runs] = await Promise.all([getAuditLogs(), getModelRuns()]);
 const cost = runs.reduce((sum, run) => sum + (run.costEur ?? 0), 0);
 const latency = runs.reduce((sum, run) => sum + (run.latencyMs ?? 0), 0);

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Coûts & logs"
    subtitle="Appels IA, coûts, latence et journal d'audit des transitions métier."
   />
   <KpiGrid
    kpis={[
     { label: "Appels IA", value: runs.length, tone: "blue" },
     { label: "Coût cumulé", value: euro(cost), tone: "green" },
     { label: "Latence cumulée", value: `${latency} ms`, tone: "gold" },
     { label: "Événements d'audit", value: logs.length, tone: "blue" }
    ]}
   />
   <div className={styles.twoGrid}>
    <Panel title="Appels IA" subtitle="Chaque appel IA/mock avec son coût (table model_runs).">
     <DataTable
      columns={["Heure", "Usage", "Modèle", "Coût", "Statut"]}
      columnsTemplate="1fr 1.2fr 1.2fr .8fr .8fr"
      rows={runs.map((run) => ({
       cells: [
        new Date(run.createdAt).toLocaleTimeString("fr-FR"),
        run.purpose,
        run.model,
        euro(run.costEur ?? 0),
        run.status ?? "mock"
       ]
      }))}
     />
    </Panel>
    <Panel title="Journal d'audit" subtitle="Transitions métier tracées avec empreintes (table audit_logs).">
     <DataTable
      columns={["Heure", "Acteur", "Action", "Objet"]}
      columnsTemplate="1fr .8fr 1.4fr 1fr"
      rows={logs.map((log) => ({
       cells: [new Date(log.createdAt).toLocaleTimeString("fr-FR"), log.actor, log.action, log.entityType]
      }))}
     />
    </Panel>
   </div>
  </main>
 );
}

export async function AdminOverviewDashboardPage() {
 const [leads, quotes, followups, logs, runs] = await Promise.all([
  listLeads(),
  listQuotes(),
  listFollowups(),
  getAuditLogs(),
  getModelRuns()
 ]);
 const integrations = getIntegrationsStatus();
 const connected = integrations.filter((integration) => integration.connected).length;
 const supabase = getDataMode() === "supabase";
 const aiCost = runs.reduce((sum, run) => sum + (run.costEur ?? 0), 0);
 const toTreat = leads.filter((lead) => ["NEW", "INCOMPLETE", "HUMAN_REVIEW"].includes(lead.status)).length;
 const leadById = new Map(leads.map((lead) => [lead.id, lead]));
 const acceptedCount = quotes.filter((quote) => isWonQuote(quote, leadById.get(quote.leadId))).length;

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Vue admin"
    subtitle="Supervision en direct : source des données, état des connexions, activité commerciale et coûts IA."
   />
   <KpiGrid
    kpis={[
     { label: "Source des données", value: supabase ? "Supabase" : "Démo", tone: supabase ? "green" : "gold" },
     { label: "Connexions actives", value: `${connected}/${integrations.length}`, tone: "blue" },
     { label: "Appels IA", value: runs.length, tone: "blue" },
     { label: "Coût IA cumulé", value: euro(aiCost), tone: "green" }
    ]}
   />
   <div className={styles.grid}>
    <Panel title="État des connexions" subtitle="Statut réel de chaque intégration.">
     <DataTable
      columns={["Intégration", "Statut", "Détail"]}
      columnsTemplate="1.3fr .8fr 1.6fr"
      rows={integrations.map((integration) => ({
       cells: [integration.name, integration.connected ? "Connecte" : "Non connecte", integration.detail]
      }))}
     />
    </Panel>
    <aside className={styles.sideStack}>
     <Panel title="Activité commerciale" subtitle="Volumes réels du moment.">
      <CardList
       items={[
        { title: `${leads.length} demandes`, body: `${toTreat} à traiter actuellement.`, tone: "blue" },
        {
         title: `${quotes.length} devis`,
         body: `${quotes.filter((quote) => quote.status === "QUOTE_SENT").length} envoyés · ${acceptedCount} acceptés.`,
         tone: "green"
        },
        {
         title: `${followups.length} relances`,
         body: `${followups.filter((followup) => followup.status === "SCHEDULED").length} programmées.`,
         tone: "gold"
        }
       ]}
      />
     </Panel>
     <Panel title="Traçabilité" subtitle="Preuve d'audit conservée.">
      <CardList
       items={[
        {
         title: `${logs.length} événements d'audit`,
         body: "Transitions métier journalisées avec empreintes d'intégrité.",
         tone: "blue"
        }
       ]}
      />
     </Panel>
    </aside>
   </div>
   <Note>Le prix vient uniquement de calculerDevis() ; les cas sensibles passent en validation humaine.</Note>
  </main>
 );
}

export async function PricingDashboardPage() {
 const { pricingRules } = await getPricingAdminData();

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Tarification"
    subtitle="Tarifs déterministes modifiables manuellement. Le prix n'est jamais calculé par l'IA."
   />
   <PricingSettingsEditor pricingRules={pricingRules} />
   <Note>Toute modification d'un tarif doit être testée et auditée avant mise en production.</Note>
  </main>
 );
}

export async function AutomationsDashboardPage() {
 const [followups, quotes] = await Promise.all([listFollowups(), listQuotes()]);
 const integrations = getIntegrationsStatus();
 const n8nOn = Boolean(integrations.find((integration) => integration.id === "n8n")?.connected);
 const scheduled = followups.filter((followup) => followup.status === "SCHEDULED").length;
 const sent = followups.filter((followup) => followup.status !== "SCHEDULED").length;
 const quotesReady = quotes.filter((quote) => quote.status === "QUOTE_READY").length;
 const statusLabel = n8nOn ? "Actif" : "Simule (demo)";

 const workflows: Array<[string, string, string]> = [
  ["Envoi de devis", "Devis prêt", "Email au client"],
  ["Relance J+2 (urgent)", "Sans réponse", "Email de relance"],
  ["Relance J+7", "Standard", "Email de relance"],
  ["Notification validation", "Passage en validation humaine", "Alerte interne"]
 ];

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Automatisations"
    subtitle="Gestion des workflows, relances et notifications."
   />
   <KpiGrid
    kpis={[
     { label: "n8n", value: n8nOn ? "Connecte" : "Non connecte", tone: n8nOn ? "green" : "red" },
     { label: "Relances programmées", value: scheduled, tone: "gold" },
     { label: "Relances envoyées", value: sent, tone: "blue" },
     { label: "Devis prêts à envoyer", value: quotesReady, tone: "blue" }
    ]}
   />
   <AutomationWorkflowsManager workflows={workflows} statusLabel={statusLabel} />
  </main>
 );
}

export async function AdminAiCostsDashboardPage() {
 const runs = await getModelRuns();
 const integrations = getIntegrationsStatus();
 const aiOn = Boolean(integrations.find((integration) => integration.id === "ai")?.connected);
 const cost = runs.reduce((sum, run) => sum + (run.costEur ?? 0), 0);
 const errors = runs.filter((run) => run.status === "error").length;

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Coûts IA"
    subtitle="Fournisseur, modèle et coûts. Le MVP peut tourner en mock, sans aucun coût."
   />
   <KpiGrid
    kpis={[
     { label: "Fournisseur IA", value: aiOn ? "Connecte" : "Mock", tone: aiOn ? "green" : "gold" },
     { label: "Modèle", value: runs[0]?.model ?? "mock", tone: "blue" },
     { label: "Coût cumulé", value: euro(cost), tone: "green" },
     { label: "Appels en erreur", value: errors, tone: errors > 0 ? "red" : "green" }
    ]}
   />
   <Panel title="Détail des appels" subtitle="Usage, modèle, coût et issue de chaque appel.">
    <DataTable
     columns={["Heure", "Usage", "Modèle", "Coût", "Statut"]}
     columnsTemplate="1fr 1.2fr 1.2fr .8fr .8fr"
     rows={runs.map((run) => ({
      cells: [
       new Date(run.createdAt).toLocaleTimeString("fr-FR"),
       run.purpose,
       run.model,
       euro(run.costEur ?? 0),
       run.status ?? "mock"
      ]
     }))}
    />
   </Panel>
   <Note>En cas d'échec IA ou de cas sensible, le dossier bascule en validation humaine — jamais de décision automatique opaque.</Note>
  </main>
 );
}

export async function RgpdAuditDashboardPage() {
 const logs = await getAuditLogs();
 const entities = new Set(logs.map((log) => log.entityType)).size;
 const withHash = logs.filter((log) => log.inputHash && log.outputHash).length;

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Audit RGPD"
    subtitle="Données minimales, conservation maîtrisée et preuve d'audit sans aucun secret en clair."
   />
   <KpiGrid
    kpis={[
     { label: "Événements d'audit", value: logs.length, tone: "blue" },
     { label: "Types d'entités tracés", value: entities, tone: "blue" },
     { label: "Avec empreinte", value: `${withHash}/${logs.length}`, tone: "green" },
     { label: "Secrets affichés", value: "0", tone: "green" }
    ]}
   />
   <Panel title="Preuve d'audit" subtitle="Dernières transitions journalisées avec empreintes d'intégrité.">
    <DataTable
     columns={["Date", "Acteur", "Action", "Objet", "Empreinte"]}
     columnsTemplate="1.2fr .7fr 1.4fr 1fr .7fr"
     rows={logs.slice(0, 8).map((log) => ({
      cells: [
       new Date(log.createdAt).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
       }),
       log.actor,
       log.action,
       log.entityType,
       log.inputHash ? "Oui" : "—"
      ]
     }))}
    />
   </Panel>
   <Panel title="Données & conservation" subtitle="Politique de minimisation appliquée.">
    <DataTable
     columns={["Donnée", "Usage", "Conservation", "Base légale"]}
     rows={[
      { cells: ["Email prospect", "Devis + relance", "Durée du MVP", "Intérêt légitime"] },
      { cells: ["Message brut", "Qualification", "Limitée", "Exécution de la demande"] },
      { cells: ["Empreintes (hash)", "Preuve d'audit", "Longue", "Intégrité"] },
      { cells: ["Payload n8n", "Notification", "Nettoyé", "Opérationnel"] }
     ]}
    />
   </Panel>
   <Note>Minimisation : les secrets et jetons ne sont jamais affichés. Audit : chaque transition clé crée un log avec empreinte entrée/sortie.</Note>
  </main>
 );
}

export async function GrowthDashboardPage() {
 const [leads, quotes] = await Promise.all([listLeads(), listQuotes()]);

 const total = leads.length;
 const qualifiedStatuses = [
  "QUALIFIED",
  "HIGH_VALUE",
  "QUOTE_READY",
  "QUOTE_SENT",
  "FOLLOWUP_1",
  "FOLLOWUP_2",
  "FOLLOWUP_SCHEDULED",
  "WON",
  "LOST",
  "CLOSED"
 ];
 const qualified = leads.filter((lead) => qualifiedStatuses.includes(lead.status)).length;
 const quoted = quotes.length;
 const leadById = new Map(leads.map((lead) => [lead.id, lead]));
 const wonQuotes = quotes.filter((quote) => isWonQuote(quote, leadById.get(quote.leadId)));
 const accepted = wonQuotes.length;
 const caPotentiel = quotes.reduce((sum, quote) => sum + quote.calculation.priceTtc, 0);
 const caGagne = wonQuotes.reduce((sum, quote) => sum + quote.calculation.priceTtc, 0);
 const convRate = quoted > 0 ? Math.round((accepted / quoted) * 100) : 0;

 const funnel = [
  { label: "Demandes reçues", value: total },
  { label: "Demandes qualifiées", value: qualified },
  { label: "Devis générés", value: quoted },
  { label: "Devis acceptés", value: accepted }
 ];
 const max = Math.max(1, ...funnel.map((stage) => stage.value));

 return (
  <main className={styles.page}>
   <DashboardHeader title="Croissance" subtitle="Conversion réelle, du premier contact au devis accepté." />
   <KpiGrid
    kpis={[
     { label: "Demandes", value: total, tone: "blue" },
     { label: "Taux de conversion", value: `${convRate}%`, tone: "green" },
     { label: "CA potentiel", value: euro(caPotentiel), tone: "blue" },
     { label: "CA gagné", value: euro(caGagne), tone: "green" }
    ]}
   />
   <Panel title="Entonnoir commercial" subtitle="Chaque étape avec son volume réel et sa part des demandes.">
    <DataTable
     columns={["Étape", "Volume", "Part des demandes"]}
     columnsTemplate="1.4fr .6fr 1.6fr"
     rows={funnel.map((stage) => ({
      cells: [
       stage.label,
       stage.value,
       <span className={styles.funnelCell} key="bar">
        <span className={styles.funnelBar}>
         <span style={{ width: `${Math.round((stage.value / max) * 100)}%` }} />
        </span>
        <em>{total > 0 ? Math.round((stage.value / total) * 100) : 0}%</em>
       </span>
      ]
     }))}
    />
   </Panel>
   <Note>Le gain d'automatisation se lit comme du temps libéré pour les cas complexes, pas comme une réduction d'effectif.</Note>
  </main>
 );
}
