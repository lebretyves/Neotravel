"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "./connexion.module.css";

export function ClientSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quoteId");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");

    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/client-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, passwordConfirm, quoteId })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; redirectTo?: string; error?: { message?: string } }
        | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "Impossible de créer le compte client.");
        setIsSubmitting(false);
        return;
      }

      router.push(payload?.redirectTo ?? "/compte");
      router.refresh();
    } catch {
      setError("Impossible de créer le compte client.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.loginCard} onSubmit={onSubmit} aria-label="Inscription espace client">
      <div>
        <p className={styles.kicker}>Inscription client</p>
        <h2>S&apos;inscrire</h2>
      </div>

      <label className={styles.field}>
        Nom
        <input name="name" type="text" autoComplete="name" placeholder="Votre nom" required />
      </label>

      <label className={styles.field}>
        Email
        <input name="email" type="email" autoComplete="email" placeholder="client@exemple.fr" required />
      </label>

      <label className={styles.field}>
        Mot de passe
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Créer un mot de passe"
          minLength={8}
          required
        />
      </label>

      <label className={styles.field}>
        Confirmer le mot de passe
        <input
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          placeholder="Confirmer"
          minLength={8}
          required
        />
      </label>

      {error ? <p className={styles.formError}>{error}</p> : null}

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Création en cours..." : "Créer mon compte et voir mon devis"}
      </button>

      <p className={styles.note}>
        Compte client uniquement. Aucun accès au dashboard interne NeoTravel.
      </p>
    </form>
  );
}
