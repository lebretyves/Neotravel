import { z } from "zod";
import { buildClientActivityExport } from "@/features/client-account/services/buildClientActivityExport";
import { buildClientActivityPdf } from "@/features/client-account/services/buildClientActivityPdf";
import { requireClientForApi } from "@/shared/lib/auth/requireClient";
import { handleApiError, jsonError } from "@/shared/lib/utils/apiResponse";

export const runtime = "nodejs";

const ExportBodySchema = z.object({
  includeDemands: z.boolean().optional().default(true),
  includeQuotes: z.boolean().optional().default(true),
  includeMessages: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const parsed = ExportBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Options d'export invalides.", 400);
  }

  try {
    const session = await requireClientForApi();
    const payload = await buildClientActivityExport(session, parsed.data);
    const fileName = `neotravel-export-${session.client.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const body = buildClientActivityPdf(payload);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
