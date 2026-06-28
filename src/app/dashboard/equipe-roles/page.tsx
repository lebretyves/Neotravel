import { GovernancePanel } from "@/features/governance/components/GovernancePanel";
import { isLocalAuthEnabled, listStaffAccounts } from "@/shared/lib/auth/localAuth";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

export default async function DashboardTeamRolesPage() {
 const session = await requirePermission("team");
 const localAuth = isLocalAuthEnabled();
 const accounts = localAuth ? listStaffAccounts() : [];

 return <GovernancePanel accounts={accounts} currentEmail={session.email} localAuth={localAuth} />;
}
