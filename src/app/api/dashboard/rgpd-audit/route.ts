import { getRgpdAuditData } from "@/features/dashboard/services/getRgpdAuditData";
import { getStaffSession, sessionHasPermission } from "@/shared/lib/auth/requireAdmin";
import { jsonError } from "@/shared/lib/utils/apiResponse";

export async function GET() {
  const session = await getStaffSession();
  if (!session || !sessionHasPermission(session, "compliance")) {
    return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
  }

  try {
    return Response.json(await getRgpdAuditData());
  } catch (error) {
    console.error("[dashboard/rgpd-audit]", error);
    return jsonError("RGPD_AUDIT_ERROR", "Impossible de charger l'audit RGPD.", 500);
  }
}
