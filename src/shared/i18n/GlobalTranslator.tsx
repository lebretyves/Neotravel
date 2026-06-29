"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  defaultLanguage,
  languageChangeEvent,
  languageStorageKey,
  translations,
  type LanguageCode
} from "./translations";

const textOriginals = new WeakMap<Text, string>();
const attributeNames = ["aria-label", "alt", "placeholder", "title"] as const;

const observerConfig: MutationObserverInit = {
  childList: true,
  subtree: true,
  characterData: true
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getLanguage(): LanguageCode {
  if (typeof window === "undefined") return defaultLanguage;
  const stored = window.localStorage.getItem(languageStorageKey);
  if (stored && ["FR", "EN", "ES", "IT", "PT", "DE", "ZH", "AR"].includes(stored)) return stored as LanguageCode;
  return defaultLanguage;
}

function translateText(value: string, language: LanguageCode) {
  if (language === defaultLanguage) return value;

  const languageDictionary = translations[language as Exclude<LanguageCode, "FR">];
  const dictionary = language === "EN" ? languageDictionary : { ...translations.EN, ...languageDictionary };
  const normalized = normalizeText(value);
  if (!normalized) return value;

  const exact = Object.entries(dictionary).find(([source]) => normalizeText(source) === normalized);
  if (exact?.[1]) {
    const prefix = value.match(/^\s*/)?.[0] ?? "";
    const suffix = value.match(/\s*$/)?.[0] ?? "";
    return `${prefix}${exact[1]}${suffix}`;
  }

  let translated = normalized;
  for (const [source, target] of Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length)) {
    const sourceKey = normalizeText(source);
    if (!sourceKey) continue;
    translated = translated.split(sourceKey).join(target);
  }

  if (translated === normalized) return value;
  const prefix = value.match(/^\s*/)?.[0] ?? "";
  const suffix = value.match(/\s*$/)?.[0] ?? "";
  return `${prefix}${translated}${suffix}`;
}

function shouldSkipNode(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest("script, style, noscript, code, pre, [data-no-translate]"));
}

function textChildNodes(element: HTMLElement) {
  return Array.from(element.childNodes).filter((node): node is Text => node.nodeType === Node.TEXT_NODE);
}

/** Update visible text without replacing child nodes — keeps React's DOM references valid. */
function setElementText(element: HTMLElement, nextValue: string) {
  if (element.children.length > 0) return;

  const nodes = textChildNodes(element);
  if (nodes.length === 0) {
    if (nextValue) element.appendChild(document.createTextNode(nextValue));
    return;
  }

  if (nodes.length === 1) {
    if (nodes[0].nodeValue !== nextValue) nodes[0].nodeValue = nextValue;
    return;
  }

  const joined = nodes.map((node) => node.nodeValue ?? "").join("");
  if (joined === nextValue) return;

  nodes[0].nodeValue = nextValue;
  for (let index = 1; index < nodes.length; index += 1) {
    nodes[index].nodeValue = "";
  }
}

function translateNode(node: Node, language: LanguageCode) {
  if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text;
    if (shouldSkipNode(textNode)) return;

    if (!textOriginals.has(textNode)) textOriginals.set(textNode, textNode.nodeValue ?? "");
    const original = textOriginals.get(textNode) ?? "";
    const nextValue = language === defaultLanguage ? original : translateText(original, language);
    if (textNode.nodeValue !== nextValue) textNode.nodeValue = nextValue;
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as HTMLElement;
  if (element.closest("script, style, noscript, code, pre, [data-no-translate]")) return;

  const translationKey = element.dataset.i18nKey;
  if (translationKey) {
    const nextValue = language === defaultLanguage ? translationKey : translateText(translationKey, language);
    setElementText(element, nextValue);
    return;
  }

  for (const attribute of attributeNames) {
    const value = element.getAttribute(attribute);
    if (!value) continue;

    const originalKey = `data-i18n-original-${attribute}`;
    if (!element.hasAttribute(originalKey)) element.setAttribute(originalKey, value);
    const original = element.getAttribute(originalKey) ?? value;
    element.setAttribute(attribute, language === defaultLanguage ? original : translateText(original, language));
  }

  for (const child of Array.from(element.childNodes)) {
    translateNode(child, language);
  }
}

function applyLanguage(language: LanguageCode) {
  const firstMain = document.querySelector("main");
  if (firstMain && !firstMain.id) firstMain.id = "main";

  document.documentElement.lang = language.toLowerCase();
  document.documentElement.dir = language === "AR" ? "rtl" : "ltr";
  translateNode(document.body, language);
}

export function GlobalTranslator() {
  const pathname = usePathname();

  useEffect(() => {
    let currentLanguage = getLanguage();
    let isApplying = false;
    let rafId = 0;

    const observer = new MutationObserver(() => {
      if (isApplying) return;
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => runApply());
    });

    function runApply() {
      if (isApplying) return;
      isApplying = true;
      observer.disconnect();
      try {
        applyLanguage(currentLanguage);
      } finally {
        isApplying = false;
        observer.observe(document.body, observerConfig);
      }
    }

    runApply();

    function handleLanguageChange(event: Event) {
      const detail = (event as CustomEvent<LanguageCode>).detail;
      currentLanguage = detail || getLanguage();
      runApply();
    }

    observer.observe(document.body, observerConfig);
    window.addEventListener(languageChangeEvent, handleLanguageChange);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener(languageChangeEvent, handleLanguageChange);
    };
  }, [pathname]);

  return null;
}
