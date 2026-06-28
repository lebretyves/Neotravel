import {
 getGrowthChartData,
 type GrowthChartFilters,
 type GrowthChartType,
 type GrowthGroupBy,
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
const groups = new Set(["day", "week", "month", "source", "status", "client_type"]);
const chartTypes = new Set(["line", "bar", "pie", "funnel"]);

function readFilters(searchParams: URLSearchParams): GrowthChartFilters {
 const period = searchParams.get("period") ?? "30d";
 const metric = searchParams.get("metric") ?? "requests_received";
 const groupBy = searchParams.get("groupBy") ?? "day";
 const chartType = searchParams.get("chartType") ?? "line";

 return {
  period: periods.has(period) ? (period as GrowthPeriodKey) : "30d",
  from: searchParams.get("from") ?? undefined,
  to: searchParams.get("to") ?? undefined,
  source: searchParams.get("source") ?? "all",
  status: searchParams.get("status") ?? "all",
  urgency: searchParams.get("urgency") ?? "all",
  clientType: searchParams.get("clientType") ?? "all",
  metric: metrics.has(metric) ? (metric as GrowthMetricKey) : "requests_received",
  groupBy: groups.has(groupBy) ? (groupBy as GrowthGroupBy) : "day",
  chartType: chartTypes.has(chartType) ? (chartType as GrowthChartType) : "line"
 };
}

export async function GET(request: Request) {
 const session = await getStaffSession();
 if (!session || !sessionHasPermission(session, "growth")) {
  return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
 }

 try {
  const filters = readFilters(new URL(request.url).searchParams);
  return Response.json(await getGrowthChartData(filters));
 } catch (error) {
  console.error("[dashboard/growth/chart]", error);
  return jsonError("GROWTH_CHART_ERROR", "Impossible de charger le graphique de croissance.", 500);
 }
}
