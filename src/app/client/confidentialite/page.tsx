import { PublicPageFooter, PublicPageHeader } from "../PublicPageShell";
import styles from "../public-pages.module.css";

const privacyItems = [
  "Donnees de trajet : depart, arrivee, dates, passagers, options et contraintes.",
  "Donnees de contact : email, reference de demande et informations utiles au suivi.",
  "Donnees de suivi : statut du devis, relances, acceptation, refus ou reprise humaine.",
  "Aucun recalcul de prix dans n8n : les notifications utilisent les donnees deja produites par NeoTravel.",
];

export default function ConfidentialitePage() {
  return (
    <main className={styles.page}>
      <PublicPageHeader />
      <section className={styles.hero}>
        <p className={styles.kicker}>Confidentialite & RGPD</p>
        <h1>Vos donnees servent uniquement au traitement de votre demande</h1>
        <p>
          NeoTravel limite l&apos;usage des informations au devis, au suivi commercial, aux relances et
          a la reprise humaine lorsque le dossier le necessite.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Donnees traitees</h2>
        <ul>
          {privacyItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Droits utilisateur</h2>
        <p>
          Vous pouvez demander l&apos;acces, la rectification ou la suppression des informations liees a
          votre demande. En mode demo, ces pages documentent le comportement attendu du MVP et ne
          remplacent pas une politique juridique definitive.
        </p>
      </section>
      <PublicPageFooter />
    </main>
  );
}
