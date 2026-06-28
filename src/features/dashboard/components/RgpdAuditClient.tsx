"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Database, FileCheck2, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import type { RgpdAuditData } from "@/features/dashboard/services/getRgpdAuditData";
import styles from "./dashboard.module.css";

type LoadState =
  | { status: "loading"; data?: RgpdAuditData; error?: never }
  | { status: "ready"; data: RgpdAuditData; error?: never }
  | { status: "error"; data?: RgpdAuditData; error: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function badgeTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("alerte") || normalized.includes("critique")) return "red";
  if (normalized.includes("verifier") || normalized.includes("definir") || normalized.includes("moyen")) return "gold";
  if (normalized.includes("ok") || normalized.includes("defini") || normalized.includes("necessaire") || normalized.includes("conforme")) return "green";
  return "blue";
}

function RgpdBadge({ children }: { children: string }) {
  return <span className={styles.rgpdBadge} data-tone={badgeTone(children)}>{children}</span>;
}

function RgpdKpiCard({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone: "blue" | "green" | "gold" | "red" }) {
  return (
    <article className={styles.rgpdKpiCard} data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function RgpdPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className={styles.rgpdPanel}>
      <div className={styles.rgpdPanelHeader}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function RgpdDataTable({ data }: { data: RgpdAuditData["dataInventory"] }) {
  if (!data.length) return <p className={styles.rgpdEmpty}>Aucune donnee disponible pour ce bloc.</p>;

  return (
    <div className={styles.rgpdTable}>
      <div className={styles.rgpdTableHead} style={{ gridTemplateColumns: "1fr 1.1fr 1.1fr .8fr 1fr .7fr" }}>
        <span>Donnee</span>
        <span>Usage</span>
        <span>Finalite</span>
        <span>Sensibilite</span>
        <span>Visible par</span>
        <span>Statut</span>
      </div>
      {data.map((item) => (
        <div className={styles.rgpdTableRow} key={item.data} style={{ gridTemplateColumns: "1fr 1.1fr 1.1fr .8fr 1fr .7fr" }}>
          <strong>{item.data}</strong>
          <span>{item.usage}</span>
          <span>{item.purpose}</span>
          <RgpdBadge>{item.sensitivity}</RgpdBadge>
          <span>{item.visibleBy}</span>
          <RgpdBadge>{item.status}</RgpdBadge>
        </div>
      ))}
    </div>
  );
}

function RgpdRetentionTable({ data }: { data: RgpdAuditData["retention"] }) {
  if (!data.length) return <p className={styles.rgpdEmpty}>Aucune donnee disponible pour ce bloc.</p>;

  return (
    <div className={styles.rgpdTable}>
      <div className={styles.rgpdTableHead} style={{ gridTemplateColumns: "1fr 1fr 1.2fr 1.2fr .7fr" }}>
        <span>Type de donnee</span>
        <span>Duree</span>
        <span>Justification</span>
        <span>Action prevue</span>
        <span>Statut</span>
      </div>
      {data.map((item) => (
        <div className={styles.rgpdTableRow} key={item.dataType} style={{ gridTemplateColumns: "1fr 1fr 1.2fr 1.2fr .7fr" }}>
          <strong>{item.dataType}</strong>
          <span>{item.duration}</span>
          <span>{item.justification}</span>
          <span>{item.plannedAction}</span>
          <RgpdBadge>{item.status}</RgpdBadge>
        </div>
      ))}
    </div>
  );
}

function RgpdProcessorsTable({ data }: { data: RgpdAuditData["processors"] }) {
  if (!data.length) return <p className={styles.rgpdEmpty}>Aucun sous-traitant externe configure.</p>;

  return (
    <div className={styles.rgpdTable}>
      <div className={styles.rgpdTableHead} style={{ gridTemplateColumns: ".9fr 1fr 1.4fr .7fr .7fr .7fr 1fr" }}>
        <span>Service</span>
        <span>Role</span>
        <span>Donnees transmises</span>
        <span>Frontend</span>
        <span>Secret</span>
        <span>Risque</span>
        <span>Statut</span>
      </div>
      {data.map((item) => (
        <div className={styles.rgpdTableRow} key={item.service} style={{ gridTemplateColumns: ".9fr 1fr 1.4fr .7fr .7fr .7fr 1fr" }}>
          <strong>{item.service}</strong>
          <span>{item.role}</span>
          <span>{item.dataShared}</span>
          <RgpdBadge>{item.frontendCall}</RgpdBadge>
          <RgpdBadge>{item.serverSecret}</RgpdBadge>
          <RgpdBadge>{item.risk}</RgpdBadge>
          <span>{item.status}</span>
        </div>
      ))}
    </div>
  );
}

function RgpdAuditTrail({ data }: { data: RgpdAuditData["auditTrail"] }) {
  if (!data.length) return <p className={styles.rgpdEmpty}>Aucun evenement d'audit enregistre sur cette periode.</p>;

  return (
    <div className={styles.rgpdTable}>
      <div className={styles.rgpdTableHead} style={{ gridTemplateColumns: "1fr .7fr 1.2fr 1fr .7fr .7fr .7fr" }}>
        <span>Date</span>
        <span>Acteur</span>
        <span>Action</span>
        <span>Objet</span>
        <span>Statut</span>
        <span>Empreinte</span>
        <span>Source</span>
      </div>
      {data.map((item) => (
        <div className={styles.rgpdTableRow} key={item.id} style={{ gridTemplateColumns: "1fr .7fr 1.2fr 1fr .7fr .7fr .7fr" }}>
          <span>{formatDate(item.date)}</span>
          <span>{item.actor}</span>
          <strong>{item.action}</strong>
          <span>{item.object}</span>
          <RgpdBadge>{item.status}</RgpdBadge>
          <RgpdBadge>{item.fingerprint}</RgpdBadge>
          <span>{item.source}</span>
        </div>
      ))}
    </div>
  );
}

function RgpdSecurityChecks({ data }: { data: RgpdAuditData["securityChecks"] }) {
  if (!data.length) return <p className={styles.rgpdEmpty}>Aucun controle en alerte.</p>;

  return (
    <div className={styles.rgpdTable}>
      <div className={styles.rgpdTableHead} style={{ gridTemplateColumns: "1.2fr .65fr .65fr 1.7fr" }}>
        <span>Controle</span>
        <span>Statut</span>
        <span>Gravite</span>
        <span>Recommandation</span>
      </div>
      {data.map((item) => (
        <div className={styles.rgpdTableRow} key={item.control} style={{ gridTemplateColumns: "1.2fr .65fr .65fr 1.7fr" }}>
          <strong>{item.control}</strong>
          <RgpdBadge>{item.status}</RgpdBadge>
          <RgpdBadge>{item.severity}</RgpdBadge>
          <span>{item.recommendation}</span>
        </div>
      ))}
    </div>
  );
}

export function RgpdAuditClient() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const loading = state.status === "loading";

  const load = () => {
    setState((previous) => ({ status: "loading", data: previous.data }));
    fetch("/api/dashboard/rgpd-audit")
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger l'audit RGPD.");
        return (await response.json()) as RgpdAuditData;
      })
      .then((data) => setState({ status: "ready", data }))
      .catch((error: Error) => setState((previous) => ({ status: "error", data: previous.data, error: error.message })));
  };

  useEffect(() => {
    load();
  }, []);

  const data = state.data;

  return (
    <main className={styles.page} data-no-translate>
      <header className={styles.rgpdHero}>
        <div>
          <p className={styles.eyebrow}>Conformite NeoTravel</p>
          <h1>Audit RGPD</h1>
          <p>Donnees minimales, conservation maitrisee et preuves d'audit sans exposition de secrets.</p>
        </div>
        <button className={styles.secondary} type="button" onClick={load} disabled={loading}>
          <RefreshCw aria-hidden="true" size={15} />
          Actualiser
        </button>
      </header>

      <section className={styles.rgpdIntro}>
        <ShieldCheck aria-hidden="true" size={20} />
        <span>
          Cette page synthetise les principaux controles RGPD appliques a NeoTravel : donnees traitees, durees de
          conservation, flux externes, preuves d'audit et securite des integrations.
        </span>
      </section>

      {state.status === "error" ? (
        <section className={styles.growthError} role="alert">
          <strong>Erreur de chargement</strong>
          <span>{state.error}</span>
        </section>
      ) : null}

      {loading && !data ? <section className={styles.growthLoading}>Chargement de l'audit RGPD...</section> : null}

      {data ? (
        <>
          <section className={styles.rgpdKpiSection} aria-label="KPI conformite">
            <div className={styles.rgpdSectionTitle}>
              <h2>KPI conformite</h2>
              <p>Indicateurs calcules depuis audit_logs et la configuration RGPD serveur.</p>
            </div>
            <div className={styles.rgpdKpiGrid}>
              <RgpdKpiCard label="Evenements d'audit" value={data.kpis.auditEvents} detail="Actions tracees dans audit_logs" tone="blue" />
              <RgpdKpiCard label="Actions sensibles tracees" value={data.kpis.sensitiveActions} detail="Devis, relances, statuts, reprise humaine" tone="blue" />
              <RgpdKpiCard label="Donnees personnelles suivies" value={data.kpis.personalDataCategories} detail="Categories declarees cote serveur" tone="gold" />
              <RgpdKpiCard label="Sous-traitants declares" value={data.kpis.processors} detail="Services et flux externes identifies" tone="gold" />
              <RgpdKpiCard label="Avec empreinte" value={data.kpis.integrityStampedEvents} detail="Logs avec hash de controle" tone="green" />
              <RgpdKpiCard label="Secrets exposes" value={data.kpis.exposedSecrets} detail={data.kpis.exposedSecrets === 0 ? "Aucun detecte" : "Controle requis"} tone={data.kpis.exposedSecrets === 0 ? "green" : "red"} />
            </div>
          </section>

          <RgpdPanel title="Donnees traitees" subtitle="Registre simple des donnees necessaires au traitement commercial et operationnel.">
            <RgpdDataTable data={data.dataInventory} />
          </RgpdPanel>

          <RgpdPanel title="Conservation" subtitle="Regles de conservation formulees pour un service en exploitation.">
            <RgpdRetentionTable data={data.retention} />
          </RgpdPanel>

          <RgpdPanel title="Sous-traitants et flux externes" subtitle="Separation des flux et minimisation des donnees transmises.">
            <RgpdProcessorsTable data={data.processors} />
            <div className={styles.rgpdRules}>
              {data.notes.map((note) => (
                <span key={note}><LockKeyhole aria-hidden="true" size={14} />{note}</span>
              ))}
            </div>
          </RgpdPanel>

          <RgpdPanel title="Preuve d'audit" subtitle="Dernieres actions sensibles journalisees sans payload ni secret.">
            <RgpdAuditTrail data={data.auditTrail} />
          </RgpdPanel>

          <RgpdPanel title="Controles securite" subtitle="Verification des principaux risques d'exposition cote client et integrations.">
            <div className={styles.rgpdSecuritySummary}>
              <span><CheckCircle2 aria-hidden="true" size={16} />OK : {data.securityChecks.filter((item) => item.status === "OK").length}</span>
              <span><AlertTriangle aria-hidden="true" size={16} />A verifier / alertes : {data.securityChecks.filter((item) => item.status !== "OK").length}</span>
              <span><Database aria-hidden="true" size={16} />Secrets affiches : {data.kpis.exposedSecrets}</span>
              <span><FileCheck2 aria-hidden="true" size={16} />Empreintes : {data.kpis.integrityStampedEvents}</span>
            </div>
            <RgpdSecurityChecks data={data.securityChecks} />
          </RgpdPanel>
        </>
      ) : null}
    </main>
  );
}
