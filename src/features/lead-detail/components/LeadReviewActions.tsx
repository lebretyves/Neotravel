"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import type { Lead } from "@/shared/types/lead";
import { humanReviewReasonLabel } from "@/features/human-review/reasonLabels";
import styles from "./leadReview.module.css";

export function LeadReviewActions({ lead }: { lead: Lead }) {
 const router = useRouter();
 const [busy, setBusy] = useState<null | "validate" | "reject">(null);
 const [error, setError] = useState<string | null>(null);

 // Décision humaine pertinente seulement quand la demande est en revue.
 if (lead.status !== "HUMAN_REVIEW") return null;

 async function decide(kind: "validate" | "reject") {
  setBusy(kind);
  setError(null);

  const patch =
   kind === "validate"
    ? { status: "QUALIFIED", humanReviewReason: null }
    : { status: "LOST" };

  try {
   const response = await fetch(`/api/leads/${lead.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch)
   });
   if (!response.ok) throw new Error();
   router.refresh();
  } catch {
   setError("Action impossible, réessayez.");
   setBusy(null);
  }
 }

 return (
  <section id="human-review-actions" className={styles.card} aria-label="Décision humaine">
   <div className={styles.copy}>
    <p className={styles.kicker}>Revue humaine</p>
    <h2>Votre décision sur cette demande</h2>
    <p className={styles.reason}>{humanReviewReasonLabel(lead.humanReviewReason)}</p>
   </div>

   <div className={styles.actions}>
    {error ? <span className={styles.error}>{error}</span> : null}
    <button className={styles.reject} type="button" onClick={() => decide("reject")} disabled={busy !== null}>
     {busy === "reject" ? <Loader2 className={styles.spin} aria-hidden="true" size={16} /> : <X aria-hidden="true" size={16} />}
     Refuser
    </button>
    <button className={styles.validate} type="button" onClick={() => decide("validate")} disabled={busy !== null}>
     {busy === "validate" ? <Loader2 className={styles.spin} aria-hidden="true" size={16} /> : <Check aria-hidden="true" size={16} />}
     Valider la demande
    </button>
   </div>

   <div className={styles.emailPreview} aria-label="Email client à brancher">
    <strong>Email client — placeholder dev</strong>
    <p>
     Destinataire : {lead.email ?? "email à renseigner"}. Après validation, l&apos;email de reprise confirmera la
     prise en charge commerciale. Après refus, il indiquera qu&apos;un conseiller ne peut pas traiter la demande en
     l&apos;état. L&apos;envoi réel sera branché sur le workflow email/n8n.
    </p>
   </div>
  </section>
 );
}
