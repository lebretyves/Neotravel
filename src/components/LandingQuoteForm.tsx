"use client";

import { useRouter } from "next/navigation";
import styles from "../app/home.module.css";

export function LandingQuoteForm() {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/client/demande");
  }

  return (
    <form className={styles.quoteCard} aria-label="Definissez votre projet" onSubmit={handleSubmit}>
      <div className={styles.quoteHeader}>
        <div>
          <p>Assistant NeoTravel</p>
          <h2>Definissez votre projet</h2>
        </div>
      </div>

      <p className={styles.aiAssistText}>
        Notre agent IA vous guide pas a pas dans votre projet afin de qualifier votre besoin et preparer les bonnes
        informations avant le devis.
      </p>

      <button className={styles.submitButton} type="submit">
        Demarrer votre projet
      </button>
    </form>
  );
}
