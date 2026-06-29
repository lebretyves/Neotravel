import type { Followup } from "@/shared/types/followup";
import { FollowupStatusBadge } from "./FollowupStatusBadge";
import styles from "./followups.module.css";

function formatDueAt(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function FollowupList({ followups }: { followups: Followup[] }) {
  const scheduled = followups.filter((followup) => followup.status === "SCHEDULED").length;
  const sent = followups.filter((followup) => followup.status === "SENT").length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Parcours pro après landing</p>
          <h1>Suivi client</h1>
          <p>
            Relances automatiques après QUOTE_SENT : n8n envoie uniquement emails, notifications et relances. Le prix
            reste calculé par le moteur métier.
          </p>
        </div>
        <span className={styles.badge}>Maximum 2 relances auto</span>
      </header>

      <section className={styles.kpiGrid} aria-label="Indicateurs relances">
        <article>
          <span>Planifiées</span>
          <strong>{scheduled}</strong>
        </article>
        <article>
          <span>Envoyées</span>
          <strong>{sent}</strong>
        </article>
        <article>
          <span>Règle standard</span>
          <strong>J+3 / J+7</strong>
        </article>
        <article>
          <span>Urgent traitable</span>
          <strong>J+2</strong>
        </article>
      </section>

      <section className={styles.panel} aria-labelledby="followups-title">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="followups-title">Relances planifiées et envoyées</h2>
            <p>Standard : J+3 puis J+7. Urgent traitable : J+2. Démo rapide : +2 minutes si activée.</p>
          </div>
          <span className={styles.badge}>Après 2 sans réponse : CLOSED après délai</span>
        </div>
        {followups.length === 0 ? (
          <p className={styles.empty}>Aucune relance planifiée pour le moment.</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Devis</span>
              <span>Canal</span>
              <span>Échéance</span>
              <span>Statut</span>
              <span>Suite</span>
            </div>
            {followups.map((followup) => (
              <div className={styles.row} key={followup.id}>
                <span>{followup.quoteId ?? "Sans devis lié"}</span>
                <span>{followup.channel}</span>
                <span>{formatDueAt(followup.dueAt)}</span>
                <FollowupStatusBadge status={followup.status} />
                <span>{followup.status === "SENT" ? "Surveillance réponse" : "En attente n8n"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.rulePanel} aria-labelledby="rule-title">
        <h2 id="rule-title">Chronologie sans réponse</h2>
        <ol>
          <li>QUOTE_SENT déclenche la séquence.</li>
          <li>Relance 1 selon contexte : J+2 urgent traitable, J+3 standard.</li>
          <li>Relance 2 standard à J+7 maximum.</li>
          <li>Sans réponse après délai de grâce : CLOSED.</li>
        </ol>
      </section>
    </main>
  );
}
