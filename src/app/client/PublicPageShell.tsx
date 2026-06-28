import Image from "next/image";
import Link from "next/link";
import { AccessibilityWidget } from "@/shared/accessibility/AccessibilityWidget";
import { LanguageSelector } from "@/shared/i18n/LanguageSelector";
import styles from "./public-pages.module.css";

export function PublicPageHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
        <Image src="/logo-neotravel-v12.svg" alt="" width={250} height={72} priority />
      </Link>
      <div className={styles.headerActions}>
        <nav className={styles.nav} aria-label="Navigation publique">
          <Link href="/client/partenaires">Partenaires</Link>
          <Link href="/client/contact">Contact</Link>
          <Link href="/client/notre-equipe">Notre equipe</Link>
        </nav>
        <LanguageSelector />
        <AccessibilityWidget />
      </div>
    </header>
  );
}

export function PublicPageFooter() {
  return (
    <footer className={styles.footer}>
      <Link href="/client/mentions-legales">Mentions legales</Link>
      <Link href="/client/confidentialite">Confidentialite</Link>
      <Link href="/client/contact">Contact</Link>
      <Link href="/client/notre-equipe">Notre equipe</Link>
    </footer>
  );
}
