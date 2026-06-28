import Link from "next/link";
import type { AuditLog } from "@/shared/types/audit-log";
import styles from "./adminAudit.module.css";

const SECRET_KEY_PATTERN = /secret|token|password|api[_-]?key|authorization|cookie/i;

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? "[redacted]" : redactSecrets(entry)
    ])
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function entityHref(log: AuditLog) {
  const originalEntityId = log.payload?.originalEntityId;
  const entityId = typeof originalEntityId === "string" ? originalEntityId : log.entityId;

  if (log.entityType === "lead") return `/dashboard/demandes/${entityId}`;
  if (log.entityType === "quote") return `/client/devis/${entityId}`;
  return null;
}

function shortHash(value?: string) {
  return value ? `${value.slice(0, 10)}...` : "non renseigne";
}

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  return (
    <section className={styles.panel} aria-labelledby="audit-title">
      <div className={styles.panelHeader}>
        <h2 id="audit-title">audit_logs</h2>
        <p>Journal des actions metier. Les payloads affiches masquent les secrets et donnees sensibles.</p>
      </div>
      {logs.length === 0 ? (
        <p className={styles.empty}>Aucun audit log ne correspond aux filtres.</p>
      ) : (
        <div className={styles.auditList}>
          {logs.map((log) => {
            const href = entityHref(log);

            return (
              <article className={styles.auditItem} key={log.id}>
                <div className={styles.auditMain}>
                  <div>
                    <h3>{log.action}</h3>
                    <p>
                      {log.entityType} · {log.actor} · {formatDate(log.createdAt)}
                    </p>
                  </div>
                  {href ? (
                    <Link className={styles.entityLink} href={href}>
                      Ouvrir
                    </Link>
                  ) : null}
                </div>
                <div className={styles.hashGrid}>
                  <span>input_hash</span>
                  <code>{shortHash(log.inputHash)}</code>
                  <span>output_hash</span>
                  <code>{shortHash(log.outputHash)}</code>
                </div>
                <details className={styles.details}>
                  <summary>Details JSON</summary>
                  <pre>{JSON.stringify(redactSecrets(log.payload ?? {}), null, 2)}</pre>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
