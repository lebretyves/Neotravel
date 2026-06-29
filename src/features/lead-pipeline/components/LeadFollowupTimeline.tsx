import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import styles from "./leadPipeline.module.css";

type StepState = "done" | "current" | "todo" | "blocked";

type TimelineStep = {
 number: number;
 title: string;
 status: string;
 detail: string;
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
 const urgency = classifyUrgency(lead.departureDate);
 const steps = buildSteps({ lead, quote, followups: sortedFollowups, urgency });

 return (
  <section className={styles.followupFlow} aria-labelledby="followup-timeline-title">
   <div className={styles.flowHead}>
    <div>
     <p className={styles.kicker}>Suite du parcours</p>
     <h2 id="followup-timeline-title">Devis et relances</h2>
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
       <span className={styles.followupStatus}>{step.status}</span>
       <p>{step.detail}</p>
      </div>
     </li>
    ))}
   </ol>

   <p className={styles.routingReason}>
    <strong>Regle :</strong> {urgency.rule}
   </p>
  </section>
 );
}

function buildSteps(input: {
 lead: Lead;
 quote?: Quote;
 followups: Followup[];
 urgency: ReturnType<typeof classifyUrgency>;
}): TimelineStep[] {
 const { lead, quote, followups, urgency } = input;
 const incomplete = lead.status === "NEW" || lead.status === "INCOMPLETE" || (lead.missingFields?.length ?? 0) > 0;
 const humanReview = lead.status === "HUMAN_REVIEW" || urgency.kind === "very_urgent";
 const quoteSent = quote?.status === "QUOTE_SENT" || lead.status === "FOLLOWUP_1" || lead.status === "FOLLOWUP_2";
 const firstFollowup = followups[0];
 const secondFollowup = followups[1];

 if (incomplete) {
  return [
   step(1, "Qualification", "A completer", missingFieldsLabel(lead), "current"),
   step(2, "Devis", "Bloque", "Le devis ne doit pas etre genere tant que la demande est incomplete.", "blocked"),
   step(3, "Suivi", "Pas de relance devis", "Relancer le client pour les infos manquantes ou archiver si non traitable.", "todo"),
  ];
 }

 if (humanReview) {
  const noAutomaticFollowup = urgency.kind === "very_urgent";
  return [
   step(1, "Qualification", "Validation humaine", lead.humanReviewReason ?? urgency.label, "current"),
   step(2, "Devis", quote ? quoteStatus(quote) : "En attente", quote ? "Verifier le devis avant envoi." : "Aucun devis automatique avant validation.", quote ? "current" : "todo"),
   step(
    3,
    "Relances",
    noAutomaticFollowup ? "Aucune relance auto" : followupStatus({ urgency, firstFollowup, secondFollowup, lead, quoteSent }),
    noAutomaticFollowup
     ? "Depart < 48h : pas de relance automatique, reprise commerciale immediate."
     : followupDetail({ urgency, firstFollowup, secondFollowup, lead, quoteSent }),
    noAutomaticFollowup ? "blocked" : followupState({ firstFollowup, secondFollowup, lead, quoteSent }),
   ),
  ];
 }

 return [
  step(
   1,
   "Qualification",
   "Exploitable",
   "Les champs necessaires sont presents pour avancer vers devis.",
   "done",
  ),
  step(
   2,
   "Devis",
   quote ? quoteStatus(quote) : "A generer",
   quoteSent ? "Devis envoye au client." : quote ? "Devis pret, il reste a l'envoyer." : "Generer le devis depuis cette fiche.",
   quoteSent ? "done" : "current",
  ),
  step(
   3,
   "Relances",
   followupStatus({ urgency, firstFollowup, secondFollowup, lead, quoteSent }),
   followupDetail({ urgency, firstFollowup, secondFollowup, lead, quoteSent }),
   followupState({ firstFollowup, secondFollowup, lead, quoteSent }),
  ),
 ];
}

function step(number: number, title: string, status: string, detail: string, state: StepState): TimelineStep {
 return { number, title, status, detail, state };
}

function classifyUrgency(departureDate: string | null | undefined) {
 if (!departureDate) {
  return {
   kind: "unknown" as const,
   label: "Urgence a confirmer",
   rule: "Date absente : pas de relance automatique fiable.",
  };
 }

 const departure = new Date(`${departureDate}T12:00:00`);
 if (Number.isNaN(departure.getTime())) {
  return {
   kind: "unknown" as const,
   label: "Date a corriger",
   rule: "Date invalide : correction avant devis ou relance.",
  };
 }

 const hours = (departure.getTime() - Date.now()) / 3_600_000;
 if (hours < 0) {
  return {
   kind: "unknown" as const,
   label: "Date depassee",
   rule: "Date passee : reprise humaine ou correction.",
  };
 }

 if (hours <= 48) {
  return {
   kind: "very_urgent" as const,
   label: "Tres urgent < 48h",
   rule: "Depart < 48h : HUMAN_REVIEW, pas d'engagement automatique.",
  };
 }

 if (hours <= 7 * 24) {
  return {
   kind: "urgent" as const,
   label: "Urgent 48h-7j",
   rule: "Depart 48h-7j : devis possible, une relance J+2, puis reprise humaine si silence.",
  };
 }

 return {
  kind: "standard" as const,
  label: "Standard > 7j",
  rule: "Depart > 7j : relances J+3 puis J+7, puis CLOSED 7 jours apres la seconde relance.",
 };
}

function quoteStatus(quote: Quote) {
 if (quote.status === "QUOTE_READY") return "Pret";
 if (quote.status === "QUOTE_SENT") return "Envoye";
 if (quote.status === "ACCEPTED") return "Accepte";
 if (quote.status === "REFUSED") return "Refuse";
 return "Cloture";
}

function followupStatus(input: {
 urgency: ReturnType<typeof classifyUrgency>;
 firstFollowup?: Followup;
 secondFollowup?: Followup;
 lead: Lead;
 quoteSent: boolean;
}) {
 if (!input.quoteSent) return "En attente devis";
 if (input.lead.status === "CLOSED") return "Cloture";
 if (input.lead.status === "LOST") return "Perdu";
 if (input.urgency.kind === "very_urgent") return "Aucune relance auto";
 if (input.urgency.kind === "urgent") return input.firstFollowup ? followupShortLabel(input.firstFollowup, "J+2") : "J+2 a venir";
 if (input.secondFollowup) return followupShortLabel(input.secondFollowup, "J+7");
 if (input.firstFollowup) return followupShortLabel(input.firstFollowup, "J+3");
 return "A planifier";
}

function followupDetail(input: {
 urgency: ReturnType<typeof classifyUrgency>;
 firstFollowup?: Followup;
 secondFollowup?: Followup;
 lead: Lead;
 quoteSent: boolean;
}) {
 if (!input.quoteSent) return "Le suivi demarre apres envoi du devis.";
 if (input.lead.status === "CLOSED") return "Dossier ferme apres absence de reponse.";
 if (input.urgency.kind === "urgent") return "Une seule relance J+2, puis controle humain si pas de retour.";
 if (input.secondFollowup?.status === "SENT") return "Relance J+7 envoyee : attendre 7 jours puis cloturer si silence.";
 if (input.firstFollowup?.status === "SENT") return "Premiere relance envoyee : prochaine etape J+7.";
 return "Relances standard : J+3 puis J+7.";
}

function followupState(input: {
 firstFollowup?: Followup;
 secondFollowup?: Followup;
 lead: Lead;
 quoteSent: boolean;
}): StepState {
 if (!input.quoteSent) return "todo";
 if (input.lead.status === "CLOSED" || input.lead.status === "LOST") return "done";
 const active = input.secondFollowup ?? input.firstFollowup;
 if (!active) return "current";
 if (active.status === "SCHEDULED" && new Date(active.dueAt).getTime() < Date.now()) return "blocked";
 return active.status === "SCHEDULED" ? "current" : "done";
}

function followupShortLabel(followup: Followup, label: string) {
 const date = formatDate(followup.dueAt);
 if (followup.status === "SCHEDULED" && new Date(followup.dueAt).getTime() < Date.now()) return `${label} en retard`;
 return followup.status === "SCHEDULED" ? `${label} prevu ${date}` : `${label} envoye ${date}`;
}

function missingFieldsLabel(lead: Lead) {
 const count = lead.missingFields?.length ?? 0;
 return count > 0 ? `${count} champ(s) manquant(s)` : "Informations manquantes";
}

function formatDate(value: string) {
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return value;
 return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}
