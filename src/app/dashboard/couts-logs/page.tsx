import { CostsLogsDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardCostsLogsPage() {
 await requirePermission("costs_logs");
 return <CostsLogsDashboardPage />;
}
