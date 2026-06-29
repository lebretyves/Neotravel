import Link from "next/link";
import { getLeadDetail } from "@/features/lead-detail/services/getLeadDetail";
import { getQuoteById } from "../services/getQuoteById";
import { QuoteClientActions } from "./QuoteClientActions";
import styles from "./quote-client.module.css";

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "À confirmer";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatTripDates(departureDate: string | null | undefined, returnDate: string | null | undefined) {
  const departure = formatDate(departureDate);
  if (!returnDate) return departure;

  return `${departure} - retour ${formatDate(returnDate)}`;
}

function formatTripType(value: string | null | undefined) {
  if (value === "round_trip") return "Aller-retour";
  if (value === "one_way") return "Aller simple";

  return "À confirmer";
}

export async function QuoteClientView({ quoteId }: { quoteId: string }) {
  const storedQuote = await getQuoteById(quoteId);
  const lead = storedQuote ? await getLeadDetail(storedQuote.leadId) : null;

  if (!storedQuote) {
    return (
      <main className={styles.page}>
        <section className={styles.notFound}>
          <h1>Devis introuvable</h1>
          <p>La référence demandée ne correspond à aucun devis conservé.</p>
          <Link href="/">Retour accueil</Link>
        </section>
      </main>
    );
  }

  const calculation = storedQuote.calculation;
  const clientName = lead?.organization ?? "Client particulier / organisation";
  const clientEmail = lead?.email ?? "Email à confirmer";
  const passengerLabel = lead?.passengerCount ? `${lead.passengerCount} passagers` : "À confirmer";
  const tripDates = formatTripDates(lead?.departureDate, lead?.returnDate);
  const routeLabel =
    lead?.departureCity && lead?.arrivalCity
      ? `${lead.departureCity} -> ${lead.arrivalCity}`
      : calculation.breakdown.routeLabel;
  // Priced option lines from the engine — each carries a label, a note, and an amount that
  // is 0 € only as a placeholder when no official price exists (never shown as free).
  const optionLines = calculation.breakdown.options;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
          <span className={styles.logoShield}>N</span>
          <span>
            <strong>
              Neo <em>Travel</em>
            </strong>
            <small>transport premium groupes</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Parcours client">
          <Link href="/client/demande">Conversation</Link>
          <span>Devis</span>
          <Link href="/client/contact">Contact</Link>
        </nav>
      </header>

      <section className={styles.pageIntro}>
        <h1>Mon devis NeoTravel</h1>
        <p>Votre devis détaillé, établi à partir de votre demande.</p>
        <span aria-hidden="true">↓</span>
      </section>

      <div className={styles.documentLayout}>
        <article className={styles.shell}>
          <div className={styles.paperBars} aria-hidden="true">
            <span className={styles.redBar} />
            <span className={styles.goldBar} />
            <span className={styles.blueBar} />
          </div>

          <header className={styles.pdfHeader}>
            <Link className={styles.pdfLogo} href="/" aria-label="NeoTravel accueil">
              <span className={styles.logoShield}>N</span>
              <span>
                <strong>
                  Neo <em>Travel</em>
                </strong>
                <small>Transport de voyageurs - devis client</small>
              </span>
            </Link>
            <div className={styles.reference}>
              <strong>DEVIS</strong>
              <span>N° {calculation.quoteNumber}</span>
            </div>
          </header>

          <section className={styles.metaStrip} aria-label="Informations devis">
            <div>
              <span>Date d'émission</span>
              <strong>{new Date().toLocaleDateString("fr-FR")}</strong>
            </div>
            <div>
              <span>Validité offre</span>
              <strong>7 jours</strong>
            </div>
            <div>
              <span>Canal envoi</span>
              <strong>Email + espace client</strong>
            </div>
          </section>

          <div className={styles.partiesGrid}>
            <section className={styles.partyBox}>
              <h2>Émetteur</h2>
              <p>NeoTravel SAS</p>
              <p>Transport de voyageurs</p>
              <p>contact@neotravel.fr</p>
            </section>
            <section className={styles.partyBox}>
              <h2>Client</h2>
              <p>{clientName}</p>
              <p>Email : {clientEmail}</p>
              <p>Référence demande : {storedQuote.leadId}</p>
            </section>
          </div>

          <section className={styles.tripBox} aria-labelledby="quote-details">
            <h2 id="quote-details">Prestation demandée</h2>
            <div className={styles.tripGrid}>
              <div>
                <span>Trajet</span>
                <strong>{routeLabel}</strong>
              </div>
              <div>
                <span>Date et horaires</span>
                <strong>{tripDates} - horaires à confirmer</strong>
              </div>
              <div>
                <span>Passagers</span>
                <strong>{passengerLabel}</strong>
              </div>
              <div>
                <span>Type de trajet</span>
                <strong>{formatTripType(lead?.tripType)}</strong>
              </div>
              <div>
                <span>Véhicule</span>
                <strong>{calculation.breakdown.vehicleLabel}</strong>
              </div>
              <div>
                <span>Distance</span>
                <strong>{calculation.distanceKm} km</strong>
              </div>
            </div>
            <div className={styles.optionChips}>
              {optionLines.length ? (
                optionLines.map((option) => <span key={option.code}>{option.label}</span>)
              ) : (
                <span>Aucune option ajoutée</span>
              )}
            </div>
          </section>

          <section className={styles.breakdown} aria-labelledby="price-breakdown">
            <h2 id="price-breakdown">Détail estimatif</h2>
            <div className={styles.priceTable}>
              <div className={styles.priceHead}>
                <span>Désignation</span>
                <span>Qte</span>
                <span>Prix HT</span>
                <span>TVA</span>
                <span>Total TTC</span>
              </div>
              {calculation.lines.map((line) => (
                <div className={styles.priceLine} key={line.label}>
                  <span>{line.label}</span>
                  <span>1</span>
                  <span>{formatEuro(line.amount)}</span>
                  <span>{formatPercent(calculation.vatRate)}</span>
                  <strong>{formatEuro(line.amount + line.amount * calculation.vatRate)}</strong>
                </div>
              ))}
            </div>

            {optionLines.length ? (
              <div className={styles.optionDetail}>
                <h3>Options demandees</h3>
                {optionLines.map((option) => (
                  <div className={styles.optionDetailLine} key={option.code}>
                    <span>{option.label}</span>
                    <span>
                      {option.amountEur && option.amountEur > 0
                        ? formatEuro(option.amountEur)
                        : `${option.note ?? "À confirmer"} — 0 € (placeholder)`}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={styles.validationAndTotals}>
              <div className={styles.validationBox}>
                <h3>Référence devis</h3>
                <p>Date d&apos;emission : {new Date().toLocaleDateString("fr-FR")}</p>
                <p>Référence : {calculation.quoteNumber}</p>
                <p>Devis détaillé et sans engagement, valable 7 jours.</p>
              </div>
              <div className={styles.totalsBox}>
                <div>
                  <span>Total HT</span>
                  <strong>{formatEuro(calculation.priceHt)}</strong>
                </div>
                <div>
                  <span>TVA estimée</span>
                  <strong>{formatEuro(calculation.vatAmount)}</strong>
                </div>
                <div>
                  <span>Total TTC</span>
                  <strong>{formatEuro(calculation.priceTtc)}</strong>
                </div>
                <p>Montant à confirmer après disponibilité finale</p>
              </div>
            </div>
          </section>

          <section className={styles.conditionsBox}>
            <h2>Conditions et acceptation</h2>
            <p>
              Offre valable sous réserve de disponibilité partenaires et chauffeur. Le devis devient contractuel après
              signature électronique ou accord écrit du client. Ce document est un devis, pas une facture.
            </p>
          </section>

          <div className={styles.signatureGrid}>
            <div>
              <h3>Bon pour accord client</h3>
              <span>Date, nom et signature électronique</span>
            </div>
            <div>
              <h3>Validation NeoTravel</h3>
              <p>Genere automatiquement apres validation regles metier.</p>
            </div>
          </div>

          <QuoteClientActions quoteId={quoteId} initialStatus={storedQuote.status} />
        </article>
      </div>
    </main>
  );
}
