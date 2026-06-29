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
          <p className={styles.eyebrow}>Parcours pro apres landing</p>
          <h1>Suivi client</h1>
          <p>
            Relances automatiques apres QUOTE_SENT : n8n envoie uniquement emails, notifications et relances. Le prix
            reste calcule par le moteur metier.
          </p>
        </div>
        <span className={styles.badge}>Maximum 2 relances auto</span>
      </header>

      <section className={styles.kpiGrid} aria-label="Indicateurs relances">
        <article>
          <span>Planifiees</span>
          <strong>{scheduled}</strong>
        </article>
        <article>
          <span>Envoyees</span>
          <strong>{sent}</strong>
        </article>
        <article>
          <span>Regle standard</span>
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
            <h2 id="followups-title">Relances planifiees et envoyees</h2>
            <p>Standard : J+3 puis J+7. Urgent traitable : J+2. Demo rapide : +2 minutes si activee.</p>
          </div>
          <span className={styles.badge}>Apres 2 sans reponse : CLOSED apres delai</span>
        </div>
        {followups.length === 0 ? (
          <p className={styles.empty}>Aucune relance planifiee pour le moment.</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Devis</span>
              <span>Canal</span>
              <span>Echeance</span>
              <span>Statut</span>
              <span>Suite</span>
            </div>
            {followups.map((followup) => (
              <div className={styles.row} key={followup.id}>
                <span>{followup.quoteId ?? "Sans devis lie"}</span>
                <span>{followup.channel}</span>
                <span>{formatDueAt(followup.dueAt)}</span>
                <FollowupStatusBadge status={followup.status} />
                <span>{followup.status === "SENT" ? "Surveillance reponse" : "En attente n8n"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.rulePanel} aria-labelledby="rule-title">
        <h2 id="rule-title">Chronologie sans reponse</h2>
        <ol>
          <li>QUOTE_SENT declenche la sequence.</li>
          <li>Relance 1 selon contexte : J+2 urgent traitable, J+3 standard.</li>
          <li>Relance 2 standard a J+7 maximum.</li>
          <li>Sans reponse apres delai de grace : CLOSED.</li>
        </ol>
      </section>
    </main>
  );
}
