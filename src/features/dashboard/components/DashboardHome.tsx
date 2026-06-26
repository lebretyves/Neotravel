import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listFollowups, listLeads, listQuotes } from "@/shared/lib/data";
import { DashboardHeader, KpiGrid, Panel } from "./DashboardPageKit";
import { StatusBadge } from "./StatusBadge";
import dashStyles from "./dashboard.module.css";
import styles from "./dashboardHome.module.css";

type NextAction = {
  id: string;
  client: string;
  status: string;
  what: string;
  cta: string;
  href: string;
  priority: number;
};

const STEPS = [
  { n: 1, label: "Inscription", hint: "La demande arrive" },
  { n: 2, label: "Qualification", hint: "Vérifier / valider" },
  { n: 3, label: "Devis", hint: "Calculer et envoyer" },
  { n: 4, label: "Relance", hint: "Suivre jusqu'à la décision" }
];

export async function DashboardHome() {
  const [leads, quotes, followups] = await Promise.all([listLeads(), listQuotes(), listFollowups()]);

  const actions: NextAction[] = [];
  for (const lead of leads) {
    const client = lead.organization ?? lead.email ?? lead.id;
    const href = `/dashboard/demandes/${lead.id}`;
    if (lead.status === "HUMAN_REVIEW") {
      actions.push({ id: lead.id, client, status: lead.status, what: "Trancher la revue humaine", cta: "Valider", href, priority: 0 });
    } else if (lead.status === "NEW") {
      actions.push({ id: lead.id, client, status: lead.status, what: "Qualifier la nouvelle demande", cta: "Ouvrir", href, priority: 1 });
    } else if (lead.status === "INCOMPLETE") {
      actions.push({ id: lead.id, client, status: lead.status, what: "Compléter les informations manquantes", cta: "Compléter", href, priority: 2 });
    } else if (lead.status === "QUALIFIED" || lead.status === "HIGH_VALUE") {
      actions.push({ id: lead.id, client, status: lead.status, what: "Générer le devis", cta: "Générer", href, priority: 3 });
    } else if (lead.status === "QUOTE_READY") {
      actions.push({ id: lead.id, client, status: lead.status, what: "Envoyer le devis", cta: "Envoyer", href, priority: 3 });
    }
  }
  for (const followup of followups) {
    if (followup.status === "SCHEDULED") {
      const lead = leads.find((item) => item.id === followup.leadId);
      actions.push({
        id: `f-${followup.id}`,
        client: lead?.organization ?? followup.leadId,
        status: "FOLLOWUP_SCHEDULED",
        what: "Relance à envoyer",
        cta: "Relancer",
        href: `/dashboard/demandes/${followup.leadId}`,
        priority: 4
      });
    }
  }
  actions.sort((a, b) => a.priority - b.priority);

  const toTreat = leads.filter((lead) => ["NEW", "INCOMPLETE", "HUMAN_REVIEW"].includes(lead.status)).length;

  return (
    <main className={dashStyles.page}>
      <DashboardHeader
        title="Tableau de bord"
        subtitle="Vos prochaines actions, en un coup d'œil. Commencez par « À faire maintenant »."
        actionHref="/demande"
        actionLabel="Nouvelle demande"
      />

      <KpiGrid
        kpis={[
          { label: "Demandes", value: leads.length, tone: "blue" },
          { label: "À traiter", value: toTreat, tone: "red" },
          { label: "Devis envoyés", value: quotes.filter((q) => q.status === "QUOTE_SENT").length, tone: "green" },
          { label: "Relances prévues", value: followups.filter((f) => f.status === "SCHEDULED").length, tone: "gold" }
        ]}
      />

      <Panel title="À faire maintenant" subtitle="La liste priorisée de ce qui vous attend. Cliquez pour traiter.">
        {actions.length === 0 ? (
          <div className={styles.empty}>
            <strong>Tout est à jour 🎉</strong>
            <span>Aucune action en attente. Les nouvelles demandes apparaîtront ici automatiquement.</span>
          </div>
        ) : (
          <ul className={styles.actionList}>
            {actions.map((action) => (
              <li key={action.id} className={styles.actionRow}>
                <span className={styles.actionStatus}>
                  <StatusBadge status={action.status} />
                </span>
                <span className={styles.actionInfo}>
                  <strong>{action.client}</strong>
                  <small>{action.what}</small>
                </span>
                <Link className={styles.actionCta} href={action.href}>
                  {action.cta}
                  <ArrowRight aria-hidden="true" size={15} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <section className={styles.guide} aria-label="Comment ça marche">
        <p className={styles.guideTitle}>Comment ça marche</p>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.n}>
              <span className={styles.stepNum}>{step.n}</span>
              <span>
                <strong>{step.label}</strong>
                <small>{step.hint}</small>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
