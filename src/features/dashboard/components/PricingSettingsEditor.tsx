"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";

type PricingRule = {
 key: string;
 ruleType: string;
 label: string;
 value: unknown;
 unit: string;
 active: boolean;
 version: number;
};

type StoredPricingOverrides = {
 rules?: Record<string, string>;
};

const STORAGE_KEY = "neotravel.dashboard.pricingOverrides.v1";

function ruleId(rule: PricingRule) {
 return `${rule.key}__v${rule.version}`;
}

function displayRuleValue(rule: PricingRule) {
 if (typeof rule.value === "number" && rule.unit === "rate") return String(Math.round(rule.value * 100));
 return typeof rule.value === "number" || typeof rule.value === "string" ? String(rule.value) : JSON.stringify(rule.value);
}

function unitLabel(unit: string) {
 if (unit === "rate") return "%";
 if (unit === "eur") return "EUR";
 if (unit === "eur_per_day") return "EUR / jour";
 if (unit === "eur_per_night") return "EUR / nuit";
 return unit;
}

export function PricingSettingsEditor({
 pricingRules
}: {
 pricingRules: PricingRule[];
}) {
 const defaultRules = useMemo(
  () => Object.fromEntries(pricingRules.map((rule) => [ruleId(rule), displayRuleValue(rule)])),
  [pricingRules]
 );

 const [ruleValues, setRuleValues] = useState(defaultRules);
 const [hydrated, setHydrated] = useState(false);

 useEffect(() => {
  try {
   const raw = window.localStorage.getItem(STORAGE_KEY);
   const stored = raw ? (JSON.parse(raw) as StoredPricingOverrides) : {};
   setRuleValues({ ...defaultRules, ...stored.rules });
  } catch {
   setRuleValues(defaultRules);
  } finally {
   setHydrated(true);
  }
 }, [defaultRules]);

 useEffect(() => {
  if (!hydrated) return;

  const rules = Object.fromEntries(Object.entries(ruleValues).filter(([key, value]) => value !== defaultRules[key]));

  if (Object.keys(rules).length === 0) {
   window.localStorage.removeItem(STORAGE_KEY);
   return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ rules }));
 }, [defaultRules, hydrated, ruleValues]);

 const changedRules = pricingRules.reduce((count, rule) => {
  const id = ruleId(rule);
  const value = ruleValues[id] ?? defaultRules[id];
  return value !== defaultRules[id] ? count + 1 : count;
 }, 0);

 function resetAll() {
  setRuleValues(defaultRules);
 }

 return (
  <section className={styles.pricingEditor} aria-label="Edition des tarifs" data-no-translate>
   <div className={styles.pricingToolbar}>
    <div>
     <strong>{changedRules} tarif{changedRules > 1 ? "s" : ""} modifie{changedRules > 1 ? "s" : ""}</strong>
     <span>Les valeurs par defaut sont celles deja presentes.</span>
    </div>
    <button type="button" className={styles.secondary} onClick={resetAll} disabled={changedRules === 0}>
     <RotateCcw size={15} aria-hidden="true" />
     Tout remettre a zero
    </button>
   </div>

   <section className={styles.pricingSection}>
     <div className={styles.panelHeader}>
      <div>
       <h2>Regles tarifaires</h2>
       <p>{pricingRules.length} valeurs modifiables avec retour a la valeur par defaut.</p>
      </div>
     </div>
     <div className={styles.pricingTable}>
      <div className={styles.pricingHead}>
       <span>Regle</span>
       <span>Tarif</span>
       <span>Defaut</span>
       <span>Etat</span>
      </div>
      {pricingRules.map((rule) => {
       const id = ruleId(rule);
       const value = ruleValues[id] ?? defaultRules[id];
       const changed = value !== defaultRules[id];

       return (
        <div className={styles.pricingRow} key={id} data-changed={changed ? "true" : undefined}>
         <span className={styles.pricingName}>
          <strong>{rule.label}</strong>
          <small>
           {rule.ruleType} - v{rule.version}
          </small>
         </span>
         <label className={styles.pricingInputGroup}>
          <input
           className={styles.pricingInput}
           type="number"
           min="0"
           step={rule.unit === "rate" ? "0.1" : "1"}
           value={value}
           onChange={(event) => {
            const nextValue = event.currentTarget.value;
            setRuleValues((prev) => ({ ...prev, [id]: nextValue }));
           }}
           onInput={(event) => {
            const nextValue = event.currentTarget.value;
            setRuleValues((prev) => ({ ...prev, [id]: nextValue }));
           }}
          />
          <span>{unitLabel(rule.unit)}</span>
         </label>
         <span className={styles.pricingDefault}>
          {defaultRules[id]} {unitLabel(rule.unit)}
         </span>
         <span className={styles.pricingState}>
          <span>{changed ? "Modifie" : "Defaut"}</span>
          <button
           type="button"
           className={styles.pricingResetButton}
           onClick={() => setRuleValues((prev) => ({ ...prev, [id]: defaultRules[id] }))}
           disabled={!changed}
           aria-label={`Remettre ${rule.label} a zero`}
          >
           <RotateCcw size={14} aria-hidden="true" />
          </button>
         </span>
        </div>
       );
      })}
     </div>
   </section>
  </section>
 );
}
