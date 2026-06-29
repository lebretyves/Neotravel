"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import styles from "./dashboard.module.css";

export function DashboardSearch({ placeholder = "Rechercher un client, un trajet, un statut..." }: { placeholder?: string }) {
 const [query, setQuery] = useState("");

 function openSearchPage() {
  const needle = query.trim();
  if (!needle) return;
  window.location.assign(`/dashboard/recherche?q=${encodeURIComponent(needle)}`);
 }

 return (
  <form
   className={styles.searchBox}
   onSubmit={(event) => {
    event.preventDefault();
    openSearchPage();
   }}
  >
   <Search aria-hidden="true" size={16} />
   <input
    type="search"
    className={styles.searchInput}
    placeholder={placeholder}
    value={query}
    onChange={(event) => setQuery(event.target.value)}
    aria-label="Rechercher dans le tableau"
   />
   {query ? (
    <button type="button" className={styles.searchClear} onClick={() => setQuery("")} aria-label="Effacer la recherche">
     <X aria-hidden="true" size={15} />
    </button>
   ) : null}
  </form>
 );
}
