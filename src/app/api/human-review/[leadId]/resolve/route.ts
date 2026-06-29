import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/audit-service";
import { isAdminAuthorized } from "@/shared/lib/auth/requireAdmin";

export const runtime = "nodejs";

const ResolveSchema = z.object({
  targetStatus: z.enum(["QUALIFIED", "INCOMPLETE", "LOST"]),
  notes: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> },
): Promise<Response> {
  if (!(await isAdminAuthorized())) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { leadId } = await params;
  const parsed = ResolveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Payload invalide." }, { status: 400 });

  const { targetStatus, notes } = parsed.data;
  const supabase = createServerSupabaseClient();

  const update: Record<string, unknown> = { status: targetStatus };
  if (notes) update.human_review_notes = notes;

  const { error } = await supabase.from("leads").update(update).eq("id", leadId);
  if (error) {
    if (!notes || !isMissingColumnError(error)) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const fallback = await supabase
      .from("leads")
      .update({ status: targetStatus })
      .eq("id", leadId);
    if (fallback.error) return Response.json({ error: fallback.error.message }, { status: 500 });
  }

  await logAuditEvent({
    entityType: "lead",
    entityId: leadId,
    action: "HUMAN_REVIEW_RESOLVED",
    metadata: { targetStatus, notes: notes ?? null },
  });

  return Response.json({ leadId, status: targetStatus });
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}
