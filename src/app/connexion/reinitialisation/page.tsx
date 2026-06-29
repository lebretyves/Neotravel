import Image from "next/image";
import Link from "next/link";
import styles from "../connexion.module.css";

export const metadata = {
  title: "Reinitialisation mot de passe - NeoTravel",
  description: "Reinitialisation du mot de passe client NeoTravel."
};

export default function ClientPasswordResetPage() {
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

      <section className={styles.hero} aria-labelledby="password-reset-title">
        <div className={styles.copy}>
          <p className={styles.kicker}>Espace client</p>
          <h1 id="password-reset-title">Reinitialiser votre mot de passe</h1>
          <p>
            Indiquez l'email associe a votre compte client pour recevoir les instructions de
            reinitialisation.
          </p>
        </div>

        <form className={styles.loginCard} aria-label="Reinitialisation mot de passe client">
          <div>
            <p className={styles.kicker}>Mot de passe oublie</p>
            <h2>Recevoir le lien</h2>
          </div>

          <label className={styles.field}>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="client@exemple.fr"
              required
            />
          </label>

          <button className={styles.primaryButton} type="submit">
            Envoyer le lien
          </button>

          <p className={styles.note}>
            La reinitialisation concerne uniquement le compte client. Les acces internes restent
            separes.
          </p>
        </form>
      </section>
    </main>
  );
}
