import { readFileSync } from "node:fs";
import path from "node:path";

export const CUSTOMER_EMAIL_SCENARIOS = [
  "DEMAND_INCOMPLETE",
  "DEMAND_IN_PROGRESS",
  "QUOTE_AVAILABLE",
  "ACCOUNT_CREATION",
  "FOLLOWUP_J2",
  "FOLLOWUP_J7",
] as const;

export type CustomerEmailScenario = (typeof CUSTOMER_EMAIL_SCENARIOS)[number];

export type RenderedEmailTemplate = {
  templateName: string;
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

const templateByScenario: Record<CustomerEmailScenario, string> = {
  DEMAND_INCOMPLETE: "00_demande_incomplete.html",
  DEMAND_IN_PROGRESS: "01_demande_en_cours.html",
  QUOTE_AVAILABLE: "02_devis_disponible.html",
  ACCOUNT_CREATION: "05_creation_compte.html",
  FOLLOWUP_J2: "03_relance_j2.html",
  FOLLOWUP_J7: "04_relance_j7.html",
};

const subjectFallbackByScenario: Record<CustomerEmailScenario, string> = {
  DEMAND_INCOMPLETE: "Informations nécessaires pour finaliser votre demande NeoTravel",
  DEMAND_IN_PROGRESS: "Votre demande NeoTravel est en cours d'étude",
  QUOTE_AVAILABLE: "Votre devis NeoTravel est disponible",
  ACCOUNT_CREATION: "Creation de votre compte client NeoTravel",
  FOLLOWUP_J2: "Relance concernant votre devis NeoTravel",
  FOLLOWUP_J7: "Dernière relance concernant votre devis NeoTravel",
};

export function renderCustomerEmailTemplate(
  scenario: CustomerEmailScenario,
  values: Record<string, string | number | null | undefined>,
): RenderedEmailTemplate {
  const templateName = templateByScenario[scenario];
  const source = loadTemplate(templateName);
  const html = source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) =>
    escapeHtml(String(values[key] ?? "À confirmer")),
  );

  return {
    templateName,
    subject: extractCommentValue(source, "Subject") ?? subjectFallbackByScenario[scenario],
    preheader: extractCommentValue(source, "Preheader") ?? "",
    html,
    text: htmlToText(html),
  };
}

function loadTemplate(templateName: string) {
  const templatePath = path.join(process.cwd(), "src/features/emails/templates", templateName);
  return readFileSync(templatePath, "utf8");
}

function extractCommentValue(source: string, label: string) {
  const match = source.match(new RegExp(`<!--\\s*${label}:\\s*([^<]+?)\\s*-->`, "i"));
  return match?.[1]?.trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
