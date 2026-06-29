import type { Lead } from "@/shared/types/lead";
import styles from "./lead-detail.module.css";

export function LeadHistory({ lead }: { lead: Lead }) {
 return (
  <section className={styles.sideCard} aria-labelledby="timeline-title">
   <h2 id="timeline-title">Controle avant devis</h2>
   <p>{lead.aiSummary ?? "Qualification en cours."}</p>

   <div className={styles.guard}>
    Prix non calculé par l&apos;IA. Cas complexe ou données faibles : reprise humaine obligatoire.
   </div>

   <ol className={styles.timeline}>
    <li>
     <span>1</span>
     Message prospect extrait et normalise.
    </li>
    <li>
     <span>2</span>
     Champs obligatoires controles avant pricing.
    </li>
    <li>
     <span>3</span>
     Route et capacité vérifiées pour devis ou validation humaine.
    </li>
   </ol>
  </section>
 );
}
