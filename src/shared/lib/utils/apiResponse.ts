import { z } from "zod";
import { AppError } from "./errors";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function jsonError(code: string, message: string, status = 400, details?: unknown) {
  return Response.json({ error: { code, message, details } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return jsonError("VALIDATION_ERROR", "Payload invalide.", 400, error.flatten());
  }

  if (error instanceof AppError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "UNAUTHORIZED" || error.code === "INVALID_PASSWORD"
          ? 401
        : error.code === "FORBIDDEN_QUOTE_STATUS" || error.code === "QUOTE_FINALIZED"
          ? 409
          : 400;
    return jsonError(error.code, error.message, status);
  }

  return jsonError("INTERNAL_ERROR", "Erreur serveur controlee.", 500);
}
