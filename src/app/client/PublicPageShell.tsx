import Image from "next/image";
import Link from "next/link";
import styles from "./public-pages.module.css";

export function PublicPageHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
        <Image src="/logo-neotravel-v12.svg" alt="" width={250} height={72} priority />
      </Link>
      <nav className={styles.nav} aria-label="Navigation publique">
        <Link href="/client/partenaires">Partenaires</Link>
        <Link href="/client/contact">Contact</Link>
        <Link href="/client/notre-equipe">Notre equipe</Link>
        <Link href="/client/connexion">Se connecter</Link>
      </nav>
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
      <Link href="/client/connexion">Se connecter</Link>
    </footer>
  );
}
