import { z } from "zod";
import { createLead } from "@/features/demand/actions/createLead";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { getLocalAdminEmail, isLocalAuthEnabled } from "@/shared/lib/auth/localAuth";
import { isAdminRoleAuthorized } from "@/shared/lib/auth/requireAdmin";
import { createClient, listClients } from "@/shared/lib/data/clientRepository";
import { updateLeadRecord } from "@/shared/lib/data/leadRepository";
import { isDemoMode } from "@/shared/lib/demo/demoMode";
import { getAdminUser } from "@/shared/lib/supabase/auth-server";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";

const ClientCreateSchema = z.object({
  organization: z.string().trim().min(1).nullable(),
  contactName: z.string().trim().min(1).nullable().optional(),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1).nullable().optional(),
  active: z.boolean().optional()
});

async function getActorEmail(): Promise<string | null> {
  if (isLocalAuthEnabled()) return await getLocalAdminEmail();
  if (!isDemoMode()) {
    const user = await getAdminUser();
    return user?.email ?? null;
  }
  return null;
}

export async function GET() {
  try {
    if (!(await isAdminRoleAuthorized())) {
      await createAuditLog({
        entityType: "client",
        entityId: "list",
        action: auditActions.unauthorizedAccess,
        actor: "system"
      }).catch(() => undefined);
      return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
    }
    const clients = await listClients();
    return jsonOk({ clients });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminRoleAuthorized())) {
      await createAuditLog({
        entityType: "client",
        entityId: "create",
        action: auditActions.unauthorizedAccess,
        actor: "system"
      }).catch(() => undefined);
      return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
    }
    const input = ClientCreateSchema.parse(await request.json());
    const actorEmail = await getActorEmail();
    const client = await createClient(input);

    await createAuditLog({
      entityType: "client",
      entityId: client.id,
      action: auditActions.clientCreated,
      actor: "admin",
      input: { organization: input.organization, active: input.active ?? true },
      output: { id: client.id },
      payload: { actorEmail }
    });

    // Crée aussi une demande « à compléter » liée au client (apparaît dans
    // Demandes + Agenda). createLead retrouve ce même client par email (pas de doublon).
    let leadId: string | null = null;
    try {
      const lead = await createLead({ email: input.email, organization: input.organization ?? null });
      await updateLeadRecord(lead.id, { status: "INCOMPLETE" });
      leadId = lead.id;
    } catch {
      // Non bloquant : le client est créé même si la demande échoue.
    }

    return jsonOk({ client, leadId }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
