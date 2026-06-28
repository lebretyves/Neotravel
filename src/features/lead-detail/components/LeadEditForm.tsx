"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Pencil } from "lucide-react";
import type { Lead } from "@/shared/types/lead";
import { humanReviewReasonText } from "@/features/human-review/reasonLabels";
import { getStatusDisplay } from "@/shared/lib/status/statusDisplay";
import styles from "./leadEdit.module.css";

const STATUS_OPTIONS = [
 "NEW",
 "INCOMPLETE",
 "QUALIFIED",
 "HIGH_VALUE",
 "HUMAN_REVIEW",
 "QUOTE_READY",
 "QUOTE_SENT",
 "FOLLOWUP_SCHEDULED",
 "FOLLOWUP_1",
 "FOLLOWUP_2",
 "WON",
 "LOST",
 "CLOSED"
];

type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string };

export function LeadEditForm({ lead }: { lead: Lead }) {
 const router = useRouter();
 const isReview = lead.status === "HUMAN_REVIEW";

 const [form, setForm] = useState({
  organization: lead.organization ?? "",
  email: lead.email ?? "",
  departureCity: lead.departureCity ?? "",
  arrivalCity: lead.arrivalCity ?? "",
  departureDate: lead.departureDate ?? "",
  returnDate: lead.returnDate ?? "",
  passengerCount: lead.passengerCount != null ? String(lead.passengerCount) : "",
  tripType: lead.tripType ?? "",
  options: lead.options.join(", "),
  status: lead.status as string,
  humanReviewReason: humanReviewReasonText(lead.humanReviewReason)
 });
 const [state, setState] = useState<SaveState>({ status: "idle" });

 function set(key: keyof typeof form, value: string) {
  setForm((prev) => ({ ...prev, [key]: value }));
  setState({ status: "idle" });
 }

 async function handleSubmit(event: FormEvent) {
  event.preventDefault();
  setState({ status: "saving" });

  const patch = {
   organization: form.organization.trim() || null,
   email: form.email.trim() || null,
   departureCity: form.departureCity.trim() || null,
   arrivalCity: form.arrivalCity.trim() || null,
   departureDate: form.departureDate.trim() || null,
   returnDate: form.returnDate.trim() || null,
   passengerCount: form.passengerCount.trim() ? Number(form.passengerCount) : null,
   tripType: form.tripType || null,
   options: form.options
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
   status: form.status,
   humanReviewReason: form.humanReviewReason.trim() || null
  };

  try {
   const response = await fetch(`/api/leads/${lead.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch)
   });
   if (!response.ok) throw new Error();

   setState({ status: "saved", message: "Modifications enregistrées." });
   router.refresh();
  } catch {
   setState({ status: "error", message: "Échec de l'enregistrement, réessayez." });
  }
 }

 return (
  <section className={`${styles.card} ${isReview ? styles.review : ""}`} aria-label="Modifier la demande">
   <div className={styles.head}>
    <div>
     <p className={styles.kicker}>
      <Pencil aria-hidden="true" size={13} /> Édition directe
     </p>
     <h2>Modifier la demande</h2>
    </div>
    {isReview ? (
     <span className={styles.reviewTag}>
      <AlertTriangle aria-hidden="true" size={14} /> Reprise humaine
     </span>
    ) : null}
   </div>

   {isReview ? (
    <p className={styles.reviewNote}>
     Cette demande est en reprise humaine : corrigez les informations manquantes ou erronées, puis changez le
     statut pour la faire avancer.
    </p>
   ) : null}

   <form onSubmit={handleSubmit} className={styles.form}>
    <div className={styles.grid}>
     <label>
      Organisation
      <input value={form.organization} onChange={(event) => set("organization", event.target.value)} />
     </label>
     <label>
      Email
      <input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
     </label>
     <label>
      Ville de départ
      <input value={form.departureCity} onChange={(event) => set("departureCity", event.target.value)} />
     </label>
     <label>
      Ville d&apos;arrivée
      <input value={form.arrivalCity} onChange={(event) => set("arrivalCity", event.target.value)} />
     </label>
     <label>
      Date de départ
      <input type="date" value={form.departureDate} onChange={(event) => set("departureDate", event.target.value)} />
     </label>
     <label>
      Date de retour
      <input type="date" value={form.returnDate} onChange={(event) => set("returnDate", event.target.value)} />
     </label>
     <label>
      Passagers
      <input
       type="number"
       min="1"
       value={form.passengerCount}
       onChange={(event) => set("passengerCount", event.target.value)}
      />
     </label>
     <label>
      Type de trajet
      <select value={form.tripType} onChange={(event) => set("tripType", event.target.value)}>
       <option value="">—</option>
       <option value="one_way">Aller simple</option>
       <option value="round_trip">Aller-retour</option>
      </select>
     </label>
     <label className={styles.full}>
      Options (séparées par des virgules)
      <input
       value={form.options}
       onChange={(event) => set("options", event.target.value)}
       placeholder="peages, guide..."
      />
     </label>
     <label>
      Statut
      <select value={form.status} onChange={(event) => set("status", event.target.value)}>
       {STATUS_OPTIONS.map((value) => (
        <option key={value} value={value}>
         {getStatusDisplay(value).label}
        </option>
       ))}
      </select>
     </label>
     <label className={styles.full}>
      Raison de reprise humaine
      <textarea
       rows={2}
       value={form.humanReviewReason}
       onChange={(event) => set("humanReviewReason", event.target.value)}
       placeholder="Ex. distance à confirmer, demande atypique..."
      />
     </label>
    </div>

    <div className={styles.actions}>
     {state.status === "error" ? <span className={styles.error}>{state.message}</span> : null}
     {state.status === "saved" ? (
      <span className={styles.ok}>
       <Check aria-hidden="true" size={15} /> {state.message}
      </span>
     ) : null}
     <button type="submit" className={styles.save} disabled={state.status === "saving"}>
      {state.status === "saving" ? (
       <>
        <Loader2 aria-hidden="true" size={16} className={styles.spin} /> Enregistrement…
       </>
      ) : (
       "Enregistrer les modifications"
      )}
     </button>
    </div>
   </form>
  </section>
 );
}
