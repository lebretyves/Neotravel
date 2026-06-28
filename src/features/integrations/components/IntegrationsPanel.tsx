"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import dashStyles from "@/features/dashboard/components/dashboard.module.css";
import type { IntegrationStatus } from "../integrations";
import styles from "./integrations.module.css";

function IntegrationCard({ integration }: { integration: IntegrationStatus }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h2>{integration.name}</h2>
          <p>{integration.description}</p>
        </div>
        <span className={`${styles.statusPill} ${integration.connected ? styles.connected : styles.disconnected}`}>
          {integration.connected ? (
            <CheckCircle2 aria-hidden="true" size={14} />
          ) : (
            <XCircle aria-hidden="true" size={14} />
          )}
          {integration.connected ? "Connecté" : "Non connecté"}
        </span>
      </div>

      <p className={styles.detail}>{integration.detail}</p>

      {integration.fields.length > 0 ? (
        <div className={styles.form}>
          <p className={styles.formTitle}>Variables attendues — lecture seule</p>
          <div className={styles.grid}>
            {integration.fields.map((field) => (
              <div key={field.key} className={styles.field}>
                <span className={styles.fieldLabel}>
                  {field.label} <code>{field.key}</code>
                  <em className={field.isSet ? styles.fieldSet : styles.fieldMissing}>
                    {field.isSet ? "défini" : "manquant"}
                  </em>
                </span>
                <p>{field.secret ? "Secret jamais affiché dans le dashboard." : field.placeholder ?? "Variable d’environnement."}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.detail}>Aucune configuration requise.</p>
      )}
    </section>
  );
}

export function IntegrationsPanel({ integrations }: { integrations: IntegrationStatus[] }) {
  const connected = integrations.filter((item) => item.connected).length;

  return (
    <main className={dashStyles.page}>
      <header className={dashStyles.header}>
        <div>
          <p className={dashStyles.eyebrow}>Système</p>
          <h1>Connexions</h1>
          <p>
            État des intégrations — <strong>{connected}/{integrations.length} connectées</strong>. Cette page ne stocke
            aucune clé et n&apos;affiche aucune valeur secrète.
          </p>
        </div>
      </header>

      <section className={styles.securityNote}>
        <strong>Gestion des secrets</strong>
        <p>
          Les clés restent dans l&apos;environnement serveur : `.env.local` en développement, variables Vercel/Supabase en
          production. Le dashboard montre seulement si une variable est définie.
        </p>
      </section>

      <div className={styles.list}>
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </main>
  );
}
