import { getGrowthDashboardData, type GrowthFilters, type GrowthPeriodKey } from "@/features/dashboard/services/getGrowthDashboardData";
import { getStaffSession, sessionHasPermission } from "@/shared/lib/auth/requireAdmin";
import { jsonError } from "@/shared/lib/utils/apiResponse";

const periods = new Set(["today", "7d", "30d", "month", "custom"]);

function readFilters(searchParams: URLSearchParams): GrowthFilters {
 const period = searchParams.get("period") ?? "30d";

 return {
  period: periods.has(period) ? (period as GrowthPeriodKey) : "30d",
  from: searchParams.get("from") ?? undefined,
  to: searchParams.get("to") ?? undefined,
  source: searchParams.get("source") ?? "all",
  status: searchParams.get("status") ?? "all",
  urgency: searchParams.get("urgency") ?? "all",
  clientType: searchParams.get("clientType") ?? "all"
 };
}

export async function GET(request: Request) {
 const session = await getStaffSession();
 if (!session || !sessionHasPermission(session, "growth")) {
  return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
 }

 try {
  const filters = readFilters(new URL(request.url).searchParams);
  return Response.json(await getGrowthDashboardData(filters));
 } catch (error) {
  console.error("[dashboard/growth]", error);
  return jsonError("GROWTH_DASHBOARD_ERROR", "Impossible de charger les indicateurs de croissance.", 500);
 }
}
