import { NextResponse } from "next/server";
import { z } from "zod";
import { CLIENT_SESSION_COOKIE, deleteClientAccountRecord } from "@/shared/lib/auth/clientAuth";
import { requireClientForApi } from "@/shared/lib/auth/requireClient";
import { updateClient } from "@/shared/lib/data/clientRepository";
import { handleApiError, jsonError } from "@/shared/lib/utils/apiResponse";

export const runtime = "nodejs";

const DeletionBodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireClientForApi();
    const parsed = DeletionBodySchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return jsonError("VALIDATION_ERROR", "Mot de passe requis.", 400);
    }

    deleteClientAccountRecord(session.email, parsed.data.password);
    await updateClient(session.clientId, { active: false });

    const response = NextResponse.json({
      ok: true,
      message: "Votre demande de suppression a été enregistrée. Votre espace client est fermé.",
      redirectTo: "/connexion",
    });
    response.cookies.delete(CLIENT_SESSION_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("incorrect")) {
      return jsonError("INVALID_PASSWORD", error.message, 401);
    }
    return handleApiError(error);
  }
}
