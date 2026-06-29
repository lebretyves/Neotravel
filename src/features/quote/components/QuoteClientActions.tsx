"use client";

import { useEffect, useState } from "react";
import {
  defaultLanguage,
  languageChangeEvent,
  languageStorageKey,
  type LanguageCode,
} from "@/shared/i18n/translations";
import styles from "./quote-client.module.css";

type ActionState = "idle" | "loading" | "accepted" | "refused" | "error";

async function postQuoteAction(quoteId: string, action: "accept" | "refuse") {
  const response = await fetch(`/api/quotes/${quoteId}/${action}`, { method: "POST" });
  if (!response.ok) throw new Error("Action impossible pour ce devis.");
  return response.json();
}

export function QuoteClientActions({
  quoteId,
  initialStatus = "QUOTE_READY",
}: {
  quoteId: string;
  initialStatus?: string;
}) {
  const alreadyClosed = initialStatus === "CLOSED";

  const [state, setState] = useState<ActionState>(
    alreadyClosed ? "accepted" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadLanguage, setDownloadLanguage] = useState<LanguageCode>(defaultLanguage);

  useEffect(() => {
    function syncLanguage() {
      const stored = window.localStorage.getItem(languageStorageKey);
      if (stored && ["FR", "EN", "ES", "IT", "PT", "DE", "ZH", "AR"].includes(stored)) {
        setDownloadLanguage(stored as LanguageCode);
        return;
      }
      setDownloadLanguage(defaultLanguage);
    }

    syncLanguage();
    window.addEventListener(languageChangeEvent, syncLanguage);
    return () => window.removeEventListener(languageChangeEvent, syncLanguage);
  }, []);

  async function run(action: "accept" | "refuse") {
    setState("loading");
    setErrorMessage(null);

    try {
      await postQuoteAction(quoteId, action);
      if (action === "accept") {
        setState("accepted");
      } else {
        setState("refused");
      }
    } catch {
      setState("error");
      setErrorMessage("Action non finalisée. Réessayez ou contactez notre équipe.");
    }
  }

  if (state === "accepted") {
    return (
      <div className={styles.actionPanel}>
        <div className={styles.actions}>
          <a className={styles.download} href={`/api/quotes/${quoteId}/pdf?lang=${downloadLanguage}`} data-i18n-key="Télécharger">
            Télécharger PDF
          </a>
        </div>
        <p className={styles.actionMessage}>
          {alreadyClosed && state === "accepted"
            ? "Ce devis a déjà été finalisé."
            : "Devis accepté. Notre équipe vous contactera sous 48h."}
        </p>
      </div>
    );
  }

  if (state === "refused") {
    return (
      <div className={styles.actionPanel}>
        <p className={styles.actionMessage}>Devis refusé. Merci pour votre retour, notre équipe en prend note.</p>
      </div>
    );
  }

  return (
    <div className={styles.actionPanel}>
      <div className={styles.actions}>
        <a className={styles.download} href={`/api/quotes/${quoteId}/pdf?lang=${downloadLanguage}`} data-i18n-key="Télécharger">
          Télécharger
        </a>
        <button
          className={styles.primary}
          type="button"
          disabled={state === "loading"}
          onClick={() => run("accept")}
          data-i18n-key="Accepter"
        >
          {state === "loading" ? "En cours..." : "Accepter"}
        </button>
        <button
          className={styles.danger}
          type="button"
          disabled={state === "loading"}
          onClick={() => run("refuse")}
          data-i18n-key="Refuser"
        >
          Refuser
        </button>
      </div>
      {state === "error" && errorMessage && (
        <p className={styles.errorMessage}>{errorMessage}</p>
      )}
      {state === "idle" && (
        <p className={styles.actionMessage}>
          Vous pouvez télécharger, accepter ou refuser ce devis.
        </p>
      )}
    </div>
  );
}
