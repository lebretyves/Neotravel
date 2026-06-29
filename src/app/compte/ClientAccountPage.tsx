import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Download,
  FileText,
  HelpCircle,
  KeyRound,
  Mail,
  MessageSquare,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";
import styles from "./account.module.css";

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

const navItems = [
  { href: "/compte", label: "Accueil", section: "home" },
  { href: "/compte/demandes", label: "Mes demandes", section: "demandes" },
  { href: "/compte/devis", label: "Mes devis", section: "devis" },
  { href: "/compte/documents", label: "Documents", section: "documents" },
  { href: "/compte/messages", label: "Messages", section: "messages" },
  { href: "/compte/profil", label: "Profil", section: "profil" },
  { href: "/compte/notifications", label: "Notifications", section: "notifications" },
  { href: "/compte/confidentialite", label: "Confidentialite", section: "confidentialite" },
  { href: "/compte/securite", label: "Securite", section: "securite" },
  { href: "/compte/aide", label: "Aide", section: "aide" }
] as const;

const demandRows = [
  ["NT-DMD-2406", "Paris -> Lyon", "Devis pret", "12/07/2026"],
  ["NT-DMD-2405", "Lille -> Bruxelles", "En qualification", "18/07/2026"],
  ["NT-DMD-2399", "Nantes -> Bordeaux", "Cloture", "04/06/2026"]
];

const quoteRows = [
  ["DEV-2026-042", "Paris -> Lyon", "2 640 EUR TTC", "A valider"],
  ["DEV-2026-037", "Nantes -> Bordeaux", "1 880 EUR TTC", "Accepte"]
];

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className={styles.statCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function TableCard({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>{title}</h2>
      </div>
      <div className={styles.table}>
        {rows.map((row) => (
          <div className={styles.tableRow} key={row.join("-")}>
            {row.map((cell, index) => (
              <span key={cell} className={index === 0 ? styles.reference : undefined}>
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function ToggleRow({ title, body, checked = false }: { title: string; body: string; checked?: boolean }) {
  return (
    <label className={styles.toggleRow}>
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
      <input type="checkbox" defaultChecked={checked} />
    </label>
  );
}

function Field({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  return (
    <label className={styles.field}>
      {label}
      <input type={type} defaultValue={value} />
    </label>
  );
}

function HomeSection() {
  return (
    <>
      <div className={styles.statsGrid}>
        <StatCard label="Demandes" value="3" note="2 dossiers actifs" />
        <StatCard label="Devis" value="2" note="1 devis a valider" />
        <StatCard label="Prochaine action" value="Validation" note="DEV-2026-042" />
      </div>
      <section className={styles.highlightPanel}>
        <div>
          <p className={styles.kicker}>Dernier devis</p>
          <h2>Paris {"->"} Lyon, 42 passagers</h2>
          <p>Votre devis est pret. Vous pouvez le consulter, le telecharger ou demander une modification.</p>
        </div>
        <Link className={styles.primaryButton} href="/compte/devis">
          Voir mes devis
        </Link>
      </section>
      <TableCard
        title="Activite recente"
        rows={[
          ["Aujourd'hui", "Devis DEV-2026-042 disponible", "Email envoye"],
          ["Hier", "Demande qualifiee", "Trajet confirme"],
          ["24/06", "Compte client cree", "Email + mot de passe"]
        ]}
      />
    </>
  );
}

function DocumentsSection() {
  return (
    <div className={styles.cardGrid}>
      {["Devis DEV-2026-042.pdf", "Conditions NeoTravel.pdf", "Recapitulatif demande NT-DMD-2406.pdf"].map((doc) => (
        <article className={styles.actionCard} key={doc}>
          <FileText aria-hidden="true" />
          <h2>{doc}</h2>
          <p>Document client disponible en telechargement.</p>
          <button className={styles.secondaryButton} type="button">Telecharger</button>
        </article>
      ))}
    </div>
  );
}

function MessagesSection() {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Messages NeoTravel</h2>
      </div>
      <div className={styles.messageList}>
        <article>
          <strong>Conseiller NeoTravel</strong>
          <p>Votre devis Paris {"->"} Lyon est pret. Confirmez les horaires souhaites avant validation definitive.</p>
        </article>
        <article>
          <strong>Systeme NeoTravel</strong>
          <p>Une relance automatique est programmee. Vous pouvez la suspendre depuis Notifications.</p>
        </article>
      </div>
    </section>
  );
}

function ProfileSection() {
  return (
    <form className={styles.formGrid}>
      <Field label="Prenom" value="Claire" />
      <Field label="Nom" value="Martin" />
      <Field label="Organisation" value="Association scolaire Alpha" />
      <Field label="Adresse" value="18 avenue des Voyages" />
      <Field label="Complement d'adresse" value="Batiment B" />
      <Field label="Code postal" value="75012" />
      <Field label="Ville" value="Paris" />
      <Field label="Pays" value="France" />
      <Field label="Email" value="client@neotravel.fr" type="email" />
      <Field label="Telephone" value="+33 6 12 34 56 78" />
      <button className={styles.primaryButton} type="button">Enregistrer</button>
    </form>
  );
}

function NotificationsSection() {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Preferences de contact</h2>
        <Bell aria-hidden="true" />
      </div>
      <div className={styles.stack}>
        <ToggleRow title="Suspendre les emails marketing" body="Ne plus recevoir les offres et communications commerciales." />
        <ToggleRow title="Suspendre les relances automatiques" body="Mettre en pause les relances non essentielles liees aux devis." />
        <ToggleRow title="Recevoir les messages importants" body="Conserver les emails de securite, devis, documents et obligations contractuelles." checked />
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <div className={styles.cardGrid}>
      <article className={styles.actionCard}>
        <Download aria-hidden="true" />
        <h2>Exporter mes donnees</h2>
        <p>Recuperer les demandes, devis, documents et preferences associes au compte.</p>
        <Link className={styles.secondaryButton} href="/compte/confidentialite/export">Preparer l'export</Link>
      </article>
      <article className={styles.actionCard}>
        <Trash2 aria-hidden="true" />
        <h2>Supprimer mon compte</h2>
        <p>Demande encadree avec conservation legale minimale si necessaire.</p>
        <Link className={styles.dangerButton} href="/compte/confidentialite/suppression">Demander la suppression</Link>
      </article>
    </div>
  );
}

function ExportSection() {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Extraction d'activite</h2>
        <Download aria-hidden="true" />
      </div>
      <div className={styles.stack}>
        <ToggleRow title="Demandes de transport" body="Inclure les trajets, dates, passagers et options." checked />
        <ToggleRow title="Devis et documents PDF" body="Inclure les references, statuts et montants visibles client." checked />
        <ToggleRow title="Messages et relances" body="Inclure l'historique des echanges et notifications." checked />
      </div>
      <button className={styles.primaryButton} type="button">Telecharger mon activite</button>
    </section>
  );
}

function DeletionSection() {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Suppression du compte</h2>
        <Trash2 aria-hidden="true" />
      </div>
      <p className={styles.warning}>
        La suppression ferme l'espace client. Certains devis, consentements ou elements de preuve peuvent etre
        conserves selon les obligations legales NeoTravel.
      </p>
      <label className={styles.field}>
        Confirmer avec votre mot de passe
        <input type="password" placeholder="Votre mot de passe" />
      </label>
      <button className={styles.dangerButton} type="button">Envoyer la demande de suppression</button>
    </section>
  );
}

function SecuritySection() {
  return (
    <form className={styles.formGrid}>
      <Field label="Email de connexion" value="client@neotravel.fr" type="email" />
      <Field label="Mot de passe actuel" value="" type="password" />
      <Field label="Nouveau mot de passe" value="" type="password" />
      <Field label="Confirmer le nouveau mot de passe" value="" type="password" />
      <button className={styles.primaryButton} type="button">Mettre a jour le mot de passe</button>
    </form>
  );
}

function HelpSection() {
  return (
    <div className={styles.cardGrid}>
      <article className={styles.actionCard}>
        <HelpCircle aria-hidden="true" />
        <h2>Contacter NeoTravel</h2>
        <p>Question sur un devis, un document ou une suppression de compte.</p>
        <button className={styles.secondaryButton} type="button">Demander un rappel</button>
      </article>
      <article className={styles.actionCard}>
        <MessageSquare aria-hidden="true" />
        <h2>Support client</h2>
        <p>Une reponse humaine est privilegiee pour les dossiers sensibles.</p>
        <button className={styles.secondaryButton} type="button">Ecrire au support</button>
      </article>
    </div>
  );
}

function renderSection(section: Section) {
  if (section === "home") return <HomeSection />;
  if (section === "demandes") return <TableCard title="Mes demandes" rows={demandRows} />;
  if (section === "devis") return <TableCard title="Mes devis" rows={quoteRows} />;
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

const titles: Record<Section, { eyebrow: string; title: string; body: string; icon: typeof UserRound }> = {
  home: { eyebrow: "Espace client", title: "Bonjour Claire", body: "Suivez vos demandes, devis, documents et preferences de contact.", icon: UserRound },
  demandes: { eyebrow: "Transport", title: "Mes demandes", body: "Vos demandes de trajet et leur avancement.", icon: Mail },
  devis: { eyebrow: "Propositions", title: "Mes devis", body: "Consultez les devis, statuts et documents associes.", icon: FileText },
  documents: { eyebrow: "Fichiers", title: "Documents", body: "Tous les fichiers client disponibles au meme endroit.", icon: FileText },
  messages: { eyebrow: "Suivi", title: "Messages", body: "Historique des echanges et informations importantes.", icon: MessageSquare },
  profil: { eyebrow: "Compte", title: "Profil", body: "Informations de contact utilisees pour vos demandes.", icon: UserRound },
  notifications: { eyebrow: "Preferences", title: "Notifications", body: "Suspendez les mailings ou relances non essentielles.", icon: Bell },
  confidentialite: { eyebrow: "Donnees", title: "Confidentialite", body: "Export d'activite, donnees personnelles et suppression.", icon: ShieldCheck },
  export: { eyebrow: "Donnees", title: "Extraction d'activite", body: "Choisissez les informations a telecharger.", icon: Download },
  suppression: { eyebrow: "Donnees", title: "Suppression du compte", body: "Demande encadree, distincte de l'effacement legal.", icon: Trash2 },
  securite: { eyebrow: "Acces", title: "Securite", body: "Email de connexion, mot de passe et sessions.", icon: KeyRound },
  aide: { eyebrow: "Support", title: "Aide", body: "Contacter NeoTravel ou demander un rappel.", icon: HelpCircle }
};

export function ClientAccountPage({ section }: { section: Section }) {
  const title = titles[section];
  const Icon = title.icon;

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
          <Image src="/logo-neotravel-v12.svg" alt="" width={250} height={72} priority />
        </Link>
        <nav className={styles.nav} aria-label="Navigation compte client">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} aria-current={item.section === section ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className={styles.logout} href="/">
          Deconnexion
        </Link>
      </aside>
      <section className={styles.content}>
        <header className={styles.hero}>
          <div>
            <p className={styles.kicker}>{title.eyebrow}</p>
            <h1>{title.title}</h1>
            <p>{title.body}</p>
          </div>
          <span className={styles.heroIcon}>
            <Icon aria-hidden="true" />
          </span>
        </header>
        {renderSection(section)}
      </section>
    </main>
  );
}
