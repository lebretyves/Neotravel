import { z } from "zod";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { getLocalAdminEmail, isLocalAuthEnabled } from "@/shared/lib/auth/localAuth";
import { isAdminRoleAuthorized } from "@/shared/lib/auth/requireAdmin";
import { deleteClient, getClientById, updateClient } from "@/shared/lib/data/clientRepository";
import { isDemoMode } from "@/shared/lib/demo/demoMode";
import { getAdminUser } from "@/shared/lib/supabase/auth-server";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";

const ClientPatchSchema = z
  .object({
    organization: z.string().trim().min(1).nullable(),
    contactName: z.string().trim().min(1).nullable(),
    email: z.string().trim().email(),
    phone: z.string().trim().min(1).nullable(),
    active: z.boolean()
  })
  .partial();

async function getActorEmail(): Promise<string | null> {
  if (isLocalAuthEnabled()) return await getLocalAdminEmail();
  if (!isDemoMode()) {
    const user = await getAdminUser();
    return user?.email ?? null;
  }
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    if (!(await isAdminRoleAuthorized())) {
      return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
    }
    const { clientId } = await params;
    const client = await getClientById(clientId);
    if (!client) return jsonError("NOT_FOUND", "Client introuvable.", 404);
    return jsonOk({ client });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    if (!(await isAdminRoleAuthorized())) {
      await createAuditLog({
        entityType: "client",
        entityId: "update",
        action: auditActions.unauthorizedAccess,
        actor: "system"
      }).catch(() => undefined);
      return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
    }
    const { clientId } = await params;

    const existing = await getClientById(clientId);
    if (!existing) return jsonError("NOT_FOUND", "Client introuvable.", 404);

    const patch = ClientPatchSchema.parse(await request.json());
    const actorEmail = await getActorEmail();
    const updated = await updateClient(clientId, patch);
    if (!updated) return jsonError("NOT_FOUND", "Client introuvable.", 404);

    let action: string = auditActions.clientUpdated;
    if (patch.active === false && existing.active) action = auditActions.clientDeactivated;
    else if (patch.active === true && !existing.active) action = auditActions.clientReactivated;

    await createAuditLog({
      entityType: "client",
      entityId: updated.id,
      action,
      actor: "admin",
      input: { fields: Object.keys(patch) },
      output: { id: updated.id, active: updated.active },
      payload: { actorEmail }
    });

    return jsonOk({ client: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    if (!(await isAdminRoleAuthorized())) {
      await createAuditLog({
        entityType: "client",
        entityId: "delete",
        action: auditActions.unauthorizedAccess,
        actor: "system"
      }).catch(() => undefined);
      return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
    }
    const { clientId } = await params;

    const existing = await getClientById(clientId);
    if (!existing) return jsonError("NOT_FOUND", "Client introuvable.", 404);

    const actorEmail = await getActorEmail();
    await deleteClient(clientId);

    await createAuditLog({
      entityType: "client",
      entityId: existing.id,
      action: auditActions.clientDeleted,
      actor: "admin",
      input: { organization: existing.organization },
      output: { id: existing.id },
      payload: { actorEmail }
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
