import { ArchivedLeadsPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function LeadArchivesRoute() {
 await requirePermission("leads");
 return <ArchivedLeadsPage />;
}
