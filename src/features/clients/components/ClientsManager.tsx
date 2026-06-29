"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dashStyles from "@/features/dashboard/components/dashboard.module.css";
import styles from "./clients.module.css";
import type { Client } from "@/shared/types/client";

export type ClientRow = Client & {
  pendingCount: number;
  latestLeadId: string | null;
};

type FormState = {
  organization: string;
  contactName: string;
  email: string;
  phone: string;
  active: boolean;
};

type EditorMode = { kind: "create" } | { kind: "edit"; client: Client } | null;

const emptyForm: FormState = {
  organization: "",
  contactName: "",
  email: "",
  phone: "",
  active: true
};

function toForm(client: Client): FormState {
  return {
    organization: client.organization ?? "",
    contactName: client.contactName ?? "",
    email: client.email,
    phone: client.phone ?? "",
    active: client.active
  };
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ClientsManager({ initialClients }: { initialClients: ClientRow[] }) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [editor, setEditor] = useState<EditorMode>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) => {
      const fields = [client.organization, client.contactName, client.email, client.phone];
      return fields.some((f) => f && f.toLowerCase().includes(q));
    });
  }, [clients, search]);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setEditor({ kind: "create" });
  }

  function openEdit(client: ClientRow) {
    setForm(toForm(client));
    setError(null);
    setEditor({ kind: "edit", client });
  }

  function closeEditor() {
    setEditor(null);
    setError(null);
  }

  function buildPayload(state: FormState) {
    return {
      organization: state.organization.trim() ? state.organization.trim() : null,
      contactName: state.contactName.trim() ? state.contactName.trim() : null,
      email: state.email.trim(),
      phone: state.phone.trim() ? state.phone.trim() : null,
      active: state.active
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!editor) return;

    const payload = buildPayload(form);
    if (!payload.email) {
      setError("L'email est obligatoire.");
      return;
    }

    try {
      if (editor.kind === "create") {
        const response = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json?.error?.message ?? "Creation impossible.");
          return;
        }
        setClients((prev) => [{ ...(json.client as Client), pendingCount: 0, latestLeadId: null }, ...prev]);
      } else {
        const response = await fetch(`/api/clients/${editor.client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json?.error?.message ?? "Mise à jour impossible.");
          return;
        }
        const updated = json.client as Client;
        setClients((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      }
      closeEditor();
      startTransition(() => router.refresh());
    } catch {
      setError("Erreur réseau. Réessayez.");
    }
  }

  async function handleDelete(client: ClientRow) {
    if (!confirm(`Supprimer définitivement le compte client "${client.organization ?? client.email}" ?`)) return;
    try {
      const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        alert(json?.error?.message ?? "Suppression impossible.");
        return;
      }
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      startTransition(() => router.refresh());
    } catch {
      alert("Erreur réseau. Réessayez.");
    }
  }

  async function toggleActive(client: Client) {
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !client.active })
      });
      const json = await response.json();
      if (!response.ok) {
        alert(json?.error?.message ?? "Mise à jour impossible.");
        return;
      }
      const updated = json.client as Client;
      setClients((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      startTransition(() => router.refresh());
    } catch {
      alert("Erreur réseau. Réessayez.");
    }
  }

  return (
    <main className={dashStyles.page}>
      <header className={dashStyles.header}>
        <div>
          <p className={dashStyles.eyebrow}>Administration</p>
          <h1>Comptes clients</h1>
          <p>
            Gestion centralisée des comptes clients NeoTravel : création, mise à jour, désactivation et suppression
            conformes RGPD.
          </p>
        </div>
        <div className={dashStyles.headerActions}>
          <label className={dashStyles.searchBox}>
            <input
              type="search"
              className={dashStyles.searchInput}
              placeholder="Rechercher (organisation, contact, email)"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button type="button" className={dashStyles.searchClear} onClick={() => setSearch("")} aria-label="Effacer la recherche">
                x
              </button>
            )}
          </label>
          <button type="button" className={dashStyles.primary} onClick={openCreate}>
            Nouveau client
          </button>
        </div>
      </header>

      <section className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <span>Organisation</span>
          <span>Contact</span>
          <span>Email</span>
          <span>Téléphone</span>
          <span>Statut</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>Aucun compte client {search ? "ne correspond à la recherche." : "pour le moment."}</div>
        ) : (
          filtered.map((client) => (
            <div key={client.id} className={styles.tableRow}>
              <div>
                <strong>{client.organization ?? "(sans organisation)"}</strong>
                <small>Créé le {formatDate(client.createdAt)}</small>
              </div>
              <div>
                <strong>{client.contactName ?? "-"}</strong>
              </div>
              <div>{client.email}</div>
              <div>{client.phone ?? "-"}</div>
              <div className={styles.statusCell}>
                <span className={`${styles.statusPill} ${client.active ? styles.statusActive : styles.statusInactive}`}>
                  {client.active ? "Actif" : "Inactif"}
                </span>
                {client.pendingCount > 0 && client.latestLeadId ? (
                  <Link className={`${styles.statusPill} ${styles.statusPending}`} href={`/dashboard/demandes/${client.latestLeadId}`}>
                    À traiter{client.pendingCount > 1 ? ` (${client.pendingCount})` : ""}
                  </Link>
                ) : null}
              </div>
              <div className={styles.rowActions}>
                <button type="button" className={styles.iconButton} onClick={() => toggleActive(client)} disabled={isPending}>
                  {client.active ? "Désactiver" : "Activer"}
                </button>
                <button type="button" className={styles.iconButton} onClick={() => openEdit(client)}>
                  Editer
                </button>
                <button type="button" className={`${styles.iconButton} ${styles.iconButtonDanger}`} onClick={() => handleDelete(client)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {editor && (
        <div className={styles.modalBackdrop} onClick={closeEditor} role="dialog" aria-modal="true">
          <form className={styles.modal} onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editor.kind === "create" ? "Nouveau compte client" : "Modifier le compte client"}</h2>
                <p>
                  {editor.kind === "create"
                    ? "Ajoutez un client professionnel à la base NeoTravel."
                    : "Mettez à jour les informations du compte client."}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={closeEditor} aria-label="Fermer">
                x
              </button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.errorBox}>{error}</div>}
              <div className={styles.field}>
                <label htmlFor="client-org">Organisation</label>
                <input
                  id="client-org"
                  value={form.organization}
                  onChange={(event) => setForm((prev) => ({ ...prev, organization: event.target.value }))}
                  placeholder="Alpha Conseil"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="client-contact">Nom du contact</label>
                <input
                  id="client-contact"
                  value={form.contactName}
                  onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))}
                  placeholder="Camille Martin"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="client-email">Email *</label>
                <input
                  id="client-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="contact@exemple.com"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="client-phone">Téléphone</label>
                <input
                  id="client-phone"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
              <label className={styles.checkboxField}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                />
                Compte actif
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={dashStyles.secondary} onClick={closeEditor}>
                Annuler
              </button>
              <button type="submit" className={dashStyles.primary}>
                {editor.kind === "create" ? "Créer le client" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
