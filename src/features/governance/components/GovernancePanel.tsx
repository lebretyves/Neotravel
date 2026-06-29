"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, ShieldCheck, SlidersHorizontal, Trash2, UserPlus, Users } from "lucide-react";
import dashStyles from "@/features/dashboard/components/dashboard.module.css";
import type { StaffAccount } from "@/shared/lib/auth/localAuth";
import { PERMISSIONS, PERMISSION_SECTIONS, type PermissionKey } from "@/shared/lib/auth/permissions";
import {
  createStaffAccountAction,
  deleteStaffAccountAction,
  resetStaffPasswordAction,
  updateStaffPermissionsAction,
  updateStaffRoleAction
} from "../actions";
import styles from "./governance.module.css";

type Feedback = { tone: "ok" | "error"; text: string } | null;

function MemberRow({
  account,
  isSelf,
  onFeedback
}: {
  account: StaffAccount;
  isSelf: boolean;
  onFeedback: (f: Feedback) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [perms, setPerms] = useState<PermissionKey[]>(account.permissions);

  const isAdmin = account.role === "admin";

  function changeRole(role: string) {
    startTransition(async () => {
      const result = await updateStaffRoleAction(account.email, role);
      onFeedback(result.ok ? { tone: "ok", text: result.message ?? "" } : { tone: "error", text: result.error ?? "" });
      if (result.ok) router.refresh();
    });
  }

  function togglePerm(key: PermissionKey, enabled: boolean) {
    const next = enabled ? [...perms, key] : perms.filter((p) => p !== key);
    setPerms(next);
    startTransition(async () => {
      const result = await updateStaffPermissionsAction(account.email, next);
      if (!result.ok) {
        setPerms(perms); // rollback
        onFeedback({ tone: "error", text: result.error ?? "" });
      } else {
        onFeedback({ tone: "ok", text: result.message ?? "" });
        router.refresh();
      }
    });
  }

  function remove() {
    if (!confirm(`Supprimer définitivement le compte ${account.email} ?`)) return;
    startTransition(async () => {
      const result = await deleteStaffAccountAction(account.email);
      onFeedback(result.ok ? { tone: "ok", text: result.message ?? "" } : { tone: "error", text: result.error ?? "" });
      if (result.ok) router.refresh();
    });
  }

  function resetPassword() {
    startTransition(async () => {
      const result = await resetStaffPasswordAction(account.email, newPassword);
      onFeedback(result.ok ? { tone: "ok", text: result.message ?? "" } : { tone: "error", text: result.error ?? "" });
      if (result.ok) {
        setResetting(false);
        setNewPassword("");
      }
    });
  }

  return (
    <div className={styles.memberRow}>
      <div className={styles.memberInfo}>
        <span className={styles.avatar} aria-hidden="true">
          {(account.name ?? account.email).slice(0, 1).toUpperCase()}
        </span>
        <div>
          <strong>
            {account.name ?? account.email.split("@")[0]}
            {isSelf ? <em className={styles.youTag}>vous</em> : null}
          </strong>
          <small>{account.email}</small>
        </div>
      </div>

      <label className={styles.roleSelectWrap}>
        <span className={styles.srHide}>Rôle de {account.email}</span>
        <select
          className={styles.roleSelect}
          value={account.role}
          disabled={pending}
          onChange={(event) => changeRole(event.target.value)}
        >
          <option value="admin">Administrateur</option>
          <option value="commercial">Commercial</option>
        </select>
      </label>

      <div className={styles.memberActions}>
        {!isAdmin ? (
          <button
            type="button"
            className={`${styles.iconBtn} ${showPerms ? styles.iconBtnActive : ""}`}
            disabled={pending}
            onClick={() => setShowPerms((v) => !v)}
          >
            <SlidersHorizontal aria-hidden="true" size={15} /> Accès ({perms.length})
          </button>
        ) : (
          <span className={styles.allRights}>
            <ShieldCheck aria-hidden="true" size={14} /> Tous les droits
          </span>
        )}
        <button type="button" className={styles.iconBtn} disabled={pending} onClick={() => setResetting((v) => !v)}>
          <KeyRound aria-hidden="true" size={15} /> Mot de passe
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
          disabled={pending || isSelf}
          title={isSelf ? "Vous ne pouvez pas supprimer votre propre compte" : "Supprimer le compte"}
          onClick={remove}
        >
          <Trash2 aria-hidden="true" size={15} /> Supprimer
        </button>
      </div>

      {resetting ? (
        <div className={styles.resetRow}>
          <input
            type="password"
            className={styles.input}
            placeholder="Nouveau mot de passe (8 caractères min.)"
            value={newPassword}
            autoComplete="new-password"
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <button type="button" className={dashStyles.secondary} disabled={pending} onClick={resetPassword}>
            Enregistrer
          </button>
        </div>
      ) : null}

      {showPerms && !isAdmin ? (
        <div className={styles.permPanel}>
          <p className={styles.permHint}>
            Activez les sections auxquelles ce commercial peut accéder. Les changements sont immédiats.
          </p>
          {PERMISSION_SECTIONS.map((section) => (
            <div key={section} className={styles.permSection}>
              <p className={styles.permSectionTitle}>{section}</p>
              <div className={styles.permGrid}>
                {PERMISSIONS.filter((permission) => permission.section === section).map((permission) => {
                  const on = perms.includes(permission.key);
                  return (
                    <label key={permission.key} className={styles.switchRow}>
                      <input
                        type="checkbox"
                        className={styles.switchInput}
                        checked={on}
                        disabled={pending}
                        onChange={(event) => togglePerm(permission.key, event.target.checked)}
                      />
                      <span className={styles.switchTrack} aria-hidden="true">
                        <span className={styles.switchThumb} />
                      </span>
                      <span className={styles.switchLabel}>{permission.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AddAccountForm({ onFeedback }: { onFeedback: (f: Feedback) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "commercial" });

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createStaffAccountAction(form);
      if (result.ok) {
        onFeedback({ tone: "ok", text: result.message ?? "Compte créé." });
        setForm({ name: "", email: "", password: "", role: "commercial" });
        router.refresh();
      } else {
        onFeedback({ tone: "error", text: result.error ?? "Création impossible." });
      }
    });
  }

  return (
    <form className={styles.addForm} onSubmit={submit}>
      <div className={styles.addGrid}>
        <label className={styles.field}>
          <span>Nom</span>
          <input
            className={styles.input}
            placeholder="Ex. Marie Dupont"
            value={form.name}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
          />
        </label>
        <label className={styles.field}>
          <span>Email *</span>
          <input
            className={styles.input}
            type="email"
            required
            placeholder="prenom@neotravel.fr"
            value={form.email}
            onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
          />
        </label>
        <label className={styles.field}>
          <span>Mot de passe *</span>
          <input
            className={styles.input}
            type="password"
            required
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            value={form.password}
            onChange={(event) => setForm((f) => ({ ...f, password: event.target.value }))}
          />
        </label>
        <label className={styles.field}>
          <span>Rôle *</span>
          <select
            className={styles.roleSelect}
            value={form.role}
            onChange={(event) => setForm((f) => ({ ...f, role: event.target.value }))}
          >
            <option value="commercial">Commercial</option>
            <option value="admin">Administrateur</option>
          </select>
        </label>
      </div>
      <div className={styles.addActions}>
        <span className={styles.addNote}>
          Un commercial démarre avec les accès de traitement (demandes, devis, relances…), ajustables ensuite par
          interrupteur.
        </span>
        <button type="submit" className={dashStyles.primary} disabled={pending}>
          <UserPlus aria-hidden="true" size={16} /> {pending ? "Création…" : "Créer le compte"}
        </button>
      </div>
    </form>
  );
}

export function GovernancePanel({
  accounts,
  currentEmail,
  localAuth
}: {
  accounts: StaffAccount[];
  currentEmail: string | null;
  localAuth: boolean;
}) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const admins = accounts.filter((a) => a.role === "admin").length;
  const commercials = accounts.length - admins;

  return (
    <main className={dashStyles.page}>
      <header className={dashStyles.header}>
        <div>
          <p className={dashStyles.eyebrow}>Gouvernance</p>
          <h1>Gouvernance — équipe &amp; accès</h1>
          <p>
            Deux rôles : <strong>Administrateur</strong> (accès complet) et <strong>Commercial</strong> (onglets
            commerciaux uniquement). Changez les rôles et activez les permissions par interrupteur.
          </p>
        </div>
      </header>

      {!localAuth ? (
        <div className={styles.warn}>
          La gestion des comptes est disponible en authentification locale. En production (Supabase), gérez les
          utilisateurs depuis la console Supabase.
        </div>
      ) : null}

      {feedback ? (
        <div className={feedback.tone === "ok" ? styles.flashOk : styles.flashErr} role="status">
          {feedback.tone === "ok" ? <CheckCircle2 size={16} aria-hidden="true" /> : null}
          {feedback.text}
        </div>
      ) : null}

      <section className={dashStyles.kpiGrid} aria-label="Indicateurs équipe">
        <article className={dashStyles.kpi}>
          <strong>{accounts.length}</strong>
          <span>Comptes</span>
        </article>
        <article className={dashStyles.kpi}>
          <strong style={{ color: "#123885" }}>{admins}</strong>
          <span>Administrateurs</span>
        </article>
        <article className={dashStyles.kpi}>
          <strong style={{ color: "#dba23e" }}>{commercials}</strong>
          <span>Commerciaux</span>
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>
            <UserPlus aria-hidden="true" size={18} /> Ajouter un compte
          </h2>
          <p>Créez un accès pour un nouveau membre et choisissez son rôle.</p>
        </div>
        <AddAccountForm onFeedback={setFeedback} />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>
            <Users aria-hidden="true" size={18} /> Membres de l&apos;équipe
          </h2>
          <p>Changez un rôle, réglez les accès par interrupteur ou réinitialisez un mot de passe.</p>
        </div>
        {accounts.length === 0 ? (
          <p className={styles.empty}>Aucun compte pour l&apos;instant.</p>
        ) : (
          <div className={styles.members}>
            {accounts.map((account) => (
              <MemberRow
                key={account.email}
                account={account}
                isSelf={currentEmail?.toLowerCase() === account.email.toLowerCase()}
                onFeedback={setFeedback}
              />
            ))}
          </div>
        )}
      </section>

      <section className={styles.roleGuide}>
        <div className={styles.roleCard}>
          <span className={`${styles.roleBadge} ${styles.roleAdmin}`}>
            <ShieldCheck aria-hidden="true" size={14} /> Administrateur
          </span>
          <p>Accès complet à tout le tableau de bord, y compris la gestion des comptes. Non restreignable.</p>
        </div>
        <div className={styles.roleCard}>
          <span className={`${styles.roleBadge} ${styles.roleCommercial}`}>
            <Users aria-hidden="true" size={14} /> Commercial
          </span>
          <p>
            Accès limité aux sections que vous activez par interrupteur (demandes, devis, relances, agenda… et plus si
            besoin).
          </p>
        </div>
      </section>
    </main>
  );
}
