import Link from "next/link";
import { mockLeads } from "@/data/mock-leads";
import styles from "./dashboard.module.css";
import { StatusBadge } from "./StatusBadge";

export function LeadTable() {
 return (
  <main className={styles.page}>
   <header className={styles.header}>
    <div>
     <p className={styles.eyebrow}>Parcours pro apres landing</p>
     <h1>Demandes qualifiees</h1>
     <p>Vue operationnelle des prospects : statut, trajet, prochaine action et acces fiche detaillee.</p>
    </div>
    <Link className={styles.primary} href="/client/demande">
     Nouvelle demande demo
    </Link>
   </header>

   <section className={styles.panel} aria-labelledby="lead-table-title">
    <div className={styles.panelHeader}>
     <div>
      <h2 id="lead-table-title">Pipeline demandes</h2>
      <p>Les cas complexes restent en human review, les demandes completes avancent vers devis et relances.</p>
     </div>
     <Link className={styles.secondary} href="/dashboard/human-review">
      File human review
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
     {mockLeads.map((lead) => (
      <div className={styles.row} key={lead.id}>
       <span>
        <strong>{lead.organization ?? "Organisation inconnue"}</strong>
        <small>{lead.email ?? "Email manquant"}</small>
       </span>
       <span>
        {lead.departureCity ?? "?"} - {lead.arrivalCity ?? "?"}
       </span>
       <span>{lead.departureDate ?? "A confirmer"}</span>
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
  </main>
 );
}
