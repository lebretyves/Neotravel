import type { Lead } from "@/shared/types/lead";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import { LeadRouteMap } from "./LeadRouteMap";
import styles from "./lead-detail.module.css";

export function LeadMessages({ lead }: { lead: Lead }) {
 const confidenceValue = lead.confidence;
 const confidence = typeof confidenceValue === "number" ? Math.round(confidenceValue * 100) : null;
 const routeLabel =
  lead.departureCity && lead.arrivalCity
   ? `${lead.departureCity} → ${lead.arrivalCity}`
   : "Trajet à compléter";
 const tripTypeLabel =
  lead.tripType === "round_trip"
   ? "Aller-retour"
   : lead.tripType === "one_way"
    ? "Aller simple"
    : "À confirmer";

 return (
  <section className={styles.mapCard} aria-labelledby="route-map-title">
   <div className={styles.mapHeader}>
    <div>
     <h2 id="route-map-title">Résumé de la demande</h2>
     <p className={styles.routeTitle}>{routeLabel}</p>
    </div>
    {confidence !== null ? (
     <span className={styles.confidence}>{confidence}% fiable</span>
    ) : null}
   </div>

   <LeadRouteMap departureCity={lead.departureCity} arrivalCity={lead.arrivalCity} />

   <div className={styles.metrics}>
    <div className={styles.metric}>
     <span>Passagers</span>
     <strong>{lead.passengerCount ?? "À confirmer"}</strong>
    </div>
    <div className={styles.metric}>
     <span>Type de trajet</span>
     <strong>{tripTypeLabel}</strong>
    </div>
    <div className={styles.metric}>
     <span>Options</span>
     <strong>{lead.options.length ? lead.options.join(", ") : "Aucune"}</strong>
    </div>
    <div className={styles.metric}>
     <span>Statut</span>
     <StatusBadge status={lead.status} />
    </div>
   </div>
  </section>
 );
}
