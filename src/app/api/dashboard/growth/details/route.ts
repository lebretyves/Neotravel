import {
 getGrowthDetailsData,
 type GrowthDetailsFilters,
 type GrowthMetricKey,
 type GrowthPeriodKey
} from "@/features/dashboard/services/getGrowthDashboardData";
import { getStaffSession, sessionHasPermission } from "@/shared/lib/auth/requireAdmin";
import { jsonError } from "@/shared/lib/utils/apiResponse";

const periods = new Set(["today", "7d", "30d", "month", "custom"]);
const metrics = new Set([
 "requests_received",
 "qualified_leads",
 "quotes_generated",
 "quotes_sent",
 "quotes_accepted",
 "potential_revenue",
 "won_revenue",
 "followups_planned",
 "followups_sent",
 "followups_overdue",
 "conversion_rate",
 "average_lead_to_quote_minutes"
]);

function readFilters(searchParams: URLSearchParams): GrowthDetailsFilters {
 const period = searchParams.get("period") ?? "30d";
 const metric = searchParams.get("metric") ?? "requests_received";

 return {
  period: periods.has(period) ? (period as GrowthPeriodKey) : "30d",
  from: searchParams.get("from") ?? undefined,
  to: searchParams.get("to") ?? undefined,
  source: searchParams.get("source") ?? "all",
  status: searchParams.get("status") ?? "all",
  urgency: searchParams.get("urgency") ?? "all",
  clientType: searchParams.get("clientType") ?? "all",
  metric: metrics.has(metric) ? (metric as GrowthMetricKey) : "requests_received"
 };
}

export async function GET(request: Request) {
 const session = await getStaffSession();
 if (!session || !sessionHasPermission(session, "growth")) {
  return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
 }

 try {
  const filters = readFilters(new URL(request.url).searchParams);
  return Response.json(await getGrowthDetailsData(filters));
 } catch (error) {
  console.error("[dashboard/growth/details]", error);
  return jsonError("GROWTH_DETAILS_ERROR", "Impossible de charger le detail de croissance.", 500);
 }
}
