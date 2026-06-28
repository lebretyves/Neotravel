import { PricingDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardPricingPage() {
 await requirePermission("pricing");
 return <PricingDashboardPage />;
}
