import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowupSendButton } from "@/features/followups/components/FollowupSendButton";
import styles from "@/features/followups/components/followup-detail.module.css";
import { leadDisplayName, leadRouteLabel } from "@/features/dashboard/services/leadPipelinePresentation";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";
import { getFollowupById, listFollowups, listLeads, listQuotes } from "@/shared/lib/data";
import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";

const VERY_URGENT_HOURS = 48;
const URGENT_HOURS = 7 * 24;
const GRACE_DAYS_AFTER_SECOND_FOLLOWUP = 7;

type StepState = "done" | "current" | "pending" | "blocked";

type TimelineStep = {
  index: number;
  title: string;
  detail: string;
  badge: string;
  state: StepState;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "À confirmer";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "À confirmer";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function hoursUntilDeparture(lead: Lead | undefined) {
  if (!lead?.departureDate) return null;
  const departure = new Date(`${lead.departureDate}T12:00:00`).getTime();
  if (Number.isNaN(departure)) return null;
  return (departure - Date.now()) / 36e5;
}

function sequenceKind(lead: Lead | undefined, relatedFollowups: Followup[]) {
  const hours = hoursUntilDeparture(lead);
  if (hours !== null && hours >= 0 && hours < VERY_URGENT_HOURS) return "very_urgent" as const;
  if (hours !== null && hours >= VERY_URGENT_HOURS && hours <= URGENT_HOURS) return "urgent" as const;
  if (relatedFollowups.length === 1) return "urgent" as const;
  return "standard" as const;
}

function followupLabel(followup: Followup | undefined, fallback: string) {
  if (!followup) return fallback;
  return `${followup.status === "SENT" ? "Envoyée" : "Prévue"} le ${formatDateTime(followup.dueAt)}`;
}

function stepStateForFollowup(followup: Followup | undefined, currentId: string): StepState {
  if (!followup) return "pending";
  if (followup.status === "SENT") return "done";
  if (followup.id === currentId) return "current";
  return "pending";
}

function buildTimeline({
  lead,
  quote,
  currentFollowup,
  relatedFollowups,
}: {
  lead?: Lead;
  quote?: Quote;
  currentFollowup: Followup;
  relatedFollowups: Followup[];
}): TimelineStep[] {
  const sorted = [...relatedFollowups].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const first = sorted[0];
  const second = sorted[1];
  const kind = sequenceKind(lead, sorted);
  const quoteSent = quote?.status === "QUOTE_SENT" || lead?.status === "QUOTE_SENT" || sorted.length > 0;
  const closed = lead?.status === "CLOSED";
  const humanReview = lead?.status === "HUMAN_REVIEW";

  if (kind === "very_urgent") {
    return [
      {
        index: 1,
        title: "Départ très urgent",
        detail: "Départ à moins de 48h : le devis automatique ne doit pas lancer une séquence de relance.",
        badge: "HUMAN_REVIEW",
        state: humanReview ? "done" : "blocked",
      },
      {
        index: 2,
        title: "Reprise conseiller",
        detail: "Un humain vérifie disponibilité, faisabilité et priorisation commerciale.",
        badge: "manuel",
        state: humanReview ? "current" : "pending",
      },
      {
        index: 3,
        title: "Décision commerciale",
        detail: "Le dossier est traité hors automatisation relance.",
        badge: "hors auto",
        state: closed ? "done" : "pending",
      },
    ];
  }

  if (kind === "urgent") {
    return [
      {
        index: 1,
        title: "Devis envoyé",
        detail: quoteSent ? "Le devis peut être envoyé malgré l'urgence traitable." : "Le devis doit être envoyé avant relance.",
        badge: quote?.calculation.quoteNumber ?? "devis",
        state: quoteSent ? "done" : "pending",
      },
      {
        index: 2,
        title: "Relance unique J+2",
        detail: followupLabel(first, "Une seule relance est prévue deux jours après l'envoi."),
        badge: first?.status ?? "SCHEDULED",
        state: stepStateForFollowup(first, currentFollowup.id),
      },
      {
        index: 3,
        title: "Contrôle humain si silence",
        detail: "Après la relance urgente, le dossier revient en HUMAN_REVIEW plutôt qu'en clôture automatique.",
        badge: humanReview ? "HUMAN_REVIEW" : "à surveiller",
        state: humanReview ? "current" : first?.status === "SENT" ? "current" : "pending",
      },
    ];
  }

  return [
    {
      index: 1,
      title: "Devis envoyé",
      detail: quoteSent ? "La séquence standard de relance est active." : "La relance dépend de l'envoi préalable du devis.",
      badge: quote?.calculation.quoteNumber ?? "devis",
      state: quoteSent ? "done" : "pending",
    },
    {
      index: 2,
      title: "Relance 1 — J+3",
      detail: followupLabel(first, "Première relance standard trois jours après l'envoi."),
      badge: first?.status ?? "SCHEDULED",
      state: stepStateForFollowup(first, currentFollowup.id),
    },
    {
      index: 3,
      title: "Relance 2 — J+7 puis clôture",
      detail: second
        ? `${followupLabel(second, "Deuxième relance")}. Sans réponse, clôture ${GRACE_DAYS_AFTER_SECOND_FOLLOWUP} jours après l'échéance de cette relance.`
        : `Deuxième relance standard à J+7, puis CLOSED après ${GRACE_DAYS_AFTER_SECOND_FOLLOWUP} jours sans réponse.`,
      badge: closed ? "CLOSED" : second?.status ?? "à venir",
      state: closed ? "done" : stepStateForFollowup(second, currentFollowup.id),
    },
  ];
}

function statusLabel(status: Followup["status"]) {
  if (status === "SCHEDULED") return "Programmée";
  if (status === "SENT") return "Envoyée";
  if (status === "OPENED") return "Ouverte";
  if (status === "REPLIED") return "Réponse reçue";
  return status;
}

function nextAction(followup: Followup, lead?: Lead) {
  if (lead?.status === "HUMAN_REVIEW") return "Reprise conseiller";
  if (followup.status === "SCHEDULED" && new Date(followup.dueAt).getTime() <= Date.now()) return "Envoyer maintenant";
  if (followup.status === "SCHEDULED") return "Attendre échéance ou envoyer manuellement";
  if (followup.status === "SENT") return "Surveiller réponse client";
  return "Suivre le dossier";
}

export default async function FollowupDetailPage({ params }: { params: Promise<{ followupId: string }> }) {
  await requirePermission("followups");
  const { followupId } = await params;
  const [followup, leads, quotes, followups] = await Promise.all([
    getFollowupById(followupId),
    listLeads(),
    listQuotes(),
    listFollowups(),
  ]);

  if (!followup) notFound();

  const lead = leads.find((item) => item.id === followup.leadId);
  const quote = followup.quoteId ? quotes.find((item) => item.id === followup.quoteId) : undefined;
  const relatedFollowups = followup.quoteId
    ? followups.filter((item) => item.quoteId === followup.quoteId)
    : followups.filter((item) => item.leadId === followup.leadId);
  const timeline = buildTimeline({ lead, quote, currentFollowup: followup, relatedFollowups });
  const kind = sequenceKind(lead, relatedFollowups);
  const canSend = followup.status === "SCHEDULED";

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Dashboard NeoTravel · Relance</p>
          <h1>{leadDisplayName(lead, "Relance client")}</h1>
          <p>{leadRouteLabel(lead)} · suivi email, échéance, action commerciale et scénario de sortie.</p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.secondaryAction} href="/dashboard/relances">Retour relances</Link>
          {lead ? <Link className={styles.secondaryAction} href={`/dashboard/demandes/${lead.id}`}>Fiche demande</Link> : null}
          {quote ? <Link className={styles.secondaryAction} href={`/client/devis/${quote.id}`}>Voir devis</Link> : null}
        </div>
      </header>

      <section className={styles.kpiGrid} aria-label="Résumé relance">
        <article className={styles.kpi}><span>Statut</span><strong>{statusLabel(followup.status)}</strong></article>
        <article className={styles.kpi}><span>Échéance</span><strong>{formatDateTime(followup.dueAt)}</strong></article>
        <article className={styles.kpi}><span>Scénario</span><strong>{kind === "urgent" ? "Urgent J+2" : kind === "very_urgent" ? "Très urgent" : "Standard J+3/J+7"}</strong></article>
        <article className={styles.kpi}><span>Action</span><strong>{nextAction(followup, lead)}</strong></article>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Timeline devis et relances</h2>
              <p>Lecture commerciale en trois niveaux : décision, relance, sortie du scénario.</p>
            </div>
            <span className={styles.badge}>{relatedFollowups.length} relance(s) liées</span>
          </div>
          <div className={styles.timeline}>
            {timeline.map((step) => (
              <article className={styles.step} data-state={step.state} key={step.index}>
                <span className={styles.marker}>{step.index}</span>
                <div className={styles.stepBody}>
                  <span className={styles.badge}>{step.badge}</span>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Monitoring</h2>
              <p>Données utilisées pour décider de la prochaine action.</p>
            </div>
          </div>
          <ul className={styles.sideList}>
            <li><span>Client</span><strong>{leadDisplayName(lead)}</strong></li>
            <li><span>Email</span><strong>{lead?.email ?? "À confirmer"}</strong></li>
            <li><span>Départ</span><strong>{formatDate(lead?.departureDate)}</strong></li>
            <li><span>Devis</span><strong>{quote?.calculation.quoteNumber ?? followup.quoteId ?? "Sans devis"}</strong></li>
            <li><span>Canal</span><strong>{followup.channel}</strong></li>
            <li><span>ID relance</span><strong>{followup.id}</strong></li>
          </ul>
          <FollowupSendButton followupId={followup.id} disabled={!canSend} />
        </aside>
      </div>
    </main>
  );
}
