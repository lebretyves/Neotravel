import Image from "next/image";
import { PublicPageFooter, PublicPageHeader } from "../PublicPageShell";
import styles from "../public-pages.module.css";

export default function NotreEquipePage() {
  return (
    <main className={styles.page}>
      <PublicPageHeader />
      <section className={styles.hero}>
        <p className={styles.kicker}>Notre équipe</p>
        <h1>L&apos;équipe projet NeoTravel</h1>
        <p>
          Une équipe projet IT chargée de concevoir un parcours clair, auditable et démontrable pour la soutenance
          Epitech 2026.
        </p>
      </section>

      <section className={styles.imageSection}>
        <Image
          className={styles.teamImage}
          src="/images/equipe/neotravel-equipe.jpg"
          alt="Équipe projet NeoTravel"
          width={1600}
          height={900}
          priority
        />
      </section>
      <PublicPageFooter />
    </main>
  );
}
