import type { Lead } from "@/shared/types/lead";
import { classifyLead, currentStage, PIPELINE_STAGES } from "../leadPipeline";
import styles from "./leadPipeline.module.css";

export function LeadProcessFlow({ lead }: { lead: Lead }) {
 const stage = currentStage(lead);
 const routing = classifyLead(lead);
 const activeIndex = PIPELINE_STAGES.findIndex((item) => item.key === stage);

 return (
  <section className={styles.flow} aria-label="Parcours de traitement de la demande">
   <div className={styles.flowHead}>
    <div>
     <p className={styles.kicker}>Process</p>
     <h2>Parcours de la demande</h2>
    </div>
    <span className={styles.routing} data-routing={routing.routing}>
     {routing.routing === "AI_AUTO"
      ? "Traitement IA automatique"
      : routing.routing === "INCOMPLETE"
       ? "À compléter"
       : "Reprise humaine"}
    </span>
   </div>

   <ol className={styles.stepper}>
    {PIPELINE_STAGES.map((item, index) => {
     const state = index < activeIndex ? "done" : index === activeIndex ? "current" : "todo";

     return (
      <li key={item.key} className={styles.step} data-state={state}>
       <span className={styles.stepDot}>{index + 1}</span>
       <strong>{item.label}</strong>
       <small>{item.hint}</small>
      </li>
     );
    })}
   </ol>

   <p className={styles.routingReason}>
    <strong>Classement :</strong> {routing.reason}
   </p>
  </section>
 );
}
