"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/shared/lib/supabase/client";
import styles from "./admin-connexion.module.css";

const localAuth = process.env.NEXT_PUBLIC_LOCAL_AUTH === "true";
const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const demoMode =
  !localAuth && (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !supabaseConfigured);

export function AdminLoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Demo MVP: no backend, go straight to the dashboard.
    if (demoMode) {
      router.push(redirectTo);
      return;
    }

    // Auth locale temporaire (fichier JSON) en attendant Supabase/Docker.
    if (localAuth) {
      setLoading(true);
      const res = await fetch("/api/auth/local-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      setLoading(false);

      if (!res.ok) {
        setError("Identifiants invalides ou accès non autorisé.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);

    if (signInError) {
      setError("Identifiants invalides ou accès non autorisé.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form className={styles.loginCard} onSubmit={handleSubmit} aria-label="Connexion administration">
      <div>
        <p className={styles.kicker}>Connexion administration</p>
        <h2>Accès sécurisé</h2>
      </div>

      {demoMode ? (
        <p className={styles.demoBanner}>
          Mode démo MVP : Supabase n&apos;est pas configuré. La connexion vous amène directement au
          dashboard. Renseignez les variables Supabase pour activer l&apos;authentification réelle.
        </p>
      ) : null}

      <label className={styles.field}>
        Email administrateur
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@neotravel.fr"
          required={!demoMode}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className={styles.field}>
        Mot de passe
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required={!demoMode}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <button className={styles.primaryButton} type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className={styles.spinner} aria-hidden="true" size={18} />
            Connexion…
          </>
        ) : (
          <>
            {demoMode ? "Accéder au dashboard" : "Se connecter"}
            <ArrowRight aria-hidden="true" size={18} />
          </>
        )}
      </button>

      <p className={styles.note}>
        Accès réservé aux administrateurs NeoTravel. L&apos;espace client se trouve sur{" "}
        <a href="/connexion">la page de connexion client</a>.
      </p>
    </form>
  );
}
