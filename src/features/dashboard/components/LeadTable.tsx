import Link from "next/link";
import { mockLeads } from "@/data/mock-leads";
import styles from "./dashboard.module.css";
import { StatusBadge } from "./StatusBadge";

export function LeadTable() {
 return (
  <main className={styles.page}>
   <header className={styles.header}>
    <div>
     <p className={styles.eyebrow}>Parcours pro après landing</p>
     <h1>Demandes qualifiées</h1>
     <p>Vue opérationnelle des prospects : statut, trajet, prochaine action et accès fiche détaillée.</p>
    </div>
    <Link className={styles.primary} href="/client/demande">
     Nouvelle demande démo
    </Link>
   </header>

   <section className={styles.panel} aria-labelledby="lead-table-title">
    <div className={styles.panelHeader}>
     <div>
      <h2 id="lead-table-title">Pipeline demandes</h2>
      <p>Les cas complexes restent en validation humaine, les demandes complètes avancent vers devis et relances.</p>
     </div>
     <Link className={styles.secondary} href="/dashboard/human-review">
      File validation humaine
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
  </main>
 );
}
