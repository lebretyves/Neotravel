import { GrowthDashboardClient } from "@/features/dashboard/components/GrowthDashboardClient";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardGrowthPage() {
 await requirePermission("growth");
 return <GrowthDashboardClient />;
}
