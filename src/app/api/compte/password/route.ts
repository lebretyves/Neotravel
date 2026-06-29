import { z } from "zod";
import { updateClientPassword } from "@/shared/lib/auth/clientAuth";
import { requireClientForApi } from "@/shared/lib/auth/requireClient";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";

export const runtime = "nodejs";

const PasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const session = await requireClientForApi();
  const parsed = PasswordBodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Mot de passe invalide.", 400, parsed.error.flatten());
  }

  try {
    updateClientPassword(session.email, parsed.data.currentPassword, parsed.data.newPassword);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("incorrect")) {
      return jsonError("INVALID_PASSWORD", error.message, 401);
    }
    return handleApiError(error);
  }
}
