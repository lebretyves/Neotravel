import Image from "next/image";
import Link from "next/link";
import styles from "../connexion.module.css";

export const metadata = {
  title: "Inscription client - NeoTravel",
  description: "Creation de compte client NeoTravel."
};

export default function ClientSignupPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
          <Image src="/logo-neotravel-v12.svg" alt="" width={250} height={72} priority />
        </Link>
        <Link className={styles.backLink} href="/connexion">
          Retour connexion
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="client-signup-title">
        <div className={styles.copy}>
          <p className={styles.kicker}>Espace client</p>
          <h1 id="client-signup-title">Creer votre compte client</h1>
          <p>
            Activez votre espace pour voir votre devis, suivre vos demandes, documents et preferences de contact.
          </p>
        </div>

        <form className={styles.loginCard} action="/compte/devis" aria-label="Inscription espace client">
          <div>
            <p className={styles.kicker}>Inscription client</p>
            <h2>S'inscrire</h2>
          </div>

          <label className={styles.field}>
            Nom
            <input name="name" type="text" autoComplete="name" placeholder="Votre nom" required />
          </label>

          <label className={styles.field}>
            Email
            <input name="email" type="email" autoComplete="email" placeholder="client@exemple.fr" required />
          </label>

          <label className={styles.field}>
            Mot de passe
            <input name="password" type="password" autoComplete="new-password" placeholder="Creer un mot de passe" required />
          </label>

          <label className={styles.field}>
            Confirmer le mot de passe
            <input name="passwordConfirm" type="password" autoComplete="new-password" placeholder="Confirmer" required />
          </label>

          <button className={styles.primaryButton} type="submit">
            Creer mon compte et voir mon devis
          </button>

          <p className={styles.note}>
            Compte client uniquement. Aucun acces au dashboard interne NeoTravel.
          </p>
        </form>
      </section>
    </main>
  );
}
