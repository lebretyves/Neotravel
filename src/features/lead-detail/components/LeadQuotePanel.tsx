import Link from "next/link";
import {
 formatCommercialDate,
 getLeadCommercialAction,
 quoteLabel
} from "@/features/dashboard/services/leadPipelinePresentation";
import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import { LeadGenerateQuote } from "./LeadGenerateQuote";
import styles from "./lead-detail.module.css";

const FIELD_LABELS: Record<string, string> = {
 departure_city: "ville de départ",
 arrival_city: "ville d’arrivée",
 departure_date: "date de départ",
 passenger_count: "nombre de passagers",
 trip_type: "type de trajet",
};

export function LeadQuotePanel({ lead, quote, followup }: { lead: Lead; quote?: Quote; followup?: Followup }) {
 const tripTypeLabel =
  lead.tripType === "round_trip"
   ? "Aller-retour"
   : lead.tripType === "one_way"
    ? "Aller simple"
    : "À confirmer";
 const hasMissingFields = (lead.missingFields?.length ?? 0) > 0;
 const missingFields = lead.missingFields?.map((field) => FIELD_LABELS[field] ?? field).join(", ");
 const action = getLeadCommercialAction({ lead, quote, followup });

 return (
  <section className={styles.sideCard} aria-labelledby="structured-data-title">
   <h2 id="structured-data-title">Informations devis</h2>
   <p>Champs stockés sur la demande. Le prix reste calculé par le moteur de devis, jamais ici.</p>

   <ul className={styles.dataList}>
    <li>
     Organisation <strong>{lead.organization ?? "À confirmer"}</strong>
    </li>
    <li>
     Email <strong>{lead.email ?? "À confirmer"}</strong>
    </li>
    <li>
     Départ <strong>{lead.departureCity ?? "À confirmer"}</strong>
    </li>
    <li>
     Arrivée <strong>{lead.arrivalCity ?? "À confirmer"}</strong>
    </li>
    <li>
     Date <strong>{lead.departureDate ?? "À confirmer"}</strong>
    </li>
    <li>
     Type <strong>{tripTypeLabel}</strong>
    </li>
    <li>
     Passagers <strong>{lead.passengerCount ?? "À confirmer"}</strong>
    </li>
    <li>
     Devis <strong>{quoteLabel(quote)}</strong>
    </li>
    <li>
     Relance <strong>{followup ? formatCommercialDate(followup.dueAt) : "Aucune"}</strong>
    </li>
   </ul>

   <div className={styles.completionBox} data-state={hasMissingFields ? "missing" : lead.status === "HUMAN_REVIEW" ? "review" : "ready"}>
    <strong>
     {hasMissingFields
      ? "Demande incomplète"
      : lead.status === "HUMAN_REVIEW"
       ? "Validation commerciale requise"
       : "Demande exploitable"}
    </strong>
    <span>
     {hasMissingFields
      ? `Champs à compléter : ${missingFields}.`
      : lead.status === "HUMAN_REVIEW"
       ? "Un commercial doit valider ou refuser la demande avant devis."
       : "Les champs nécessaires au devis sont présents."}
    </span>
   </div>

   <div className={styles.commercialActionBox} data-tone={action.tone}>
    <span>Action commerciale</span>
    <strong>{action.label}</strong>
    <small>{action.detail}</small>
   </div>

   <div className={styles.cardActions}>
    {quote ? (
     <Link className={styles.primary} href={`/client/devis/${quote.id}`}>
      Ouvrir le devis
     </Link>
    ) : (
     <LeadGenerateQuote leadId={lead.id} status={lead.status} />
    )}
    {lead.status === "HUMAN_REVIEW" ? (
     <Link className={styles.secondary} href="/dashboard/human-review">
      Voir la file de validation
     </Link>
    ) : null}
   </div>
  </section>
 );
}
