import { HumanReviewDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function HumanReviewPage() {
 await requirePermission("human_review");
 return <HumanReviewDashboardPage />;
}
