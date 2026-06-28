"use client";

import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PartnerAvailabilityPanel } from "./PartnerAvailabilityPanel";
import { PartnerContextPanel } from "./PartnerContextPanel";
import { PartnerSelectionPanel } from "./PartnerSelectionPanel";
import { partners, partnerStatuses, type Partner, type PartnerStatus } from "./partnerData";
import styles from "./partners.module.css";

type PartnerWithSource = Partner & {
 source: "default" | "custom";
};

type PartnerForm = {
 name: string;
 zones: string;
 capacity: string;
 status: PartnerStatus;
 internalScore: string;
 note: string;
};

const STORAGE_KEY = "neotravel.dashboard.partners.v1";

function statusClass(status: PartnerStatus) {
 if (status === "Option posee") return `${styles.status} ${styles.statusOption}`;
 if (status === "Confirme par commercial") return `${styles.status} ${styles.statusConfirmed}`;
 if (status === "Indisponible") return `${styles.status} ${styles.statusUnavailable}`;
 return styles.status;
}

function slugify(value: string) {
 return value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
}

const defaultForm: PartnerForm = {
 name: "",
 zones: "",
 capacity: "",
 status: "A confirmer",
 internalScore: "70",
 note: ""
};

export function PartnersManager({ selectedPartnerId }: { selectedPartnerId?: string }) {
 const defaultPartners = useMemo<PartnerWithSource[]>(
  () => partners.map((partner) => ({ ...partner, source: "default" })),
  []
 );
 const [customPartners, setCustomPartners] = useState<PartnerWithSource[]>([]);
 const [selectedId, setSelectedId] = useState(selectedPartnerId ?? partners[0]?.id ?? "");
 const [form, setForm] = useState<PartnerForm>(defaultForm);
 const [hydrated, setHydrated] = useState(false);

 useEffect(() => {
  try {
   const raw = window.localStorage.getItem(STORAGE_KEY);
   const stored = raw ? (JSON.parse(raw) as PartnerWithSource[]) : [];
   setCustomPartners(stored.filter((partner) => partner.source === "custom"));
  } catch {
   setCustomPartners([]);
  } finally {
   setHydrated(true);
  }
 }, []);

 useEffect(() => {
  if (!hydrated) return;
  if (customPartners.length === 0) {
   window.localStorage.removeItem(STORAGE_KEY);
   return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customPartners));
 }, [customPartners, hydrated]);

 const allPartners = [...customPartners, ...defaultPartners];
 const selectedPartner = allPartners.find((partner) => partner.id === selectedId) ?? allPartners[0] ?? null;
 const canSubmit = form.name.trim() && form.zones.trim() && form.capacity.trim();

 function updateField(field: keyof PartnerForm, value: string) {
  setForm((current) => ({ ...current, [field]: value }));
 }

 function addPartner(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!canSubmit) return;

  const partner: PartnerWithSource = {
   id: `custom-${slugify(form.name)}-${Date.now()}`,
   name: form.name.trim(),
   zones: form.zones
    .split(",")
    .map((zone) => zone.trim())
    .filter(Boolean),
   capacity: form.capacity.trim(),
   status: form.status,
   internalScore: Math.max(0, Math.min(100, Number(form.internalScore) || 0)),
   note: form.note.trim() || "Partenaire ajoute manuellement depuis le dashboard.",
   agenda: [{ date: new Date().toLocaleDateString("fr-FR"), status: "Partenaire ajoute au reseau" }],
   source: "custom"
  };

  setCustomPartners((current) => [partner, ...current]);
  setSelectedId(partner.id);
  setForm(defaultForm);
 }

 function deletePartner(id: string) {
  setCustomPartners((current) => current.filter((partner) => partner.id !== id));
  if (selectedId === id) {
   setSelectedId(partners[0]?.id ?? "");
  }
 }

 return (
  <div className={styles.manager} data-no-translate>
   <section className={styles.panel} aria-labelledby="partner-create-title">
    <div className={styles.panelHeader}>
     <h2 id="partner-create-title">Ajouter un partenaire autocariste</h2>
     <p>Nouveau partenaire ajoute au reseau commercial local.</p>
    </div>
    <form className={styles.partnerForm} onSubmit={addPartner}>
     <label>
      <span>Nom</span>
      <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Ex : Riviera Autocars" />
     </label>
     <label>
      <span>Zones</span>
      <input
       value={form.zones}
       onChange={(event) => updateField("zones", event.target.value)}
       placeholder="Ex : PACA, Occitanie"
      />
     </label>
     <label>
      <span>Capacite</span>
      <input
       value={form.capacity}
       onChange={(event) => updateField("capacity", event.target.value)}
       placeholder="Ex : 20 a 63 passagers"
      />
     </label>
     <label>
      <span>Statut</span>
      <select value={form.status} onChange={(event) => updateField("status", event.target.value as PartnerStatus)}>
       {partnerStatuses.map((status) => (
        <option key={status} value={status}>
         {status}
        </option>
       ))}
      </select>
     </label>
     <label>
      <span>Score</span>
      <input
       value={form.internalScore}
       type="number"
       min="0"
       max="100"
       onChange={(event) => updateField("internalScore", event.target.value)}
      />
     </label>
     <label className={styles.partnerFormNote}>
      <span>Note</span>
      <textarea
       value={form.note}
       onChange={(event) => updateField("note", event.target.value)}
       placeholder="Contexte, specialite, contraintes, contact..."
      />
     </label>
     <button className={styles.primary} type="submit" disabled={!canSubmit}>
      <Plus size={16} aria-hidden="true" />
      Ajouter
     </button>
    </form>
   </section>

   <div className={styles.grid}>
    <section className={styles.panel} aria-labelledby="partner-list-title">
     <div className={styles.panelHeader}>
      <h2 id="partner-list-title">Partenaires autocaristes</h2>
      <p>
       {allPartners.length} partenaire{allPartners.length > 1 ? "s" : ""}, dont {customPartners.length} ajoute
       {customPartners.length > 1 ? "s" : ""}.
      </p>
     </div>
     <div className={styles.list}>
      {allPartners.map((partner) => (
       <article className={styles.partner} key={partner.id} data-custom={partner.source === "custom" ? "true" : undefined}>
        <div>
         <h3>{partner.name}</h3>
         <div className={styles.meta}>
          <span className={styles.pill}>{partner.zones.join(" / ")}</span>
          <span className={styles.pill}>{partner.capacity}</span>
          <span className={statusClass(partner.status)}>{partner.status}</span>
          <span className={styles.pill}>{partner.source === "custom" ? "Ajoute" : "Defaut"}</span>
         </div>
         <p className={styles.score}>Score interne : {partner.internalScore}/100. {partner.note}</p>
        </div>
        <div className={styles.partnerActions}>
         <button
          type="button"
          aria-current={selectedId === partner.id ? "true" : undefined}
          className={styles.selectLink}
          onClick={() => setSelectedId(partner.id)}
         >
          Selectionner
         </button>
         {partner.source === "custom" ? (
          <button type="button" className={styles.deleteButton} aria-label={`Supprimer ${partner.name}`} onClick={() => deletePartner(partner.id)}>
           <Trash2 size={15} aria-hidden="true" />
          </button>
         ) : null}
        </div>
       </article>
      ))}
     </div>
    </section>

    <aside className={styles.side}>
     <PartnerContextPanel partner={selectedPartner} />
     <PartnerSelectionPanel partner={selectedPartner} />
     <PartnerAvailabilityPanel partner={selectedPartner} />
    </aside>
   </div>
  </div>
 );
}
