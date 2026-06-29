"use client";

import { RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PricingRules } from "@/lib/domain/types";
import type { PricingStorageMode } from "@/lib/pricing/pricing-matrix-store";
import { resetPricingMatrixAction, savePricingMatrixAction } from "@/features/pricing/actions";
import styles from "./dashboard.module.css";

type Feedback = { tone: "ok" | "error"; text: string } | null;

function cloneRules(rules: PricingRules): PricingRules {
  return structuredClone(rules);
}

function rateToPercent(rate: number) {
  return String(Math.round(rate * 1000) / 10);
}

function percentToRate(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed / 100;
}

function storageHint(mode: PricingStorageMode) {
  if (mode === "supabase") return "Persistance : base Supabase (pricing_matrices).";
  if (mode === "file") return "Persistance : fichier local pricing-matrix.json.";
  return "Valeurs par défaut du code — enregistrez pour créer un fichier local.";
}

export function PricingSettingsEditor({
  initialRules,
  storageMode
}: {
  initialRules: PricingRules;
  storageMode: PricingStorageMode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const defaults = useMemo(() => cloneRules(initialRules), [initialRules]);
  const [rules, setRules] = useState<PricingRules>(() => cloneRules(initialRules));
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    setRules(cloneRules(initialRules));
  }, [initialRules]);

  const changed = JSON.stringify(rules) !== JSON.stringify(defaults);

  function updateGridRow(index: number, field: "distanceKm" | "priceEur", value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setRules((prev) => {
      const grid = [...prev.forfaitDistanceGrid];
      grid[index] = { ...grid[index], [field]: parsed };
      return { ...prev, forfaitDistanceGrid: grid };
    });
  }

  function updateSeason(
    key: "low" | "medium" | "high" | "veryHigh",
    coefficientPercent: string
  ) {
    setRules((prev) => ({
      ...prev,
      seasonality: {
        ...prev.seasonality,
        [key]: { ...prev.seasonality[key], coefficient: percentToRate(coefficientPercent) }
      }
    }));
  }

  function updateLeadTime(index: number, coefficientPercent: string) {
    setRules((prev) => {
      const leadTime = [...prev.leadTime];
      leadTime[index] = { ...leadTime[index], coefficient: percentToRate(coefficientPercent) };
      return { ...prev, leadTime };
    });
  }

  function updateCapacity(index: number, coefficientPercent: string) {
    setRules((prev) => {
      const capacity = [...prev.capacity];
      capacity[index] = { ...capacity[index], coefficient: percentToRate(coefficientPercent) };
      return { ...prev, capacity };
    });
  }

  function save() {
    startTransition(async () => {
      const result = await savePricingMatrixAction(rules);
      setFeedback(result.ok ? { tone: "ok", text: result.message ?? "" } : { tone: "error", text: result.error ?? "" });
      if (result.ok) router.refresh();
    });
  }

  function resetAll() {
    startTransition(async () => {
      const result = await resetPricingMatrixAction();
      if (result.ok) {
        setFeedback({ tone: "ok", text: result.message ?? "" });
        router.refresh();
      } else {
        setFeedback({ tone: "error", text: result.error ?? "" });
      }
    });
  }

  function discardLocal() {
    setRules(cloneRules(defaults));
    setFeedback(null);
  }

  const seasonLabels: Record<"low" | "medium" | "high" | "veryHigh", string> = {
    low: "Basse saison",
    medium: "Moyenne saison",
    high: "Haute saison",
    veryHigh: "Très haute saison"
  };

  const leadTimeLabels = ["Prioritaire (≤ 14 j)", "Urgent (15–30 j)", "Normal (31–90 j)", "3 mois et plus"];

  return (
    <section className={styles.pricingEditor} aria-label="Édition des tarifs" data-no-translate>
      {feedback ? (
        <p className={feedback.tone === "ok" ? styles.feedbackOk : styles.feedbackError} role="status">
          {feedback.text}
        </p>
      ) : null}

      <div className={styles.pricingToolbar}>
        <div>
          <strong>{changed ? "Modifications non enregistrées" : "Tarifs à jour"}</strong>
          <span>
            Version {rules.version} — {storageHint(storageMode)} Les devis passent par calculer_devis(), jamais par
            l&apos;IA.
          </span>
        </div>
        <div className={styles.pricingToolbarActions}>
          <button type="button" className={styles.secondary} onClick={discardLocal} disabled={!changed || pending}>
            Annuler
          </button>
          <button type="button" className={styles.secondary} onClick={resetAll} disabled={pending}>
            <RotateCcw size={15} aria-hidden="true" />
            Réinitialiser défauts
          </button>
          <button type="button" className={styles.primary} onClick={save} disabled={!changed || pending}>
            <Save size={15} aria-hidden="true" />
            {pending ? "Enregistrement…" : "Enregistrer les tarifs"}
          </button>
        </div>
      </div>

      <section className={styles.pricingSection}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Grille forfaitaire distance</h2>
            <p>Prix de base selon la distance (aller simple).</p>
          </div>
        </div>
        <div className={styles.pricingTable}>
          <div className={styles.pricingHead}>
            <span>Distance max (km)</span>
            <span>Prix (EUR)</span>
            <span />
            <span />
          </div>
          {rules.forfaitDistanceGrid.map((row, index) => (
            <div className={styles.pricingRow} key={`grid-${row.distanceKm}`}>
              <span className={styles.pricingName}>
                <strong>Palier {index + 1}</strong>
                <small>≤ {row.distanceKm} km</small>
              </span>
              <label className={styles.pricingInputGroup}>
                <input
                  className={styles.pricingInput}
                  type="number"
                  min="0"
                  step="1"
                  value={row.distanceKm}
                  onChange={(e) => updateGridRow(index, "distanceKm", e.target.value)}
                />
                <span>km</span>
              </label>
              <label className={styles.pricingInputGroup}>
                <input
                  className={styles.pricingInput}
                  type="number"
                  min="0"
                  step="1"
                  value={row.priceEur}
                  onChange={(e) => updateGridRow(index, "priceEur", e.target.value)}
                />
                <span>EUR</span>
              </label>
              <span />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.pricingSection}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Longue distance</h2>
            <p>Au-delà du dernier palier de la grille.</p>
          </div>
        </div>
        <div className={styles.pricingTable}>
          <div className={styles.pricingRow}>
            <span className={styles.pricingName}>
              <strong>Tarif kilométrique</strong>
              <small>Par km et par sens</small>
            </span>
            <label className={styles.pricingInputGroup}>
              <input
                className={styles.pricingInput}
                type="number"
                min="0"
                step="0.1"
                value={rules.longDistanceRatePerKmPerLeg}
                onChange={(e) =>
                  setRules((prev) => ({
                    ...prev,
                    longDistanceRatePerKmPerLeg: Number(e.target.value) || 0
                  }))
                }
              />
              <span>EUR / km</span>
            </label>
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className={styles.pricingSection}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Saisonnalité</h2>
            <p>Coefficients appliqués selon le mois de départ.</p>
          </div>
        </div>
        <div className={styles.pricingTable}>
          {(Object.keys(seasonLabels) as Array<keyof typeof seasonLabels>).map((key) => (
            <div className={styles.pricingRow} key={key}>
              <span className={styles.pricingName}>
                <strong>{seasonLabels[key]}</strong>
                <small>Mois : {rules.seasonality[key].months.join(", ")}</small>
              </span>
              <label className={styles.pricingInputGroup}>
                <input
                  className={styles.pricingInput}
                  type="number"
                  step="0.1"
                  value={rateToPercent(rules.seasonality[key].coefficient)}
                  onChange={(e) => updateSeason(key, e.target.value)}
                />
                <span>%</span>
              </label>
              <span />
              <span />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.pricingSection}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Délai de réservation</h2>
            <p>Coefficients selon l&apos;anticipation entre demande et départ.</p>
          </div>
        </div>
        <div className={styles.pricingTable}>
          {rules.leadTime.map((rule, index) => (
            <div className={styles.pricingRow} key={rule.code}>
              <span className={styles.pricingName}>
                <strong>{leadTimeLabels[index] ?? rule.code}</strong>
                <small>{rule.code}</small>
              </span>
              <label className={styles.pricingInputGroup}>
                <input
                  className={styles.pricingInput}
                  type="number"
                  step="0.1"
                  value={rateToPercent(rule.coefficient)}
                  onChange={(e) => updateLeadTime(index, e.target.value)}
                />
                <span>%</span>
              </label>
              <span />
              <span />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.pricingSection}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Capacité véhicule</h2>
            <p>Coefficients selon le nombre de passagers.</p>
          </div>
        </div>
        <div className={styles.pricingTable}>
          {rules.capacity.map((rule, index) => (
            <div className={styles.pricingRow} key={`${rule.vehicleCode}-${index}`}>
              <span className={styles.pricingName}>
                <strong>{rule.vehicleCode}</strong>
                <small>
                  {rule.minPassengersExclusive != null ? `> ${rule.minPassengersExclusive}` : "≤"}{" "}
                  {rule.maxPassengersInclusive} pax
                </small>
              </span>
              <label className={styles.pricingInputGroup}>
                <input
                  className={styles.pricingInput}
                  type="number"
                  step="0.1"
                  value={rateToPercent(rule.coefficient)}
                  onChange={(e) => updateCapacity(index, e.target.value)}
                />
                <span>%</span>
              </label>
              <span />
              <span />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.pricingSection}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Marge &amp; TVA</h2>
            <p>Paramètres finaux appliqués au calcul HT / TTC.</p>
          </div>
        </div>
        <div className={styles.pricingTable}>
          <div className={styles.pricingRow}>
            <span className={styles.pricingName}>
              <strong>Marge commerciale</strong>
            </span>
            <label className={styles.pricingInputGroup}>
              <input
                className={styles.pricingInput}
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={rateToPercent(rules.marginRate)}
                onChange={(e) => setRules((prev) => ({ ...prev, marginRate: percentToRate(e.target.value) }))}
              />
              <span>%</span>
            </label>
            <span />
            <span />
          </div>
          <div className={styles.pricingRow}>
            <span className={styles.pricingName}>
              <strong>TVA transport</strong>
            </span>
            <label className={styles.pricingInputGroup}>
              <input
                className={styles.pricingInput}
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={rateToPercent(rules.vatRate)}
                onChange={(e) => setRules((prev) => ({ ...prev, vatRate: percentToRate(e.target.value) }))}
              />
              <span>%</span>
            </label>
            <span />
            <span />
          </div>
        </div>
      </section>
    </section>
  );
}
