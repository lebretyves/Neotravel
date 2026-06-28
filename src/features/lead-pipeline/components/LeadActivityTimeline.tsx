import type { Lead } from "@/shared/types/lead";
import { getLeadActivity } from "../leadActivity";
import type { LeadActivityType } from "../types";
import styles from "./leadPipeline.module.css";

const TONE: Record<LeadActivityType, string> = {
 CREATED: "new",
 EXTRACTED: "info",
 VERIFIED: "info",
 CLASSIFIED_AI: "success",
 CLASSIFIED_HUMAN: "danger",
 CLASSIFIED_INCOMPLETE: "warning",
 QUOTE_SENT: "info",
 FOLLOWUP: "warning",
 WON: "success",
 LOST: "danger",
 NOTE: "muted"
};

function timeAgo(iso: string) {
 const diffMin = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
 if (diffMin < 60) return `il y a ${diffMin} min`;
 const hours = Math.round(diffMin / 60);
 if (hours < 24) return `il y a ${hours} h`;
 return new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
 }).format(new Date(iso));
}

export function LeadActivityTimeline({ lead }: { lead: Lead }) {
 const activity = getLeadActivity(lead);

 return (
  <section className={styles.logCard} aria-label="Journal de traitement de la demande">
   <div className={styles.logHead}>
    <h2>Journal de traitement</h2>
   </div>

   <ol className={styles.timeline}>
    {activity.map((event) => (
     <li key={event.id} className={styles.event}>
      <span className={styles.eventDot} data-tone={TONE[event.type]} aria-hidden="true" />
      <div className={styles.eventBody}>
       <div className={styles.eventTop}>
        <strong>{event.label}</strong>
        <time>{timeAgo(event.at)}</time>
       </div>
       {event.detail ? <p>{event.detail}</p> : null}
       <small>{event.actor}</small>
      </div>
     </li>
    ))}
   </ol>
  </section>
 );
}
