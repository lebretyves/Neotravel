import { QuotesDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardQuotesPage({
 searchParams
}: {
 searchParams: Promise<{ status?: string }>;
}) {
 await requirePermission("quotes");
 const { status } = await searchParams;
 return <QuotesDashboardPage status={status} />;
}
