import { AdminAiCostsDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardAdminAiCostsPage() {
 await requirePermission("costs_ai");
 return <AdminAiCostsDashboardPage />;
}
