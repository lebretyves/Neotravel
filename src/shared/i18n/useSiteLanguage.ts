"use client";

import { useEffect, useState } from "react";
import {
  defaultLanguage,
  languageChangeEvent,
  languageStorageKey,
  type LanguageCode,
} from "./translations";

function readLanguage(): LanguageCode {
  if (typeof window === "undefined") return defaultLanguage;
  const stored = window.localStorage.getItem(languageStorageKey);
  if (stored && ["FR", "EN", "ES", "IT", "PT", "DE", "ZH", "AR"].includes(stored)) {
    return stored as LanguageCode;
  }
  return defaultLanguage;
}

export function useSiteLanguage() {
  const [language, setLanguage] = useState<LanguageCode>(defaultLanguage);

  useEffect(() => {
    setLanguage(readLanguage());

    function handleLanguageChange(event: Event) {
      const detail = (event as CustomEvent<LanguageCode>).detail;
      setLanguage(detail || readLanguage());
    }

    window.addEventListener(languageChangeEvent, handleLanguageChange);
    return () => window.removeEventListener(languageChangeEvent, handleLanguageChange);
  }, []);

  return language;
}
