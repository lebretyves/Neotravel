import { AutomationsDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardAutomationsPage() {
 await requirePermission("automations");
 return <AutomationsDashboardPage />;
}
