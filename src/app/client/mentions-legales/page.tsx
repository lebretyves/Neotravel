import { PublicPageFooter, PublicPageHeader } from "../PublicPageShell";
import styles from "../public-pages.module.css";

export default function MentionsLegalesPage() {
  return (
    <main className={styles.page}>
      <PublicPageHeader />
      <section className={styles.hero}>
        <p className={styles.kicker}>Mentions legales</p>
        <h1>Informations legales NeoTravel</h1>
        <p>
          Page de demonstration du projet NeoTravel Epitech 2026. Les informations finales devront
          etre completees avant une mise en production reelle.
        </p>
      </section>
      <section className={styles.section}>
        <h2>Editeur du site</h2>
        <p>NeoTravel - Projet pedagogique Epitech 2026.</p>
        <h2>Responsabilite</h2>
        <p>
          Les contenus, prix, partenaires et disponibilites presentes dans le MVP servent a la
          demonstration. Toute validation commerciale reelle necessite une confirmation humaine.
        </p>
      </section>
      <PublicPageFooter />
    </main>
  );
}
