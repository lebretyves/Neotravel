import Link from "next/link";
import { demoScenarios } from "@/data/demo-scenarios";
import { mockFollowups } from "@/data/mock-followups";
import { mockLeads } from "@/data/mock-leads";
import { mockQuotes } from "@/data/mock-quotes";
import styles from "./dashboard.module.css";
import { StatusBadge } from "./StatusBadge";

export function PipelineStats() {
 const kpis = [
  ["Demandes", mockLeads.length],
  ["Validation humaine", mockLeads.filter((lead) => lead.status === "HUMAN_REVIEW").length],
  ["Devis envoyés", mockQuotes.filter((quote) => quote.status === "QUOTE_SENT").length],
  ["Relances", mockFollowups.filter((followup) => followup.status === "SCHEDULED").length]
 ];
 const hotLeads = mockLeads.slice(0, 5);

 return (
  <main className={styles.page}>
   <header className={styles.header}>
    <div>
     <p className={styles.eyebrow}>Parcours pro après landing</p>
     <h1>Dashboard équipe</h1>
     <p>Vue de pilotage MVP : demandes, devis, relances, reprises humaines et scénarios de soutenance.</p>
    </div>
    <Link className={styles.primary} href="/dashboard/demandes/demo-lead-alpha">
     Ouvrir dossier démo
    </Link>
   </header>

   <section className={styles.kpiGrid} aria-label="Indicateurs dashboard">
    {kpis.map(([label, value]) => (
     <article className={styles.kpi} key={label}>
      <span>{label}</span>
      <strong>{value}</strong>
     </article>
    ))}
   </section>

   <div className={styles.grid}>
    <section className={styles.panel} aria-labelledby="team-pipeline-title">
     <div className={styles.panelHeader}>
      <div>
       <h2 id="team-pipeline-title">Activité commerciale</h2>
       <p>Les boutons ouvrent les vues métier existantes, sans recalcul de prix hors moteur.</p>
      </div>
      <Link className={styles.secondary} href="/dashboard/demandes">
       Voir tout
      </Link>
     </div>

     <div className={styles.table}>
      <div className={styles.tableHead}>
       <span>Prospect</span>
       <span>Trajet</span>
       <span>Date</span>
       <span>Statut</span>
       <span>Action</span>
      </div>
      {hotLeads.map((lead) => (
       <div className={styles.row} key={lead.id}>
        <span>
         <strong>{lead.organization ?? "À compléter"}</strong>
         <small>{lead.aiSummary ?? "Qualification en cours"}</small>
        </span>
        <span>
         {lead.departureCity ?? "?"} - {lead.arrivalCity ?? "?"}
        </span>
        <span>{lead.departureDate ?? "À confirmer"}</span>
        <span>
         <StatusBadge status={lead.status} />
        </span>
        <Link className={styles.secondary} href={`/dashboard/demandes/${lead.id}`}>
         Ouvrir
        </Link>
       </div>
      ))}
     </div>
    </section>

    <aside className={styles.sideStack}>
     <section className={styles.panel} aria-labelledby="scenario-title">
      <div className={styles.panelHeader}>
       <div>
        <h2 id="scenario-title">Scénarios démo</h2>
        <p>Kick-off : les cas servent de pistes de soutenance.</p>
       </div>
      </div>
      <ul className={styles.scenarioList}>
       {demoScenarios.slice(0, 5).map((scenario) => (
        <li key={scenario.id}>
         <strong>{scenario.title}</strong>
         <span>{scenario.expectedResult}</span>
        </li>
       ))}
      </ul>
     </section>

     <section className={styles.panel} aria-labelledby="links-title">
      <div className={styles.panelHeader}>
       <div>
        <h2 id="links-title">Accès rapides</h2>
        <p>Suivi client, relances et reprise humaine.</p>
       </div>
      </div>
      <ul className={styles.scenarioList}>
       <li>
        <Link className={styles.secondary} href="/dashboard/relances">
         Relances
        </Link>
       </li>
       <li>
        <Link className={styles.secondary} href="/dashboard/human-review">
         Validation humaine
        </Link>
       </li>
      </ul>
     </section>
    </aside>
   </div>
  </main>
 );
}
