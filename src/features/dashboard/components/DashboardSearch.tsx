"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import styles from "./dashboard.module.css";

/**
 * Recherche client-side : filtre en direct les lignes de tableau de la page
 * (tout element marque `data-dash-row`) par correspondance de texte.
 */
export function DashboardSearch({ placeholder = "Rechercher un client, un trajet, un statut..." }: { placeholder?: string }) {
 const [query, setQuery] = useState("");

 function applyFilter(value: string) {
  setQuery(value);
  const needle = value.trim().toLowerCase();
  const rows = document.querySelectorAll<HTMLElement>("[data-dash-row]");
  rows.forEach((row) => {
   const text = row.textContent?.toLowerCase() ?? "";
   row.style.display = needle.length > 0 && !text.includes(needle) ? "none" : "";
  });
 }

 return (
  <div className={styles.searchBox}>
   <Search aria-hidden="true" size={16} />
   <input
    type="search"
    className={styles.searchInput}
    placeholder={placeholder}
    value={query}
    onChange={(event) => applyFilter(event.target.value)}
    aria-label="Rechercher dans le tableau"
   />
   {query ? (
    <button type="button" className={styles.searchClear} onClick={() => applyFilter("")} aria-label="Effacer la recherche">
     <X aria-hidden="true" size={15} />
    </button>
   ) : null}
  </div>
 );
}
