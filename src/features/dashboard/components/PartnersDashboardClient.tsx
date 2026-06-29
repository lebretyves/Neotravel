"use client";

import { useState } from "react";
import { Bus, ClipboardList, Network, Target } from "lucide-react";
import type { PartnersDashboardData } from "@/features/dashboard/services/getPartnersDashboardData";
import { formatPartnerStatus } from "@/features/partners/components/partnerData";
import { PartnersManager } from "@/features/partners/components/PartnersManager";
import { AlphaDashboardLayout } from "./AlphaDashboardLayout";
import styles from "./alphaDashboard.module.css";

type TabId = "overview" | "reseau" | "gestion";

const TABS = [
  { id: "overview" as const, label: "Vue d'ensemble", icon: Target },
  { id: "reseau" as const, label: "Réseau", icon: Network },
  { id: "gestion" as const, label: "Gestion", icon: Bus }
];

export function PartnersDashboardClient({
  data,
  selectedPartnerId
}: {
  data: PartnersDashboardData;
  selectedPartnerId?: string;
}) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <AlphaDashboardLayout
      eyebrow="Intermédiation partenaires"
      title="Partenaires autocaristes"
      subtitle="Rapprochez une demande NeoTravel d'un partenaire pertinent — validation finale toujours humaine."
      hint="Aucune confirmation automatique : chaque engagement partenaire est audité."
      hero={data.hero}
      banner={{
        kind: "info",
        label: "Validation humaine obligatoire",
        description: "Les suggestions partenaires sont indicatives. Le commercial valide avant tout engagement opérationnel."
      }}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(id) => setTab(id as TabId)}
      note="La validation partenaire reste humaine et tracée — jamais automatique."
    >
      {tab === "overview" ? (
        <div className={styles.overviewGrid}>
          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <Network size={18} aria-hidden="true" />
              <div>
                <h2>Résumé réseau</h2>
                <p>État du portefeuille partenaires.</p>
              </div>
            </div>
            <div className={styles.statusList}>
              {data.summary.map((row) => (
                <div className={styles.statusRow} key={row.label}>
                  <span>{row.label}</span>
                  <strong data-tone={row.tone}>{row.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <Bus size={18} aria-hidden="true" />
              <div>
                <h2>Partenaires référencés</h2>
                <p>Aperçu du réseau actif.</p>
              </div>
            </div>
            <div className={styles.jumpList}>
              {data.partners.slice(0, 4).map((partner) => (
                <button
                  key={partner.id}
                  type="button"
                  className={styles.jumpRow}
                  onClick={() => setTab("gestion")}
                >
                  <div>
                    <strong>{partner.name}</strong>
                    <span>
                      {formatPartnerStatus(partner.status)} · Score {partner.score}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </article>
        </div>
      ) : null}

      {tab === "reseau" ? (
        <article className={styles.panelCard}>
          <div className={styles.panelHead}>
            <ClipboardList size={18} aria-hidden="true" />
            <div>
              <h2>Liste du réseau</h2>
              <p>Tous les partenaires avec zones et capacité.</p>
            </div>
          </div>
          <div className={styles.auditTable}>
            <div className={styles.auditHead} style={{ gridTemplateColumns: "1.2fr 1fr .8fr .9fr .5fr" }}>
              <span>Partenaire</span>
              <span>Zones</span>
              <span>Capacité</span>
              <span>Statut</span>
              <span>Score</span>
            </div>
            {data.partners.map((partner) => (
              <div
                className={styles.auditRow}
                key={partner.id}
                style={{ gridTemplateColumns: "1.2fr 1fr .8fr .9fr .5fr" }}
              >
                <span>
                  <strong>{partner.name}</strong>
                </span>
                <span>{partner.zones}</span>
                <span>{partner.capacity}</span>
                <span>{formatPartnerStatus(partner.status)}</span>
                <span>{partner.score}</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {tab === "gestion" ? (
        <div className={styles.embedded}>
          <PartnersManager selectedPartnerId={selectedPartnerId} />
        </div>
      ) : null}
    </AlphaDashboardLayout>
  );
}
