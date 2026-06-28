import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getAuditLogs } from "@/features/admin/services/getAuditLogs";
import { rgpdDataInventory, rgpdProcessors, rgpdRetention, type RgpdSecurityCheck } from "@/server/rgpd/rgpdConfig";
import type { AuditLog } from "@/shared/types/audit-log";

export type RgpdAuditData = {
  kpis: {
    auditEvents: number;
    sensitiveActions: number;
    personalDataCategories: number;
    processors: number;
    integrityStampedEvents: number;
    exposedSecrets: number;
  };
  dataInventory: typeof rgpdDataInventory;
  retention: typeof rgpdRetention;
  processors: typeof rgpdProcessors;
  auditTrail: Array<{
    id: string;
    date: string;
    actor: string;
    action: string;
    object: string;
    status: string;
    fingerprint: string;
    source: string;
  }>;
  securityChecks: RgpdSecurityCheck[];
  notes: string[];
};

const sensitiveActionHints = [
  "lead.created",
  "lead.qualified",
  "quote.generated",
  "quote.sent",
  "followup.scheduled",
  "followup.sent",
  "status_changed",
  "human_review",
  "accepted",
  "refused",
  "pdf"
];

const secretPatterns = [/api[_-]?key/i, /secret/i, /token/i, /password/i, /bearer/i, /webhook[_-]?secret/i];

function isSensitiveAction(action: string) {
  const normalized = action.toLowerCase();
  return sensitiveActionHints.some((hint) => normalized.includes(hint));
}

function maskEmail(value: string) {
  return value.replace(/\b([A-Z0-9._%+-])([A-Z0-9._%+-]*)(@[^@\s]+\.[A-Z]{2,})\b/gi, (_match, first: string, _middle: string, domain: string) => `${first}***${domain}`);
}

function sanitizeText(value: string) {
  return maskEmail(value).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email masque]");
}

function logObject(log: AuditLog) {
  return sanitizeText(`${log.entityType}:${log.entityId}`);
}

function hasSensitivePayload(log: AuditLog) {
  if (!log.payload) return false;
  const serialized = JSON.stringify(log.payload);
  return secretPatterns.some((pattern) => pattern.test(serialized));
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".git"].includes(entry.name)) return [];
        return walkFiles(fullPath);
      }
      return [fullPath];
    })
  );
  return files.flat();
}

async function scanClientSource(patterns: RegExp[]) {
  const roots = ["src/app", "src/features"].map((item) => path.join(process.cwd(), item));
  const files = (await Promise.all(roots.map(walkFiles))).flat().filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));
  const clientFiles = files.filter((file) => !file.includes(`${path.sep}api${path.sep}`) && !file.includes(`${path.sep}services${path.sep}`));
  const matches: string[] = [];

  await Promise.all(
    clientFiles.map(async (file) => {
      const content = await readFile(file, "utf8").catch(() => "");
      if (patterns.some((pattern) => pattern.test(content))) matches.push(file);
    })
  );

  return matches;
}

function statusCheck(ok: boolean, control: string, severity: RgpdSecurityCheck["severity"], recommendation: string): RgpdSecurityCheck {
  return {
    control,
    status: ok ? "OK" : "Alerte",
    severity: ok ? "Faible" : severity,
    recommendation
  };
}

export async function getRgpdAuditData(): Promise<RgpdAuditData> {
  const logs = await getAuditLogs();
  const sensitiveLogs = logs.filter((log) => isSensitiveAction(log.action));
  const integrityStampedEvents = logs.filter((log) => Boolean(log.inputHash || log.outputHash)).length;
  const sensitivePayloadCount = logs.filter(hasSensitivePayload).length;
  const [brevoClientCalls, n8nClientCalls] = await Promise.all([
    scanClientSource([/fetch\([^)]*brevo/i, /api\.brevo\.com/i, /sendinblue/i]),
    scanClientSource([/fetch\([^)]*n8n/i, /n8nClient/i])
  ]);

  const exposedSecrets = sensitivePayloadCount + brevoClientCalls.length + n8nClientCalls.length;
  const securityChecks: RgpdSecurityCheck[] = [
    statusCheck(exposedSecrets === 0, "Secrets affiches dans l'interface", "Critique", "Ne jamais exposer d'identifiant technique cote client."),
    statusCheck(brevoClientCalls.length === 0, "Cle Brevo cote client", "Critique", "Conserver la cle Brevo uniquement cote serveur."),
    statusCheck(n8nClientCalls.length === 0, "URL webhook n8n cote client", "Critique", "Appeler n8n uniquement via les routes serveur NeoTravel."),
    statusCheck(brevoClientCalls.length === 0, "Appels Brevo depuis le frontend", "Eleve", "Router les envois email via une action serveur ou API interne."),
    statusCheck(n8nClientCalls.length === 0, "Appels n8n depuis le frontend", "Eleve", "Garder les webhooks n8n derriere une validation serveur."),
    { control: "PDF devis protege", status: "A verifier", severity: "Moyen", recommendation: "Confirmer le niveau d'acces et la duree de disponibilite des PDF." },
    { control: "Donnees sensibles dans localStorage", status: "A verifier", severity: "Moyen", recommendation: "Limiter localStorage aux preferences non sensibles." },
    statusCheck(sensitivePayloadCount === 0, "Logs sans payload sensible", "Eleve", "Ne journaliser que les metadonnees utiles, jamais les payloads complets."),
    { control: "Dashboard protege", status: "OK", severity: "Faible", recommendation: "La page est protegee par permission compliance et session staff." }
  ];

  return {
    kpis: {
      auditEvents: logs.length,
      sensitiveActions: sensitiveLogs.length,
      personalDataCategories: rgpdDataInventory.length,
      processors: rgpdProcessors.length,
      integrityStampedEvents,
      exposedSecrets
    },
    dataInventory: rgpdDataInventory,
    retention: rgpdRetention,
    processors: rgpdProcessors,
    auditTrail: sensitiveLogs.slice(0, 12).map((log) => ({
      id: log.id,
      date: log.createdAt,
      actor: log.actor,
      action: sanitizeText(log.action),
      object: logObject(log),
      status: "Trace",
      fingerprint: log.inputHash || log.outputHash ? "Oui" : "Non",
      source: log.entityType
    })),
    securityChecks,
    notes: [
      "n8n ne doit jamais etre appele directement depuis le frontend.",
      "Brevo ne doit jamais etre appele directement depuis le frontend.",
      "Les cles API doivent rester cote serveur.",
      "Les donnees envoyees aux services externes doivent etre minimisees."
    ]
  };
}
