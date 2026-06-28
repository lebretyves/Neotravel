import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { AuditLog } from "@/shared/types/audit-log";

type AuditLogRow = {
  id: string;
  entity_type: AuditLog["entityType"];
  entity_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function toAuditLog(row: AuditLogRow): AuditLog {
  const metadata = row.metadata ?? {};

  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actor: typeof metadata.actor === "string" ? (metadata.actor as AuditLog["actor"]) : "system",
    inputHash: typeof metadata.inputHash === "string" ? metadata.inputHash : undefined,
    outputHash: typeof metadata.outputHash === "string" ? metadata.outputHash : undefined,
    payload: metadata,
    createdAt: row.created_at
  };
}

export async function createAuditLogRecord(input: Omit<AuditLog, "id" | "createdAt">) {
  if (shouldUseDemoData()) return demoStore.createAuditLog(input);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      metadata: {
        ...(input.payload ?? {}),
        actor: input.actor,
        inputHash: input.inputHash ?? null,
        outputHash: input.outputHash ?? null
      }
    })
    .select("id, entity_type, entity_id, action, metadata, created_at")
    .single();

  if (error) throw error;
  return toAuditLog(data as AuditLogRow);
}

export async function listAuditLogs() {
  if (shouldUseDemoData()) return demoStore.listAuditLogs();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, entity_type, entity_id, action, metadata, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as AuditLogRow[]).map(toAuditLog);
}
