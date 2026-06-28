"use client";

import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";

type WorkflowInput = {
 name: string;
 trigger: string;
 action: string;
 status: string;
};

type Workflow = WorkflowInput & {
 id: string;
 source: "default" | "custom";
};

const STORAGE_KEY = "neotravel.dashboard.automationWorkflows.v1";

function workflowId(workflow: WorkflowInput) {
 return `${workflow.name}__${workflow.trigger}__${workflow.action}`.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function AutomationWorkflowsManager({
 workflows,
 statusLabel
}: {
 workflows: Array<[string, string, string]>;
 statusLabel: string;
}) {
 const defaultWorkflows = useMemo<Workflow[]>(
  () =>
   workflows.map(([name, trigger, action]) => ({
    id: workflowId({ name, trigger, action, status: statusLabel }),
    name,
    trigger,
    action,
    status: statusLabel,
    source: "default"
   })),
  [statusLabel, workflows]
 );

 const [customWorkflows, setCustomWorkflows] = useState<Workflow[]>([]);
 const [form, setForm] = useState<WorkflowInput>({
  name: "",
  trigger: "",
  action: "",
  status: statusLabel
 });
 const [hydrated, setHydrated] = useState(false);

 useEffect(() => {
  try {
   const raw = window.localStorage.getItem(STORAGE_KEY);
   const stored = raw ? (JSON.parse(raw) as Workflow[]) : [];
   setCustomWorkflows(stored.filter((workflow) => workflow.source === "custom"));
  } catch {
   setCustomWorkflows([]);
  } finally {
   setHydrated(true);
  }
 }, []);

 useEffect(() => {
  setForm((current) => ({ ...current, status: statusLabel }));
 }, [statusLabel]);

 useEffect(() => {
  if (!hydrated) return;
  if (customWorkflows.length === 0) {
   window.localStorage.removeItem(STORAGE_KEY);
   return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customWorkflows));
 }, [customWorkflows, hydrated]);

 const allWorkflows = [...defaultWorkflows, ...customWorkflows];
 const canSubmit = form.name.trim() && form.trigger.trim() && form.action.trim();

 function updateField(field: keyof WorkflowInput, value: string) {
  setForm((current) => ({ ...current, [field]: value }));
 }

 function addWorkflow(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!canSubmit) return;

  const nextWorkflow: Workflow = {
   id: `${workflowId(form)}_${Date.now()}`,
   name: form.name.trim(),
   trigger: form.trigger.trim(),
   action: form.action.trim(),
   status: form.status,
   source: "custom"
  };

  setCustomWorkflows((current) => [nextWorkflow, ...current]);
  setForm({ name: "", trigger: "", action: "", status: statusLabel });
 }

 function deleteWorkflow(id: string) {
  setCustomWorkflows((current) => current.filter((workflow) => workflow.id !== id));
 }

 return (
  <section className={styles.automationManager} data-no-translate>
   <section className={styles.automationFormPanel}>
    <div className={styles.panelHeader}>
     <div>
      <h2>Ajouter une automatisation</h2>
      <p>Creation locale d'un workflow a raccorder ensuite a n8n.</p>
     </div>
    </div>
    <form className={styles.automationForm} onSubmit={addWorkflow}>
     <label>
      <span>Workflow</span>
      <input
       value={form.name}
       onChange={(event) => updateField("name", event.target.value)}
       placeholder="Ex : Relance devis J+5"
      />
     </label>
     <label>
      <span>Declencheur</span>
      <input
       value={form.trigger}
       onChange={(event) => updateField("trigger", event.target.value)}
       placeholder="Ex : Devis sans reponse"
      />
     </label>
     <label>
      <span>Action</span>
      <input
       value={form.action}
       onChange={(event) => updateField("action", event.target.value)}
       placeholder="Ex : Email + notification interne"
      />
     </label>
     <label>
      <span>Statut</span>
      <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
       <option value={statusLabel}>{statusLabel}</option>
       <option value="Brouillon">Brouillon</option>
       <option value="A connecter">A connecter</option>
       <option value="Actif">Actif</option>
      </select>
     </label>
     <button type="submit" className={styles.primary} disabled={!canSubmit}>
      <Plus size={16} aria-hidden="true" />
      Ajouter
     </button>
    </form>
   </section>

   <section className={styles.automationListPanel}>
    <div className={styles.panelHeader}>
     <div>
      <h2>Workflows</h2>
      <p>{allWorkflows.length} automatisation{allWorkflows.length > 1 ? "s" : ""}</p>
     </div>
    </div>
    <div className={styles.automationTable}>
     <div className={styles.automationHead}>
      <span>Workflow</span>
      <span>Declencheur</span>
      <span>Action</span>
      <span>Statut</span>
      <span />
     </div>
     {allWorkflows.map((workflow) => (
      <div className={styles.automationRow} key={workflow.id} data-custom={workflow.source === "custom" ? "true" : undefined}>
       <span>
        <strong>{workflow.name}</strong>
        <small>{workflow.source === "custom" ? "Ajoute" : "Defaut"}</small>
       </span>
       <span>{workflow.trigger}</span>
       <span>{workflow.action}</span>
       <span className={styles.automationStatus}>{workflow.status}</span>
       <span className={styles.automationActions}>
        {workflow.source === "custom" ? (
         <button type="button" aria-label={`Supprimer ${workflow.name}`} onClick={() => deleteWorkflow(workflow.id)}>
          <Trash2 size={15} aria-hidden="true" />
         </button>
        ) : null}
       </span>
      </div>
     ))}
    </div>
   </section>
  </section>
 );
}
