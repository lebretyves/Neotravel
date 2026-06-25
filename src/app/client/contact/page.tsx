import Link from "next/link";
import { PublicPageFooter, PublicPageHeader } from "../PublicPageShell";
import styles from "../public-pages.module.css";

const address = "24 rue Pasteur, 94270 Le Kremlin-Bicetre";
const mapUrl =
  "https://www.openstreetmap.org/export/embed.html?bbox=2.3547%2C48.8102%2C2.3668%2C48.8170&layer=mapnik&marker=48.8136%2C2.3610";

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <PublicPageHeader />
      <section className={styles.hero}>
        <p className={styles.kicker}>Contact</p>
        <h1>Nous trouver et nous contacter</h1>
        <p>
          Pour la demo NeoTravel, le point de contact est positionne sur le campus Epitech KB Paris,
          au Kremlin-Bicetre.
        </p>
      </section>

      <section className={`${styles.section} ${styles.addressGrid}`}>
        <article className={styles.addressCard}>
          <h2>Coordonnees</h2>
          <p>
            NeoTravel - Projet Epitech 2026
            <br />
            {address}
          </p>
          <p>Email demo : contact@neotravel.fr</p>
          <Link className={styles.button} href="/demande">
            Faire une demande
          </Link>
        </article>
        <article className={styles.mapCard} aria-label="Carte Epitech KB Paris">
          <iframe
            title="Carte Epitech KB Paris"
            src={mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </article>
      </section>
      <PublicPageFooter />
    </main>
  );
}
