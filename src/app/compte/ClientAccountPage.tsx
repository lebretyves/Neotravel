"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  Download,
  FileText,
  HelpCircle,
  KeyRound,
  Mail,
  MessageSquare,
  Trash2
} from "lucide-react";
import { useClientAccount } from "@/features/client-account/components/ClientAccountContext";
import type { ClientAccountTableRow } from "@/features/client-account/services/getClientAccountData";
import dashStyles from "@/features/dashboard/components/dashboard.module.css";
import generalStyles from "@/features/dashboard/components/generalDashboard.module.css";
import styles from "@/features/client-account/components/clientAccount.module.css";

type Section =
  | "home"
  | "demandes"
  | "devis"
  | "documents"
  | "messages"
  | "profil"
  | "notifications"
  | "confidentialite"
  | "export"
  | "suppression"
  | "securite"
  | "aide";

function parseDownloadFilename(disposition: string | null) {
  if (!disposition) return `neotravel-export-${new Date().toISOString().slice(0, 10)}.json`;
  const match = /filename="([^"]+)"/i.exec(disposition);
  return match?.[1] ?? "neotravel-export.json";
}

async function downloadExportFile(response: Response) {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = parseDownloadFilename(response.headers.get("Content-Disposition"));
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function apiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  return fallback;
}

function DataTable({
  title,
  subtitle,
  rows,
  emptyLabel
}: {
  title: string;
  subtitle: string;
  rows: ClientAccountTableRow[];
  emptyLabel: string;
}) {
  return (
    <section className={dashStyles.panel}>
      <div className={dashStyles.panelHeader}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {rows.length ? (
        <div className={dashStyles.tableViewport}>
          <div className={dashStyles.table} style={{ ["--cols" as string]: "minmax(140px,1fr) 1.4fr 1fr 1fr" }}>
            <div className={dashStyles.tableHead}>
              <span>Référence</span>
              <span>Trajet / détail</span>
              <span>Statut</span>
              <span>Date / montant</span>
            </div>
            {rows.map((row) => (
              <div className={dashStyles.row} key={row.join("-")}>
                {row.map((cell) => (
                  <span key={cell}>{cell}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.emptyState}>{emptyLabel}</p>
      )}
    </section>
  );
}

function HeroCard({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "gold" | "green";
}) {
  const toneClass =
    tone === "gold" ? generalStyles.toneGold : tone === "green" ? generalStyles.toneGreen : generalStyles.toneBlue;

  return (
    <article className={`${generalStyles.heroCard} ${toneClass}`}>
      <span className={generalStyles.heroLabel}>{label}</span>
      <strong className={generalStyles.heroValue}>{value}</strong>
      <small className={generalStyles.heroDetail}>{detail}</small>
    </article>
  );
}

function ToggleRow({
  title,
  body,
  checked = false,
  onChange
}: {
  title: string;
  body: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
      <input
        type="checkbox"
        checked={onChange ? checked : undefined}
        defaultChecked={onChange ? undefined : checked}
        onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
      />
    </label>
  );
}

function Field({
  label,
  value,
  type = "text",
  name,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  type?: string;
  name?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      {label}
      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        readOnly={!onChange}
      />
    </label>
  );
}

function HomeSection() {
  const { stats, latestQuote, activity, quotes } = useClientAccount();

  return (
    <>
      <div className={generalStyles.heroGrid}>
        <HeroCard
          label="Demandes"
          value={String(stats.demandCount)}
          detail={`${stats.activeDemandCount} dossier${stats.activeDemandCount > 1 ? "s" : ""} actif${stats.activeDemandCount > 1 ? "s" : ""}`}
          tone="blue"
        />
        <HeroCard
          label="Devis"
          value={String(stats.quoteCount)}
          detail={`${stats.pendingQuoteCount} devis à valider`}
          tone="gold"
        />
        <HeroCard
          label="Prochaine action"
          value={stats.nextActionLabel}
          detail={stats.nextActionDetail}
          tone="green"
        />
      </div>

      {latestQuote ? (
        <section className={styles.ctaBanner}>
          <div>
            <p className={generalStyles.eyebrow}>Dernier devis</p>
            <h2>
              {latestQuote.route}
              {latestQuote.amountLabel ? ` — ${latestQuote.amountLabel}` : ""}
            </h2>
            <p>Statut : {latestQuote.statusLabel}. Consultez-le, téléchargez-le ou demandez une modification.</p>
          </div>
          <Link className={generalStyles.primaryCta} href={latestQuote.href}>
            Voir le devis <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <section className={styles.ctaBanner}>
          <div>
            <p className={generalStyles.eyebrow}>Première demande</p>
            <h2>Lancez votre demande de transport</h2>
            <p>Vous n&apos;avez pas encore de devis associé à ce compte.</p>
          </div>
          <Link className={generalStyles.primaryCta} href="/client/demande">
            Nouvelle demande <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      )}

      <DataTable
        title="Activité récente"
        subtitle="Dernières notifications et événements de votre espace client."
        rows={activity}
        emptyLabel="Aucune activité pour le moment."
      />

      {quotes.length ? (
        <section className={styles.quickLinks}>
          <Link href="/compte/devis">Voir tous mes devis</Link>
          <Link href="/compte/demandes">Voir toutes mes demandes</Link>
        </section>
      ) : null}
    </>
  );
}

function DemandesSection() {
  const { leads } = useClientAccount();
  const rows: ClientAccountTableRow[] = leads.map((lead) => [
    lead.reference,
    lead.route,
    lead.statusLabel,
    lead.dateLabel
  ]);

  return (
    <DataTable
      title="Mes demandes"
      subtitle="Vos demandes de trajet et leur avancement."
      rows={rows}
      emptyLabel="Aucune demande liée à ce compte pour le moment."
    />
  );
}

function DevisSection() {
  const { quotes } = useClientAccount();
  const rows: ClientAccountTableRow[] = quotes.map((quote) => [
    quote.reference,
    quote.route,
    quote.statusLabel,
    quote.amountLabel
  ]);

  return (
    <>
      <DataTable
        title="Mes devis"
        subtitle="Consultez les devis, statuts et montants associés."
        rows={rows}
        emptyLabel="Aucun devis disponible pour ce compte."
      />
      {quotes.length ? (
        <section className={styles.quickLinks}>
          {quotes.map((quote) => (
            <Link key={quote.id} href={quote.href}>
              Ouvrir {quote.reference}
            </Link>
          ))}
        </section>
      ) : null}
    </>
  );
}

function DocumentsSection() {
  const { quotes } = useClientAccount();

  if (!quotes.length) {
    return <p className={styles.emptyState}>Aucun document disponible pour le moment.</p>;
  }

  return (
    <div className={styles.actionGrid}>
      {quotes.map((quote) => (
        <article className={styles.actionCard} key={quote.id}>
          <FileText aria-hidden="true" />
          <h2>Devis {quote.reference}</h2>
          <p>
            {quote.route} — {quote.amountLabel}
          </p>
          <Link className={styles.secondaryButton} href={`/api/quotes/${quote.id}/pdf`} download>
            Télécharger PDF
          </Link>
        </article>
      ))}
    </div>
  );
}

function MessagesSection() {
  const { quotes, leads } = useClientAccount();
  const latestQuote = quotes[0];
  const latestLead = leads[0];

  return (
    <section className={dashStyles.panel}>
      <div className={dashStyles.panelHeader}>
        <div>
          <h2>Messages NeoTravel</h2>
          <p>Informations importantes liées à votre compte.</p>
        </div>
      </div>
      <div className={styles.messageList}>
        {latestQuote ? (
          <article>
            <strong>Devis {latestQuote.reference}</strong>
            <p>
              Votre devis {latestQuote.route} est {latestQuote.statusLabel.toLowerCase()}. Consultez-le depuis votre
              espace client.
            </p>
          </article>
        ) : null}
        {latestLead ? (
          <article>
            <strong>Demande {latestLead.reference}</strong>
            <p>
              Statut actuel : {latestLead.statusLabel}. Trajet {latestLead.route}.
            </p>
          </article>
        ) : null}
        {!latestQuote && !latestLead ? (
          <article>
            <strong>Aucun message</strong>
            <p>Vos échanges apparaîtront ici dès qu&apos;une demande ou un devis sera créé.</p>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function ProfileSection() {
  const router = useRouter();
  const { client, displayName } = useClientAccount();
  const [firstName, ...rest] = displayName.split(" ");
  const [form, setForm] = useState({
    firstName: firstName ?? displayName,
    lastName: rest.join(" "),
    organization: client.organization ?? "",
    phone: client.phone ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/compte/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          organization: form.organization || null,
          phone: form.phone || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, "Impossible d'enregistrer le profil."));
      setFeedback("Profil enregistré.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le profil.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={dashStyles.panel}>
      <div className={dashStyles.panelHeader}>
        <div>
          <h2>Profil</h2>
          <p>Informations de contact utilisées pour vos demandes.</p>
        </div>
      </div>
      <form className={styles.formGrid} onSubmit={handleSubmit}>
        <Field label="Prénom" value={form.firstName} onChange={(value) => setForm((current) => ({ ...current, firstName: value }))} />
        <Field label="Nom" value={form.lastName} onChange={(value) => setForm((current) => ({ ...current, lastName: value }))} />
        <Field
          label="Organisation"
          value={form.organization}
          onChange={(value) => setForm((current) => ({ ...current, organization: value }))}
        />
        <Field label="Email" value={client.email} type="email" />
        <Field label="Téléphone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
        <button className={generalStyles.primaryCta} type="submit" disabled={isSaving}>
          {isSaving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {feedback ? <p className={styles.workflowReady}>{feedback}</p> : null}
        {error ? <p className={styles.workflowError}>{error}</p> : null}
      </form>
    </section>
  );
}

function NotificationsSection() {
  return (
    <section className={dashStyles.panel}>
      <div className={dashStyles.panelHeader}>
        <div>
          <h2>Préférences de contact</h2>
          <p>Gérez les emails marketing et les relances automatiques.</p>
        </div>
        <Bell aria-hidden="true" />
      </div>
      <div className={`${styles.stack} ${styles.formGrid}`}>
        <ToggleRow title="Suspendre les emails marketing" body="Ne plus recevoir les offres et communications commerciales." />
        <ToggleRow title="Suspendre les relances automatiques" body="Mettre en pause les relances non essentielles liées aux devis." />
        <ToggleRow
          title="Recevoir les messages importants"
          body="Conserver les emails de sécurité, devis, documents et obligations contractuelles."
          checked
        />
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <div className={styles.actionGrid}>
      <article className={styles.actionCard}>
        <Download aria-hidden="true" />
        <h2>Exporter mes données</h2>
        <p>Récupérer les demandes, devis, documents et préférences associés au compte.</p>
        <Link className={styles.secondaryButton} href="/compte/confidentialite/export">
          Préparer l&apos;export
        </Link>
      </article>
      <article className={styles.actionCard}>
        <Trash2 aria-hidden="true" />
        <h2>Supprimer mon compte</h2>
        <p>Demande encadrée avec conservation légale minimale si nécessaire.</p>
        <Link className={styles.dangerButton} href="/compte/confidentialite/suppression">
          Demander la suppression
        </Link>
      </article>
    </div>
  );
}

function ExportSection() {
  const [includeDemands, setIncludeDemands] = useState(true);
  const [includeQuotes, setIncludeQuotes] = useState(true);
  const [includeMessages, setIncludeMessages] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!includeDemands && !includeQuotes && !includeMessages) {
      setError("Sélectionnez au moins une catégorie à exporter.");
      setFeedback(null);
      return;
    }

    setIsExporting(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/compte/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeDemands,
          includeQuotes,
          includeMessages,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(apiErrorMessage(payload, "Impossible de préparer l'export."));
      }

      await downloadExportFile(response);
      setFeedback("Votre export a été téléchargé.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de préparer l'export.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className={dashStyles.panel}>
      <div className={dashStyles.panelHeader}>
        <div>
          <h2>Extraction d&apos;activité</h2>
          <p>Choisissez les informations à télécharger.</p>
        </div>
        <Download aria-hidden="true" />
      </div>
      <div className={`${styles.stack} ${styles.formGrid}`}>
        <ToggleRow
          title="Demandes de transport"
          body="Inclure les trajets, dates, passagers et options."
          checked={includeDemands}
          onChange={setIncludeDemands}
        />
        <ToggleRow
          title="Devis et documents PDF"
          body="Inclure les références, statuts et montants visibles client."
          checked={includeQuotes}
          onChange={setIncludeQuotes}
        />
        <ToggleRow
          title="Messages et relances"
          body="Inclure l'historique des échanges et notifications."
          checked={includeMessages}
          onChange={setIncludeMessages}
        />
      </div>
      <div className={styles.formGrid}>
        <button className={generalStyles.primaryCta} type="button" disabled={isExporting} onClick={() => void handleExport()}>
          {isExporting ? "Préparation du fichier…" : "Télécharger mon activité"}
        </button>
        {feedback ? <p className={styles.workflowReady}>{feedback}</p> : null}
        {error ? <p className={styles.workflowError}>{error}</p> : null}
      </div>
    </section>
  );
}

function DeletionSection() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/compte/deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; redirectTo?: string; error?: { message?: string } }
        | null;

      if (!response.ok) {
        throw new Error(apiErrorMessage(payload, "Impossible d'enregistrer la demande."));
      }

      router.push(payload?.redirectTo ?? "/connexion");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer la demande.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className={dashStyles.panel}>
      <div className={dashStyles.panelHeader}>
        <div>
          <h2>Suppression du compte</h2>
          <p>Demande encadrée, distincte de l&apos;effacement légal.</p>
        </div>
        <Trash2 aria-hidden="true" />
      </div>
      <p className={styles.warning}>
        La suppression ferme l&apos;espace client. Certains devis, consentements ou éléments de preuve peuvent être
        conservés selon les obligations légales NeoTravel.
      </p>
      <form className={styles.formGrid} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Confirmer avec votre mot de passe
          <input
            type="password"
            placeholder="Votre mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button className={styles.dangerButton} type="submit" disabled={isSubmitting || !password}>
          {isSubmitting ? "Envoi en cours…" : "Envoyer la demande de suppression"}
        </button>
        {error ? <p className={styles.workflowError}>{error}</p> : null}
      </form>
    </section>
  );
}

function SecuritySection() {
  const { client } = useClientAccount();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/compte/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, "Impossible de mettre à jour le mot de passe."));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback("Mot de passe mis à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour le mot de passe.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={dashStyles.panel}>
      <div className={dashStyles.panelHeader}>
        <div>
          <h2>Sécurité</h2>
          <p>Email de connexion, mot de passe et sessions.</p>
        </div>
        <KeyRound aria-hidden="true" />
      </div>
      <form className={styles.formGrid} onSubmit={handleSubmit}>
        <Field label="Email de connexion" value={client.email} type="email" />
        <Field
          label="Mot de passe actuel"
          value={currentPassword}
          type="password"
          onChange={setCurrentPassword}
        />
        <Field label="Nouveau mot de passe" value={newPassword} type="password" onChange={setNewPassword} />
        <Field
          label="Confirmer le nouveau mot de passe"
          value={confirmPassword}
          type="password"
          onChange={setConfirmPassword}
        />
        <button className={generalStyles.primaryCta} type="submit" disabled={isSaving}>
          {isSaving ? "Mise à jour…" : "Mettre à jour le mot de passe"}
        </button>
        {feedback ? <p className={styles.workflowReady}>{feedback}</p> : null}
        {error ? <p className={styles.workflowError}>{error}</p> : null}
      </form>
    </section>
  );
}

function HelpSection() {
  return (
    <div className={styles.actionGrid}>
      <article className={styles.actionCard}>
        <HelpCircle aria-hidden="true" />
        <h2>Contacter NeoTravel</h2>
        <p>Question sur un devis, un document ou une suppression de compte.</p>
        <Link className={styles.secondaryButton} href="/client/contact">
          Contacter NeoTravel
        </Link>
      </article>
      <article className={styles.actionCard}>
        <MessageSquare aria-hidden="true" />
        <h2>Support client</h2>
        <p>Une réponse humaine est privilégiée pour les dossiers sensibles.</p>
        <Link className={styles.secondaryButton} href="/client/contact">
          Écrire au support
        </Link>
      </article>
    </div>
  );
}

function renderSection(section: Section) {
  if (section === "home") return <HomeSection />;
  if (section === "demandes") return <DemandesSection />;
  if (section === "devis") return <DevisSection />;
  if (section === "documents") return <DocumentsSection />;
  if (section === "messages") return <MessagesSection />;
  if (section === "profil") return <ProfileSection />;
  if (section === "notifications") return <NotificationsSection />;
  if (section === "confidentialite") return <PrivacySection />;
  if (section === "export") return <ExportSection />;
  if (section === "suppression") return <DeletionSection />;
  if (section === "securite") return <SecuritySection />;
  return <HelpSection />;
}

const titles: Record<Section, { eyebrow: string; title: string; body: string }> = {
  home: { eyebrow: "Espace client", title: "Bonjour", body: "Suivez vos demandes, devis, documents et préférences de contact." },
  demandes: { eyebrow: "Transport", title: "Mes demandes", body: "Vos demandes de trajet et leur avancement." },
  devis: { eyebrow: "Propositions", title: "Mes devis", body: "Consultez les devis, statuts et montants associés." },
  documents: { eyebrow: "Fichiers", title: "Documents", body: "Les PDF de vos devis disponibles au même endroit." },
  messages: { eyebrow: "Suivi", title: "Messages", body: "Informations importantes liées à votre compte." },
  profil: { eyebrow: "Compte", title: "Profil", body: "Informations de contact utilisées pour vos demandes." },
  notifications: { eyebrow: "Préférences", title: "Notifications", body: "Suspendez les mailings ou relances non essentielles." },
  confidentialite: { eyebrow: "Données", title: "Confidentialité", body: "Export d'activité, données personnelles et suppression." },
  export: { eyebrow: "Données", title: "Extraction d'activité", body: "Choisissez les informations à télécharger." },
  suppression: { eyebrow: "Données", title: "Suppression du compte", body: "Demande encadrée, distincte de l'effacement légal." },
  securite: { eyebrow: "Accès", title: "Sécurité", body: "Email de connexion, mot de passe et sessions." },
  aide: { eyebrow: "Support", title: "Aide", body: "Contacter NeoTravel ou demander un rappel." }
};

export function ClientAccountPage({ section }: { section: Section }) {
  const { displayName, client } = useClientAccount();
  const title = titles[section];
  const heading = section === "home" ? `Bonjour ${displayName}` : title.title;

  return (
    <main className={dashStyles.page}>
      <header className={generalStyles.pageHeader}>
        <div>
          <p className={generalStyles.eyebrow}>{title.eyebrow}</p>
          <h1>{heading}</h1>
          <p>{title.body}</p>
        </div>
        <div className={generalStyles.headerAside}>
          <div className={generalStyles.headerHint}>
            <Mail size={16} aria-hidden="true" />
            Connecté en tant que {client.email}
          </div>
        </div>
      </header>
      {renderSection(section)}
    </main>
  );
}
