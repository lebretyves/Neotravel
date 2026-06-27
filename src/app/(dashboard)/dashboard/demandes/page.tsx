import { CommercialLeadsPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function LeadsPage({
 searchParams
}: {
 searchParams: Promise<{ status?: string }>;
}) {
 await requirePermission("leads");
 const { status } = await searchParams;
 return <CommercialLeadsPage status={status} />;
}
