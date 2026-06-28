import { FollowupsDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function FollowupsPage({
 searchParams
}: {
 searchParams: Promise<{ status?: string }>;
}) {
 await requirePermission("followups");
 const { status } = await searchParams;
 return <FollowupsDashboardPage status={status} />;
}
