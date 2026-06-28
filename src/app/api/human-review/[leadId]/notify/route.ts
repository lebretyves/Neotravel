import { createServerSupabaseClient } from "@/lib/supabase/server";
import { triggerHumanReview } from "@/shared/lib/n8n/triggerHumanReview";
import { isAdminAuthorized } from "@/shared/lib/auth/requireAdmin";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> },
): Promise<Response> {
  if (!(await isAdminAuthorized())) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { leadId } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("leads")
    .select("human_review_reason, departure_city, arrival_city, departure_date, passenger_count, clients(email, organization)")
    .eq("id", leadId)
    .maybeSingle();

  if (error || !data) {
    return Response.json({ error: "Lead introuvable." }, { status: 404 });
  }

  const client = Array.isArray(data.clients) ? data.clients[0] : data.clients;
  const result = await triggerHumanReview({
    leadId,
    reason: data.human_review_reason ?? "UNKNOWN",
    organization: client?.organization ?? null,
    email: client?.email ?? null,
    route: data.departure_city && data.arrival_city
      ? `${data.departure_city} → ${data.arrival_city}`
      : null,
    departureDate: data.departure_date ?? null,
    passengerCount: data.passenger_count ?? null,
  });

  return Response.json({ leadId, ...result });
}
