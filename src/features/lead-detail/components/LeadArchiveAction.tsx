"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
import type { Lead } from "@/shared/types/lead";
import styles from "./leadArchive.module.css";

const ARCHIVED_STATUSES = new Set(["CLOSED", "LOST", "WON"]);

export function LeadArchiveAction({ lead }: { lead: Lead }) {
 const router = useRouter();
 const [reason, setReason] = useState("");
 const [state, setState] = useState<"idle" | "saving" | "error">("idle");

 if (ARCHIVED_STATUSES.has(lead.status)) return null;

 async function handleSubmit(event: FormEvent) {
  event.preventDefault();
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
   setState("error");
   return;
  }

  setState("saving");
  try {
   const response = await fetch(`/api/leads/${lead.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
     status: "CLOSED",
     humanReviewReason: trimmedReason
    })
   });

   if (!response.ok) throw new Error();

   router.push("/dashboard/demandes/archive");
   router.refresh();
  } catch {
   setState("error");
  }
 }

 return (
  <section className={styles.card} aria-label="Archiver la demande">
   <div className={styles.copy}>
    <p className={styles.kicker}>
     <Archive aria-hidden="true" size={14} /> Archivage
    </p>
    <h2>Archiver si non traitable</h2>
    <p>
     Utilisez cette action pour une demande impossible à traiter, hors périmètre, ou sans réponse exploitable après
     relances. La raison sera visible dans les archives.
    </p>
   </div>

   <form className={styles.form} onSubmit={handleSubmit}>
    <label>
     Raison d'archive
     <textarea
      required
      rows={3}
      value={reason}
      onChange={(event) => {
       setReason(event.target.value);
       setState("idle");
      }}
      placeholder="Ex. client injoignable après relances, demande hors périmètre, trajet impossible à qualifier..."
     />
    </label>
    <div className={styles.actions}>
     {state === "error" ? <span className={styles.error}>Raison obligatoire ou action impossible.</span> : null}
     <button className={styles.archiveButton} type="submit" disabled={state === "saving"}>
      {state === "saving" ? <Loader2 className={styles.spin} aria-hidden="true" size={16} /> : <Archive aria-hidden="true" size={16} />}
      Archiver
     </button>
    </div>
   </form>
  </section>
 );
}
