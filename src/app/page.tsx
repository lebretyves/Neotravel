import Link from "next/link";
import Image from "next/image";
import { AccessibilityWidget } from "@/shared/accessibility/AccessibilityWidget";
import { LanguageSelector } from "@/shared/i18n/LanguageSelector";
import { HomeCarousel } from "../components/HomeCarousel";
import { LandingQuoteForm } from "../components/LandingQuoteForm";
import styles from "./home.module.css";

const projectCards = [
  {
    title: "Sorties scolaires",
    body: "Groupes scolaires, associations et clubs avec trajet verifie et suivi commercial.",
  },
  {
    title: "Seminaires & entreprises",
    body: "Transferts gares, aeroports, sites industriels et evenements d'entreprise.",
  },
  {
    title: "Sport & evenements",
    body: "Equipes, supporters et federations — reprise humaine pour les trajets hors standard.",
  },
];

const engagementCards = [
  { title: "Prix calcule", body: "Tarif deterministe base sur la distance, le vehicule et la date." },
  { title: "Rappel conseiller", body: "Un conseiller reprend le dossier si la demande sort du cadre automatique." },
  { title: "Suivi complet", body: "Chaque etape — devis, validation, relance — est tracee et auditable." },
];

const trustpilotReviews = [
  {
    id: "school",
    source: "Association scolaire",
    text: "Devis rapide, trajet clair et conseiller disponible pour finaliser la sortie.",
  },
  {
    id: "company",
    source: "Responsable seminaire",
    text: "Reservation lisible, options bien suivies et reprise humaine quand le dossier devient sensible.",
  },
  {
    id: "sport",
    source: "Club sportif",
    text: "Organisation fluide pour un groupe nombreux, avec suivi des relances sans perte d'information.",
  },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
          <Image
            className={styles.logoImage}
            src="/logo-neotravel-v12.svg"
            alt=""
            width={250}
            height={72}
            priority
          />
        </Link>

        <div className={styles.headerActions}>
          <nav className={styles.nav} aria-label="Navigation principale">
            <a href="#estimation">Estimation</a>
            <a href="#projets">Vos projets</a>
            <Link href="/client/partenaires">Partenaires</Link>
            <a href="#engagements">Engagements</a>
          </nav>

          <LanguageSelector />
          <AccessibilityWidget />
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <HomeCarousel />
        <div className={styles.heroContent}>
          <p className={styles.badge}>Transport de groupes avec chauffeur</p>
          <h1 id="hero-title">Location de car avec chauffeur</h1>
          <p>
            NeoTravel calcule votre devis en ligne et transmet les dossiers complexes a un
            conseiller. De 20 a 85 passagers, aller simple ou aller-retour.
          </p>
        </div>
      </section>

      <section
        className={styles.estimationBand}
        id="estimation"
        aria-label="Definissez votre projet"
      >
        <LandingQuoteForm />
      </section>

      <section className={styles.projects} id="projets">
        <div className={styles.sectionTitle}>
          <p>Vos projets</p>
          <h2>Transport de groupe, tous cas d&apos;usage</h2>
        </div>
        <div className={styles.projectGrid}>
          {projectCards.map((card) => (
            <article className={styles.projectCard} key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.partnerSection} id="partenaires">
        <div>
          <p className={styles.kicker}>Partenaires autocaristes</p>
          <h2>Un reseau de transporteurs verifies</h2>
          <p>
            NeoTravel prepare le dossier et transmet au partenaire adapte selon la zone, la
            capacite et le type de trajet.
            <br />
            La disponibilite est confirmee par un conseiller avant tout engagement.
          </p>
          <Link className={styles.secondaryButton} href="/client/partenaires">
            En savoir plus
          </Link>
        </div>
        <ul className={styles.partnerFacts}>
          <li>Selection selon zone geographique, capacite et contraintes du trajet.</li>
          <li>Aucun vehicule engage sans validation partenaire.</li>
          <li>Reprise humaine systematique pour les trajets hors grille tarifaire.</li>
        </ul>
      </section>

      <section className={styles.engagements} id="engagements">
        <div className={styles.sectionTitle}>
          <p>Nos engagements</p>
          <h2>Simple, lisible, auditable</h2>
        </div>
        <div className={styles.engagementGrid}>
          {engagementCards.map((card) => (
            <article className={styles.engagementCard} key={card.title}>
              <h3>{card.title}</h3>
              <p style={{ margin: "8px 0 0", color: "#5e6b7e", fontSize: 15, lineHeight: 1.5 }}>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.trustpilotBand} aria-label="Avis Trustpilot NeoTravel">
        <div className={styles.trustScore}>
          <p className={styles.kicker}>Avis Trustpilot</p>
          <h2>Excellent 4.9/5</h2>
          <span aria-label="5 etoiles">★★★★★</span>
        </div>
        <div className={styles.reviewTicker} aria-live="off">
          <div className={styles.reviewTrack}>
            {[...trustpilotReviews, ...trustpilotReviews].map((review, index) => (
              <article className={styles.reviewItem} key={`${review.id}-${index}`}>
                <span aria-hidden="true">★★★★★</span>
                <strong>{review.source}</strong>
                <p>{review.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer} id="suivi">
        <Link href="/client/mentions-legales">Mentions legales</Link>
        <Link href="/client/confidentialite">Confidentialite</Link>
        <Link href="/client/contact">Contact</Link>
        <Link href="/client/notre-equipe">Notre equipe</Link>
      </footer>
    </main>
  );
}
