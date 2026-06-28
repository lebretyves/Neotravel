import { AdminOverviewDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardAdminOverviewPage() {
 await requirePermission("admin_view");
 return <AdminOverviewDashboardPage />;
}
