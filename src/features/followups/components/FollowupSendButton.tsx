"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./followup-detail.module.css";

export function FollowupSendButton({ followupId, disabled }: { followupId: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/followups/${followupId}/send`, { method: "POST" });
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        setError(json?.error?.message ?? "Envoi de la relance impossible.");
        return;
      }

      setMessage(json?.skipped ? "Relance déjà traitée." : "Relance envoyée. La timeline a été mise à jour.");
      router.refresh();
    } catch {
      setError("Erreur réseau pendant l’envoi de la relance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.sendBox}>
      <button type="button" className={styles.primaryAction} disabled={disabled || busy} onClick={send}>
        {busy ? "Envoi…" : "Envoyer cette relance"}
      </button>
      {message ? <p className={styles.successMessage}>{message}</p> : null}
      {error ? <p className={styles.errorMessage}>{error}</p> : null}
    </div>
  );
}
