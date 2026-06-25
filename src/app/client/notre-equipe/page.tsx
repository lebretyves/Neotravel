import Image from "next/image";
import { PublicPageFooter, PublicPageHeader } from "../PublicPageShell";
import styles from "../public-pages.module.css";

export default function NotreEquipePage() {
  return (
    <main className={styles.page}>
      <PublicPageHeader />
      <section className={styles.hero}>
        <p className={styles.kicker}>Notre equipe</p>
        <h1>L&apos;equipe projet NeoTravel</h1>
        <p>
          Une equipe projet IT chargee de concevoir un parcours clair, auditable et demonstrable
          pour la soutenance Epitech 2026.
        </p>
      </section>

      <section className={styles.imageSection}>
        <Image
          className={styles.teamImage}
          src="/images/landing-carousel/notre-equipe.jpg"
          alt="Equipe projet NeoTravel"
          width={1600}
          height={900}
          priority
        />
      </section>
      <PublicPageFooter />
    </main>
  );
}
