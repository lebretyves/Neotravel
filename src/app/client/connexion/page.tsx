import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, FileCheck2, Mail, ShieldCheck } from "lucide-react";
import styles from "./connexion.module.css";

const statusCards = [
  {
    icon: Clock3,
    title: "Processus en cours",
    body: "La demande est en qualification. Le client retrouve l'avancement, les informations detectees et les elements a completer.",
  },
  {
    icon: FileCheck2,
    title: "Votre devis est pret",
    body: "La proposition est disponible avec le trajet, le montant calcule et les conditions de validation.",
  },
  {
    icon: CheckCircle2,
    title: "Devis accepte",
    body: "La decision client reste tracee dans le suivi : acceptation, refus, demande de modification ou absence de reponse.",
  },
];

const journeySteps = [
  { title: "Demande recue", trace: "Demande enregistree" },
  { title: "Qualification en cours", trace: "Infos verifiees" },
  { title: "Devis pret", trace: "Proposition conservee" },
  { title: "Decision client", trace: "Reponse tracee" },
];

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

      <section className={styles.hero} aria-labelledby="connexion-title">
        <div className={styles.copy}>
          <p className={styles.kicker}>Suivi client</p>
          <h1 id="connexion-title">Suivez votre parcours NeoTravel en temps reel</h1>
          <p>
            Une fois la demande envoyee, le client peut suivre les etapes cles : qualification, devis
            disponible, decision client, relances et reprise humaine si le dossier sort du cadre
            automatique.
          </p>
        </div>

        <form className={styles.loginCard} aria-label="Connexion client">
          <div>
            <p className={styles.kicker}>Connexion rapide</p>
            <h2>Acces par email</h2>
          </div>
          <label className={styles.field}>
            Email utilise pour la demande
            <input name="email" type="email" defaultValue="client@neotravel.fr" />
          </label>
          <label className={styles.field}>
            Reference ou code recu
            <input name="reference" defaultValue="NT-2026-0712" />
          </label>
          <Link className={styles.primaryButton} href="/devis/NT-2026-0712">
            Acceder a mon suivi
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </form>
      </section>

      <section className={styles.journeyCard} aria-label="Progression du parcours client">
        <div className={styles.journeyHeader}>
          <div>
            <p className={styles.kicker}>Suivi de la demande</p>
            <h2>Votre dossier avance et reste trace</h2>
          </div>
        </div>
        <ol>
          {journeySteps.map((step, index) => (
            <li
              key={step.title}
              className={
                index < 2 ? styles.stepDone : index === 2 ? styles.stepCurrent : styles.stepNext
              }
            >
              <span>{index + 1}</span>
              <strong>{step.title}</strong>
              <small>{step.trace}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.statusGrid} aria-label="Etats du parcours client">
        {statusCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className={styles.statusCard} key={card.title}>
              <span className={styles.iconWrap}>
                <Icon aria-hidden="true" size={24} />
              </span>
              <div>
                <h2>{card.title}</h2>
                <p>{card.body}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.trustBand}>
        <ShieldCheck aria-hidden="true" size={24} />
        <p>
          Page publique de suivi client : aucune entree vers le dashboard interne, uniquement
          demande, devis et contact.
        </p>
        <Mail aria-hidden="true" size={24} />
      </section>
    </main>
  );
}
