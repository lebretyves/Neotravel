import { z } from "zod";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { isAdminAuthorized } from "@/shared/lib/auth/requireAdmin";
import { getLeadById, updateLeadRecord } from "@/shared/lib/data/leadRepository";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";
import type { Lead } from "@/shared/types/lead";

const LeadStatusValues = [
 "NEW",
 "INCOMPLETE",
 "QUALIFIED",
 "HIGH_VALUE",
 "HUMAN_REVIEW",
 "QUOTE_READY",
 "QUOTE_SENT",
 "FOLLOWUP_SCHEDULED",
 "FOLLOWUP_1",
 "FOLLOWUP_2",
 "WON",
 "LOST",
 "CLOSED"
] as const;

const LeadPatchSchema = z
 .object({
  clientType: z.string().trim().min(1).nullable(),
  contactName: z.string().trim().min(1).nullable(),
  organization: z.string().trim().min(1).nullable(),
  email: z.string().trim().nullable(),
  phone: z.string().trim().nullable(),
  departureCity: z.string().trim().nullable(),
  arrivalCity: z.string().trim().nullable(),
  departureDate: z.string().trim().nullable(),
  returnDate: z.string().trim().nullable(),
  passengerCount: z.number().int().positive().nullable(),
  tripType: z.enum(["one_way", "round_trip"]).nullable(),
  hasIntermediateStop: z.boolean(),
  intermediateStops: z.array(z.string().trim().min(1)).max(8),
  options: z.array(z.string().trim()).max(20),
  status: z.enum(LeadStatusValues),
  humanReviewReason: z.string().trim().nullable()
 })
 .partial();

export async function PATCH(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
 try {
  if (!(await isAdminAuthorized())) {
   return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
  }

  const { leadId } = await params;

  const existing = await getLeadById(leadId);
  if (!existing) return jsonError("NOT_FOUND", "Demande introuvable.", 404);

  // Capturer l'ancien statut AVANT la mise à jour : en démo, updateLeadRecord
  // mute l'objet en place (même référence que `existing`).
  const previousStatus = existing.status;

  const patch = LeadPatchSchema.parse(await request.json()) as Partial<Lead>;
  const updated = await updateLeadRecord(leadId, patch);

  // Traçabilité : tout changement de statut (notamment une validation humaine).
  if (patch.status && patch.status !== previousStatus) {
   const validated = patch.status === "QUALIFIED" || patch.status === "HIGH_VALUE";
   await createAuditLog({
    entityType: "lead",
    entityId: leadId,
    action: validated ? auditActions.leadQualified : auditActions.statusChanged,
    actor: "admin",
    input: { from: previousStatus, to: patch.status },
    output: { status: patch.status },
    payload: { from: previousStatus, to: patch.status }
   }).catch(() => undefined);
  }

  return jsonOk({ lead: updated });
 } catch (error) {
  return handleApiError(error);
 }
}
