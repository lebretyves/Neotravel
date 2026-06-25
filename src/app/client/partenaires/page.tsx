import Link from "next/link";
import { PublicPageFooter, PublicPageHeader } from "../PublicPageShell";
import styles from "../public-pages.module.css";

const partnerCards = [
  {
    title: "Selection adaptee",
    body: "Les partenaires sont proposes selon la zone, la capacite, le type de trajet et les contraintes exprimees.",
  },
  {
    title: "Validation humaine",
    body: "La disponibilite reelle d'un vehicule reste confirmee par un conseiller avant engagement client.",
  },
  {
    title: "Suivi commercial",
    body: "NeoTravel garde le contexte de la demande, les options, les relances et la reprise humaine si besoin.",
  },
];

export default function PartenairesPage() {
  return (
    <main className={styles.page}>
      <PublicPageHeader />
      <section className={styles.hero}>
        <p className={styles.kicker}>Partenaires autocaristes</p>
        <h1>Des transporteurs adaptes a votre trajet</h1>
        <p>
          NeoTravel qualifie le besoin et prepare le dossier. La selection partenaire reste
          indicative jusqu&apos;a la validation commerciale.
        </p>
      </section>

      <section className={styles.grid} aria-label="Fonctionnement partenaires">
        {partnerCards.map((card) => (
          <article className={styles.card} key={card.title}>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className={styles.section}>
        <h2>Pourquoi une page publique ?</h2>
        <p>
          Cette page explique le fonctionnement partenaire sans ouvrir le dashboard interne. Les
          outils equipe restent separes de l&apos;espace client pour des raisons de securite et de
          lisibilite.
        </p>
        <Link className={styles.button} href="/demande">
          Demarrer une demande
        </Link>
      </section>
      <PublicPageFooter />
    </main>
  );
}
