import type { Partner } from "./partnerData";
import styles from "./partners.module.css";

export function PartnerAvailabilityPanel({ partner }: { partner: Partner | null }) {
  return (
    <section className={styles.card} aria-labelledby="partner-agenda-title">
      <h2 id="partner-agenda-title">Agenda indicatif</h2>
      {!partner ? (
        <p className={styles.empty}>
          Sélectionnez un partenaire pour afficher son agenda indicatif. Aucun statut ne vaut confirmation automatique.
        </p>
      ) : (
        <>
          <p>
            Agenda affiché après sélection de {partner.name}. La validation finale reste une action commerciale humaine.
          </p>
          <div className={styles.agenda}>
            {partner.agenda.map((item) => (
              <div className={styles.agendaItem} key={`${partner.id}-${item.date}`}>
                <span>{item.date}</span>
                <strong>{item.status}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
