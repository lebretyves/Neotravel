"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import dashStyles from "@/features/dashboard/components/dashboard.module.css";
import { saveIntegrationEnv } from "../actions";
import type { IntegrationStatus } from "../integrations";
import styles from "./integrations.module.css";

type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string };

function IntegrationCard({ integration }: { integration: IntegrationStatus }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>({ status: "idle" });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setState({ status: "saving" });
    const result = await saveIntegrationEnv(values);
    if (result.ok) {
      setState({ status: "saved", message: "Enregistré. Redémarrez le serveur pour activer la connexion." });
    } else {
      setState({ status: "error", message: result.error ?? "Échec de l'enregistrement." });
    }
  }

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
        <form className={styles.form} onSubmit={onSubmit}>
          <p className={styles.formTitle}>Champs nécessaires pour connecter</p>
          <div className={styles.grid}>
            {integration.fields.map((field) => (
              <label key={field.key} className={styles.field}>
                <span className={styles.fieldLabel}>
                  {field.label} <code>{field.key}</code>
                  {field.isSet ? <em className={styles.fieldSet}>défini</em> : null}
                </span>
                <input
                  type={field.secret ? "password" : "text"}
                  autoComplete="off"
                  placeholder={
                    field.isSet ? "•••••••• (déjà défini — laisser vide pour conserver)" : field.placeholder ?? ""
                  }
                  onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className={styles.actions}>
            {state.status === "saved" ? <span className={styles.ok}>{state.message}</span> : null}
            {state.status === "error" ? <span className={styles.err}>{state.message}</span> : null}
            <button type="submit" className={dashStyles.primary} disabled={state.status === "saving"}>
              {state.status === "saving" ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
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
            État des intégrations — <strong>{connected}/{integrations.length} connectées</strong>. Remplissez les champs
            d&apos;une intégration non active puis redémarrez le serveur pour l&apos;activer.
          </p>
        </div>
      </header>

      <div className={styles.list}>
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </main>
  );
}
