"use client";

import { useState } from "react";
import type { DemoScenario } from "@/data/demo-scenarios";
import styles from "./demoScenarioPanel.module.css";

type DemoScenarioPanelProps = {
 scenarios: DemoScenario[];
};

type LoadState = {
 scenarioId: string;
 message: string;
 status: "idle" | "loading" | "success" | "error";
};

export function DemoScenarioPanel({ scenarios }: DemoScenarioPanelProps) {
 const [state, setState] = useState<LoadState>({ scenarioId: "", message: "", status: "idle" });

 async function loadScenario(scenario: DemoScenario) {
  setState({ scenarioId: scenario.id, message: "Chargement...", status: "loading" });

  try {
   const response = await fetch("/api/demo/scenarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: scenario.id })
   });
   const payload = await response.json();
   if (!response.ok) throw new Error(payload?.error?.message ?? "Chargement impossible");

   setState({
    scenarioId: scenario.id,
    message: `${scenario.title} chargé : ${payload.counts.leads} demande(s), ${payload.counts.quotes} devis, ${payload.counts.followups} relance(s).`,
    status: "success"
   });
  } catch (error) {
   setState({
    scenarioId: scenario.id,
    message: error instanceof Error ? error.message : "Chargement impossible",
    status: "error"
   });
  }
 }

 return (
  <section className={styles.panel} aria-labelledby="demo-scenarios-title">
   <div className={styles.header}>
    <div>
     <p className={styles.eyebrow}>DEMO_MODE</p>
     <h2 id="demo-scenarios-title">Scénarios soutenance</h2>
    </div>
    <span className={styles.badge}>Fixtures fictives</span>
   </div>

   <div className={styles.grid}>
    {scenarios.map((scenario) => (
     <article className={styles.card} key={scenario.id}>
      <div>
       <h3>{scenario.title}</h3>
       <p>{scenario.expectedResult}</p>
      </div>
      <button
       type="button"
       onClick={() => loadScenario(scenario)}
       disabled={state.status === "loading" && state.scenarioId === scenario.id}
      >
       {state.status === "loading" && state.scenarioId === scenario.id ? "Chargement" : "Charger"}
      </button>
     </article>
    ))}
   </div>

   {state.message ? <p className={state.status === "error" ? styles.error : styles.feedback}>{state.message}</p> : null}
  </section>
 );
}
