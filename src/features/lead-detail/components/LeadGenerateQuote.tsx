"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import styles from "./lead-detail.module.css";

export function LeadGenerateQuote({ leadId, status }: { leadId: string; status: string }) {
 const router = useRouter();
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const canGenerate = status === "QUALIFIED" || status === "HIGH_VALUE";

 async function generate() {
  setBusy(true);
  setError(null);
  try {
   const response = await fetch("/api/quotes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ leadId })
   });
   const json = await response.json();
   if (!response.ok) {
    setError(json?.error?.message ?? "Génération du devis impossible.");
    setBusy(false);
    return;
   }
   if (json?.id) router.push(`/client/devis/${json.id}`);
   else router.refresh();
  } catch {
   setError("Erreur réseau, réessayez.");
   setBusy(false);
  }
 }

 if (!canGenerate) {
  const message =
   status === "HUMAN_REVIEW"
    ? "Validation commerciale requise avant génération du devis."
    : "Le devis sera générable une fois la demande qualifiée.";

  return <p className={styles.genHint}>{message}</p>;
 }

 return (
  <>
   <button type="button" className={styles.primary} onClick={generate} disabled={busy}>
    {busy ? (
     <>
      <Loader2 className={styles.spin} aria-hidden="true" size={16} /> Génération…
     </>
    ) : (
     <>
      <FileText aria-hidden="true" size={16} /> Générer le devis
     </>
    )}
   </button>
   {error ? <p className={styles.genError}>{error}</p> : null}
  </>
 );
}
