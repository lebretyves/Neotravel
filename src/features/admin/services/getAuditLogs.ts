import { listAuditLogs } from "@/shared/lib/data";
import type { AuditLog } from "@/shared/types/audit-log";

type AuditFilters = {
  entityType?: string;
  action?: string;
  actor?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getAuditLogs(filters: AuditFilters = {}): Promise<AuditLog[]> {
  const logs = await listAuditLogs().catch(() => []);

  return logs
    .filter((log) => {
      if (filters.entityType && log.entityType !== filters.entityType) return false;
      if (filters.actor && log.actor !== filters.actor) return false;
      if (filters.action && !log.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
      if (filters.dateFrom && log.createdAt < `${filters.dateFrom}T00:00:00.000Z`) return false;
      if (filters.dateTo && log.createdAt > `${filters.dateTo}T23:59:59.999Z`) return false;
      return true;
    });
}
