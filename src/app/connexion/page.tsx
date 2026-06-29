import Image from "next/image";
import Link from "next/link";
import styles from "./connexion.module.css";

export const metadata = {
  title: "Connexion client - NeoTravel",
  description: "Connexion a l'espace client NeoTravel."
};

export default function ClientConnexionPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
          <Image src="/logo-neotravel-v12.svg" alt="" width={250} height={72} priority />
        </Link>
        <Link className={styles.backLink} href="/">
          Retour accueil
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="client-connexion-title">
        <div className={styles.copy}>
          <p className={styles.kicker}>Espace client</p>
          <h1 id="client-connexion-title">Connexion a votre compte client</h1>
          <p>
            Renseignez l'email utilise pour votre demande ou votre devis NeoTravel.
          </p>
        </div>

        <form className={styles.loginCard} action="/compte" aria-label="Connexion espace client">
          <div>
            <p className={styles.kicker}>Connexion client</p>
            <h2>Acces client</h2>
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

          <label className={styles.field}>
            Mot de passe
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Votre mot de passe"
              required
            />
          </label>

          <Link className={styles.forgotLink} href="/connexion/reinitialisation">
            Mot de passe oublie ?
          </Link>

          <button className={styles.primaryButton} type="submit">
            Se connecter
          </button>

          <p className={styles.note}>
            Cette connexion est reservee au suivi client. Elle ne donne pas acces au dashboard
            interne NeoTravel.
          </p>
        </form>

        <section className={styles.signupCard} aria-label="Creation de compte client">
          <div>
            <p className={styles.kicker}>Nouveau client</p>
            <h2>S'inscrire</h2>
            <p>
              Creez un compte client pour retrouver vos demandes, devis, documents et preferences.
            </p>
          </div>
          <Link className={styles.secondaryButton} href="/connexion/inscription">
            Creer mon compte
          </Link>
        </section>
      </section>
    </main>
  );
}
