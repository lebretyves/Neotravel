import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import styles from "./leadPipeline.module.css";

type StepState = "done" | "current" | "todo" | "blocked";

type TimelineStep = {
 number: number;
 title: string;
 detail: string;
 meta: string;
 state: StepState;
};

export function LeadFollowupTimeline({
 lead,
 quote,
 followups,
}: {
 lead: Lead;
 quote?: Quote;
 followups: Followup[];
}) {
 const sortedFollowups = [...followups].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
 const sentCount = sortedFollowups.filter((followup) => followup.status !== "SCHEDULED").length;
 const urgency = classifyUrgency(lead.departureDate);
 const steps = buildTimelineSteps({ lead, quote, followups: sortedFollowups, sentCount, urgency });

 return (
  <section className={styles.followupFlow} aria-labelledby="followup-timeline-title">
   <div className={styles.flowHead}>
    <div>
     <p className={styles.kicker}>Suivi commercial</p>
     <h2 id="followup-timeline-title">Timeline devis et relances</h2>
    </div>
    <span className={styles.urgencyBadge} data-urgency={urgency.kind}>
     {urgency.label}
    </span>
   </div>

   <ol className={styles.followupStepper}>
    {steps.map((step) => (
     <li className={styles.followupStep} data-state={step.state} key={step.number}>
      <span className={styles.followupStepNumber}>{step.number}</span>
      <div>
       <strong>{step.title}</strong>
       <p>{step.detail}</p>
       <small>{step.meta}</small>
      </div>
     </li>
    ))}
   </ol>

   <p className={styles.routingReason}>
    <strong>Regle appliquee :</strong> {urgency.rule}
   </p>
  </section>
 );
}

function buildTimelineSteps(input: {
 lead: Lead;
 quote?: Quote;
 followups: Followup[];
 sentCount: number;
 urgency: ReturnType<typeof classifyUrgency>;
}): TimelineStep[] {
 const { lead, quote, followups, sentCount, urgency } = input;

 if (lead.status === "INCOMPLETE" || lead.status === "NEW" || (lead.missingFields?.length ?? 0) > 0) {
  return [
   step(1, "Informations a completer", "Le devis reste bloque tant que les champs obligatoires manquent.", missingLabel(lead), "current"),
   step(2, "Devis non envoye", "Aucune relance commerciale n'est declenchee avant qualification.", "En attente", "todo"),
   step(3, "Suivi a reprendre", "Le dossier peut etre archive si la demande reste non traitable.", "Action humaine possible", "todo"),
  ];
 }

 if (urgency.kind === "very_urgent" || lead.status === "HUMAN_REVIEW") {
  return [
   step(1, "Validation humaine", "Le dossier doit etre repris avant tout engagement client.", reviewReason(lead, urgency), "current"),
   step(2, "Decision commerciale", "Un commercial valide, corrige ou archive la demande.", quote ? "Devis existant a verifier" : "Aucun devis automatique", quote ? "current" : "todo"),
   step(3, "Relance controlee", "Les relances automatiques ne doivent pas pousser un dossier sensible.", "Suivi manuel", "todo"),
  ];
 }

 if (!quote) {
  return [
   step(1, "Devis a generer", "La demande est exploitable mais aucun devis n'est encore rattache.", "Action: generer le devis", "current"),
   step(2, firstFollowupTitle(urgency), "La relance sera planifiee apres l'envoi du devis.", "Non programmee", "todo"),
   step(3, finalStepTitle(urgency), finalStepDetail(urgency), "Non programme", "todo"),
  ];
 }

 const quoteSent = quote.status === "QUOTE_SENT" || sentCount > 0 || lead.status.startsWith("FOLLOWUP");
 const firstFollowup = followups[0];
 const secondFollowup = followups[1];

 return [
  step(
   1,
   quoteSent ? "Devis envoye" : "Devis pret",
   quoteSent ? "Le client a recu le devis, le suivi de relance est actif." : "Le devis existe mais n'a pas encore ete envoye au client.",
   quote.calculation.quoteNumber,
   quoteSent ? "done" : "current",
  ),
  step(
   2,
   firstFollowupTitle(urgency),
   firstFollowupDetail(urgency),
   followupMeta(firstFollowup),
   followupState(firstFollowup, quoteSent),
  ),
  step(
   3,
   finalStepTitle(urgency),
   finalStepDetail(urgency),
   finalStepMeta({ urgency, secondFollowup, firstFollowup, lead }),
   finalStepState({ urgency, secondFollowup, sentCount, lead }),
  ),
 ];
}

function step(number: number, title: string, detail: string, meta: string, state: StepState): TimelineStep {
 return { number, title, detail, meta, state };
}

function classifyUrgency(departureDate: string | null | undefined) {
 if (!departureDate) {
  return {
   kind: "unknown" as const,
   label: "Urgence a confirmer",
   rule: "Date de depart absente : pas de relance automatique fiable avant qualification.",
  };
 }

 const departure = new Date(`${departureDate}T12:00:00`);
 if (Number.isNaN(departure.getTime())) {
  return {
   kind: "unknown" as const,
   label: "Urgence a confirmer",
   rule: "Date de depart invalide : reprise ou correction necessaire.",
  };
 }

 const hours = (departure.getTime() - Date.now()) / 3_600_000;
 if (hours < 0) {
  return {
   kind: "unknown" as const,
   label: "Date depassee",
   rule: "Date de depart passee : correction ou reprise humaine avant tout suivi commercial.",
  };
 }

 if (hours >= 0 && hours <= 48) {
  return {
   kind: "very_urgent" as const,
   label: "Tres urgent < 48h",
   rule: "Depart inferieur a 48h : HUMAN_REVIEW, aucune promesse automatique.",
  };
 }

 if (hours > 48 && hours <= 7 * 24) {
  return {
   kind: "urgent" as const,
   label: "Urgent 48h-7j",
   rule: "Depart entre 48h et 7 jours : une relance J+2, puis controle humain si silence.",
  };
 }

 return {
  kind: "standard" as const,
  label: "Standard > 7j",
  rule: "Depart au-dela de 7 jours : relances J+3 et J+7, puis CLOSED 7 jours apres la seconde relance.",
 };
}

function firstFollowupTitle(urgency: ReturnType<typeof classifyUrgency>) {
 return urgency.kind === "urgent" ? "Relance J+2" : "Relance 1";
}

function firstFollowupDetail(urgency: ReturnType<typeof classifyUrgency>) {
 if (urgency.kind === "urgent") return "Une seule relance automatique est prevue pour eviter une pression excessive.";
 return "Premiere relance automatique apres devis envoye.";
}

function finalStepTitle(urgency: ReturnType<typeof classifyUrgency>) {
 return urgency.kind === "urgent" ? "Controle humain" : "Relance 2 / cloture";
}

function finalStepDetail(urgency: ReturnType<typeof classifyUrgency>) {
 if (urgency.kind === "urgent") return "Sans reponse apres la relance urgente, le dossier repasse en validation humaine.";
 return "Deuxieme relance, puis fermeture automatique apres delai de grace si aucun retour.";
}

function followupMeta(followup: Followup | undefined) {
 if (!followup) return "Aucune relance planifiee";
 return `${followup.status === "SCHEDULED" ? "Prevue" : "Envoyee"} le ${formatDate(followup.dueAt)}`;
}

function followupState(followup: Followup | undefined, quoteSent: boolean): StepState {
 if (!quoteSent) return "todo";
 if (!followup) return "current";
 return followup.status === "SCHEDULED" ? "current" : "done";
}

function finalStepMeta(input: {
 urgency: ReturnType<typeof classifyUrgency>;
 secondFollowup?: Followup;
 firstFollowup?: Followup;
 lead: Lead;
}) {
 if (input.lead.status === "CLOSED") return "Dossier cloture";
 if (input.urgency.kind === "urgent") {
  if (input.lead.status === "HUMAN_REVIEW") return "En reprise humaine";
  return input.firstFollowup ? "Controle apres relance J+2" : "En attente relance J+2";
 }
 return followupMeta(input.secondFollowup);
}

function finalStepState(input: {
 urgency: ReturnType<typeof classifyUrgency>;
 secondFollowup?: Followup;
 sentCount: number;
 lead: Lead;
}): StepState {
 if (input.lead.status === "CLOSED" || input.lead.status === "LOST") return "done";
 if (input.urgency.kind === "urgent") return input.lead.status === "HUMAN_REVIEW" ? "current" : "todo";
 if (!input.secondFollowup) return input.sentCount >= 1 ? "current" : "todo";
 return input.secondFollowup.status === "SCHEDULED" ? "current" : "done";
}

function missingLabel(lead: Lead) {
 return (lead.missingFields?.length ?? 0) > 0 ? `${lead.missingFields!.length} champ(s) manquant(s)` : "Qualification initiale";
}

function reviewReason(lead: Lead, urgency: ReturnType<typeof classifyUrgency>) {
 return lead.humanReviewReason ?? urgency.label;
}

function formatDate(value: string) {
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return value;
 return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
