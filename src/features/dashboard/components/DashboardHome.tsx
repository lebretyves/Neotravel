import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { currentDataMode, listAuditLogs, listFollowups, listLeads, listQuotes } from "@/shared/lib/data";
import type { Lead, LeadStatus } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import {
 formatCommercialDate,
 formatEuro,
 getLeadCommercialAction,
 latestQuoteByLeadId,
 leadDisplayName,
 leadRouteLabel,
 nextScheduledFollowup,
 quoteLabel
} from "@/features/dashboard/services/leadPipelinePresentation";
import { DashboardHeader, DataTable, Note, Panel } from "./DashboardPageKit";
import { StatusBadge } from "./StatusBadge";
import dashStyles from "./dashboard.module.css";
import styles from "./dashboardHome.module.css";

type NextAction = {
 id: string;
 client: string;
 status: string;
 what: string;
 cta: string;
 href: string;
 priority: number;
};

const QUOTEABLE_STATUSES = new Set<LeadStatus>(["QUALIFIED", "HIGH_VALUE"]);

function formatDateTime(value: string | null | undefined) {
 if (!value) return "—";
 return new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
 }).format(new Date(value));
}

function quoteTotal(quote: Quote) {
 return quote.calculation.priceTtc ?? quote.calculation.totalAmount ?? 0;
}

function buildNextActions(leads: Lead[], quotes: Quote[], followups: Parameters<typeof nextScheduledFollowup>[1]) {
 const actions: NextAction[] = [];
 const quoteByLeadId = latestQuoteByLeadId(quotes);
 const now = Date.now();

 for (const lead of leads) {
  const quote = quoteByLeadId.get(lead.id);
  const followup = nextScheduledFollowup(lead.id, followups);
  const action = getLeadCommercialAction({ lead, quote, followup, now });
  if (action.priority > 6) continue;
  actions.push({
   id: lead.id,
   client: leadDisplayName(lead),
   status: lead.status,
   what: action.label,
   cta: action.cta,
   href: action.href,
   priority: action.priority
  });
 }

 for (const followup of followups) {
  if (followup.status !== "SCHEDULED") continue;
  const dueAt = new Date(followup.dueAt).getTime();
  const lead = leads.find((item) => item.id === followup.leadId);
  if (lead) continue;
  actions.push({
   id: `followup-${followup.id}`,
   client: "Lead introuvable",
   status: "SCHEDULED",
   what: dueAt < now ? "Relance en retard" : `Relance prévue le ${formatCommercialDate(followup.dueAt)}`,
   cta: "Relancer",
   href: `/dashboard/demandes/${followup.leadId}`,
   priority: dueAt < now ? 0 : 5
  });
 }

 return actions.sort((a, b) => a.priority - b.priority).slice(0, 8);
}

function countByStatus(leads: Lead[], statuses: LeadStatus[]) {
 return leads.filter((lead) => statuses.includes(lead.status)).length;
}

export async function DashboardHome() {
 const [leads, quotes, followups, auditLogs] = await Promise.all([
  listLeads(),
  listQuotes(),
  listFollowups(),
  listAuditLogs()
 ]);

 const mode = currentDataMode();
 const quoteByLeadId = latestQuoteByLeadId(quotes);
 const actions = buildNextActions(leads, quotes, followups);
 const scheduledFollowups = followups.filter((followup) => followup.status === "SCHEDULED");
 const overdueFollowups = scheduledFollowups.filter((followup) => new Date(followup.dueAt).getTime() < Date.now());
 const quoteVolume = quotes.reduce((sum, quote) => sum + quoteTotal(quote), 0);
 const humanReviewCount = countByStatus(leads, ["HUMAN_REVIEW"]);
 const incompleteCount = countByStatus(leads, ["INCOMPLETE"]);
 const quoteableCount = leads.filter((lead) => QUOTEABLE_STATUSES.has(lead.status) && !quoteByLeadId.has(lead.id)).length;
 const quoteReadyCount = quotes.filter((quote) => quote.status === "QUOTE_READY").length;
 const pipelineGroups = [
  {
   label: "À qualifier",
   value: countByStatus(leads, ["NEW", "INCOMPLETE"]),
   href: "/dashboard/demandes",
   hint: `${incompleteCount} incomplète(s)`
  },
  {
   label: "À valider",
   value: humanReviewCount,
   href: "/dashboard/human-review",
   hint: "Reprise humaine"
  },
  {
   label: "À deviser",
   value: quoteableCount,
   href: "/dashboard/demandes?status=qualified",
   hint: "Qualifiées sans devis"
  },
  {
   label: "Devis prêts",
   value: quoteReadyCount,
   href: "/dashboard/devis?status=open",
   hint: formatEuro(quoteVolume)
  }
 ];

 return (
  <main className={dashStyles.page}>
   <DashboardHeader
    title="Pilotage commercial"
    subtitle="Vue opérationnelle du pipeline NeoTravel : demandes, devis, relances et actions à reprendre."
    actionHref="/client/demande"
    actionLabel="Nouvelle demande"
   />

   <div className={styles.sourceBar} data-mode={mode}>
    <strong>Source données : {mode === "supabase" ? "Supabase" : "mode démo local"}</strong>
    <span>{mode === "supabase" ? "Données réelles" : "Données demoStore"}</span>
   </div>

   <section className={styles.overviewGrid} aria-label="Priorités commerciales">
    <Panel title="À faire maintenant" subtitle="File priorisée : validation humaine, demandes incomplètes, relances en retard.">
     {actions.length === 0 ? (
      <div className={styles.empty}>
       <strong>Aucune action urgente</strong>
       <span>Les nouvelles demandes, reprises humaines et relances apparaîtront ici automatiquement.</span>
      </div>
     ) : (
      <ul className={styles.actionList}>
       {actions.map((action) => (
        <li key={action.id} className={styles.actionRow}>
         <span className={styles.actionStatus}>
          <StatusBadge status={action.status} />
         </span>
         <span className={styles.actionInfo}>
          <strong>{action.client}</strong>
          <small>{action.what}</small>
         </span>
         <Link className={styles.actionCta} href={action.href}>
          {action.cta}
          <ArrowRight aria-hidden="true" size={15} />
         </Link>
        </li>
       ))}
      </ul>
     )}
    </Panel>

    <aside className={styles.healthStack} aria-label="Indicateurs clés">
     <Link className={styles.healthCard} href="/dashboard/human-review" data-tone={humanReviewCount > 0 ? "critical" : "neutral"}>
      <span>Validation humaine</span>
      <strong>{humanReviewCount}</strong>
      <small>Dossiers bloquants</small>
     </Link>
     <Link className={styles.healthCard} href="/dashboard/demandes?status=qualified">
      <span>Devis à générer</span>
      <strong>{quoteableCount}</strong>
      <small>Demandes qualifiées</small>
     </Link>
     <Link className={styles.healthCard} href="/dashboard/relances?status=overdue" data-tone={overdueFollowups.length > 0 ? "warning" : "neutral"}>
      <span>Relances en retard</span>
      <strong>{overdueFollowups.length}</strong>
      <small>{scheduledFollowups.length} programmée(s)</small>
     </Link>
    </aside>
   </section>

   <nav className={styles.pipelineStrip} aria-label="Résumé du pipeline">
    {pipelineGroups.map((group) => (
     <Link key={group.label} className={styles.pipelineItem} href={group.href}>
      <span>{group.label}</span>
      <strong>{group.value}</strong>
      <small>{group.hint}</small>
     </Link>
    ))}
   </nav>

   <Panel title="Pipeline centralisé" subtitle="Une seule lecture par demande : statut, devis, relance et prochaine action.">
   {leads.length === 0 ? (
     <Note>Aucune demande enregistrée pour l’instant.</Note>
    ) : (
     <DataTable
      columns={["Dossier", "Trajet", "Statut", "Prochaine action", "Devis", "Relance"]}
      columnsTemplate="1.15fr 1.2fr .85fr 1.25fr .95fr .85fr"
      rows={leads.slice(0, 12).map((lead) => {
       const quote = quoteByLeadId.get(lead.id);
       const followup = nextScheduledFollowup(lead.id, followups);
       const action = getLeadCommercialAction({ lead, quote, followup });
       return {
        cells: [
         leadDisplayName(lead),
         leadRouteLabel(lead),
         <StatusBadge key="status" status={lead.status} />,
         <span className={styles.nextAction} data-tone={action.tone} key="action">
          <strong>{action.label}</strong>
          <small>{action.detail}</small>
         </span>,
         quoteLabel(quote),
         followup ? formatCommercialDate(followup.dueAt) : "Aucune"
        ],
        href: `/dashboard/demandes/${lead.id}`
       };
      })}
     />
    )}
   </Panel>

   <Panel title="Traçabilité récente" subtitle="Dernières actions système ou commerciales, pour prouver ce qui a déjà été fait.">
    {auditLogs.length === 0 ? (
     <Note>Aucun événement d’audit enregistré.</Note>
    ) : (
     <DataTable
      columns={["Heure", "Acteur", "Action", "Objet"]}
      columnsTemplate=".8fr .7fr 1.35fr .8fr"
      rows={auditLogs.slice(0, 8).map((log) => ({
       cells: [formatDateTime(log.createdAt), log.actor, log.action, log.entityType],
       href: log.entityType === "lead" ? `/dashboard/demandes/${log.entityId}` : undefined
      }))}
     />
    )}
   </Panel>
  </main>
 );
}
