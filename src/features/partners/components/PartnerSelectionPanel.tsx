import type { Partner } from "./partnerData";
import { formatPartnerStatus } from "./partnerData";
import styles from "./partners.module.css";

export function PartnerSelectionPanel({ partner }: { partner: Partner | null }) {
  return (
    <section className={styles.card} aria-labelledby="partner-selection-title">
      <h2 id="partner-selection-title">Sélection commerciale</h2>
      {!partner ? (
        <p>Aucun partenaire sélectionné. Choisissez une ligne pour consulter le contexte du dossier.</p>
      ) : (
        <>
          <ul className={styles.infoList}>
            <li>
              Partenaire <strong>{partner.name}</strong>
            </li>
            <li>
              Statut <strong>{formatPartnerStatus(partner.status)}</strong>
            </li>
            <li>
              Capacité indicative <strong>{partner.capacity}</strong>
            </li>
            <li>
              Score interne <strong>{partner.internalScore}/100</strong>
            </li>
          </ul>
          <div className={styles.actions}>
            <button className={styles.primary} type="button">
              Poser option
            </button>
            <button className={styles.secondary} type="button">
              Confirmer (commercial)
            </button>
          </div>
          <p className={styles.helper}>
            Ces actions représentent une décision commerciale humaine. Une suggestion IA ne peut pas confirmer un
            partenaire.
          </p>
        </>
      )}
    </section>
  );
}
