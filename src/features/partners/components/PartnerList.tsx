import Link from "next/link";
import { partners, formatPartnerStatus, type PartnerStatus } from "./partnerData";
import styles from "./partners.module.css";

function statusClass(status: PartnerStatus) {
  if (status === "Option posee") return `${styles.status} ${styles.statusOption}`;
  if (status === "Confirme par commercial") return `${styles.status} ${styles.statusConfirmed}`;
  if (status === "Indisponible") return `${styles.status} ${styles.statusUnavailable}`;
  return styles.status;
}

export function PartnerList({ selectedPartnerId }: { selectedPartnerId?: string }) {
  return (
    <section className={styles.panel} aria-labelledby="partner-list-title">
      <div className={styles.panelHeader}>
        <h2 id="partner-list-title">Partenaires autocaristes</h2>
        <p>Vue indicative pour aider le commercial à présélectionner un partenaire dans le dossier.</p>
      </div>
      <div className={styles.list}>
        {partners.map((partner) => (
          <article className={styles.partner} key={partner.id}>
            <div>
              <h3>{partner.name}</h3>
              <div className={styles.meta}>
                <span className={styles.pill}>{partner.zones.join(" / ")}</span>
                <span className={styles.pill}>{partner.capacity}</span>
                <span className={statusClass(partner.status)}>{formatPartnerStatus(partner.status)}</span>
              </div>
              <p className={styles.score}>Score interne : {partner.internalScore}/100. {partner.note}</p>
            </div>
            <Link
              aria-current={selectedPartnerId === partner.id ? "true" : undefined}
              className={styles.selectLink}
              href={`/dashboard/partenaires?partner=${partner.id}`}
            >
              Sélectionner
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
