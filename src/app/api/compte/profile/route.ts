import { z } from "zod";
import { updateClientAccountName } from "@/shared/lib/auth/clientAuth";
import { requireClientForApi } from "@/shared/lib/auth/requireClient";
import { updateClient } from "@/shared/lib/data/clientRepository";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";

export const runtime = "nodejs";

const ProfileBodySchema = z.object({
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  organization: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
});

export async function PATCH(request: Request) {
  const session = await requireClientForApi();
  const parsed = ProfileBodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Profil invalide.", 400, parsed.error.flatten());
  }

  try {
    const contactName = [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(" ").trim() || null;
    const updated = await updateClient(session.clientId, {
      contactName,
      organization: parsed.data.organization ?? null,
      phone: parsed.data.phone ?? null,
    });

    if (!updated) {
      return jsonError("NOT_FOUND", "Compte client introuvable.", 404);
    }

    if (contactName) {
      updateClientAccountName(session.email, contactName);
    }

    return jsonOk({
      ok: true,
      client: updated,
      displayName: contactName || updated.organization || updated.email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
