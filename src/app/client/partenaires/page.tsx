import Link from "next/link";
import { PublicPageFooter, PublicPageHeader } from "../PublicPageShell";
import styles from "../public-pages.module.css";

const partnerCards = [
  {
    title: "Selection adaptee",
    body: "Les partenaires sont proposes selon la zone, la capacite, le type de trajet et les contraintes exprimees."
  },
  {
    title: "Validation humaine",
    body: "La disponibilite reelle d'un vehicule reste confirmee par un conseiller avant engagement client."
  },
  {
    title: "Suivi commercial",
    body: "NeoTravel garde le contexte de la demande, les options, les relances et la reprise humaine si besoin."
  }
];

export default function PartenairesPage() {
  return (
    <main className={styles.page}>
      <PublicPageHeader />
      <section className={styles.hero}>
        <p className={styles.kicker} data-i18n-key="Partenaires autocaristes">Partenaires autocaristes</p>
        <h1 data-i18n-key="Des transporteurs adaptes a votre trajet">
          Des transporteurs adaptes a votre trajet
        </h1>
        <p data-i18n-key="NeoTravel qualifie le besoin et prepare le dossier. La selection partenaire reste indicative jusqu'a la validation commerciale.">
          NeoTravel qualifie le besoin et prepare le dossier. La selection partenaire reste indicative jusqu&apos;a la
          validation commerciale.
        </p>
      </section>

      <section className={styles.grid} aria-label="Fonctionnement partenaires">
        {partnerCards.map((card) => (
          <article className={styles.card} key={card.title}>
            <h2 data-i18n-key={card.title}>{card.title}</h2>
            <p data-i18n-key={card.body}>{card.body}</p>
          </article>
        ))}
      </section>

      <section className={`${styles.section} ${styles.partnerNetwork}`}>
        <h2 data-i18n-key="Un réseau de partenaires engagés">Un réseau de partenaires engagés</h2>
        <p data-i18n-key="NeoTravel s’appuie sur des partenaires sélectionnés pour leur exigence opérationnelle, leur fiabilité et leur sens du service.">
          NeoTravel s’appuie sur des partenaires sélectionnés pour leur exigence opérationnelle, leur fiabilité et leur
          sens du service.
        </p>
        <p data-i18n-key="Qu’il s’agisse de prestataires de transport, d’opérateurs terrain ou de services complémentaires, chaque partenaire contribue à offrir une expérience de mobilité plus fluide, plus sûre et mieux coordonnée.">
          Qu’il s’agisse de prestataires de transport, d’opérateurs terrain ou de services complémentaires, chaque
          partenaire contribue à offrir une expérience de mobilité plus fluide, plus sûre et mieux coordonnée.
        </p>
        <Link className={styles.button} href="/client/demande">
          Demarrer une demande
        </Link>
      </section>
      <PublicPageFooter />
    </main>
  );
}
