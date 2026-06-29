import { GovernancePanel } from "@/features/governance/components/GovernancePanel";
import { isLocalAuthEnabled, listStaffAccounts } from "@/shared/lib/auth/localAuth";
import { requireAdminRole } from "@/shared/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

export default async function DashboardGovernancePage() {
  const session = await requireAdminRole();
  const localAuth = isLocalAuthEnabled();
  const accounts = localAuth ? listStaffAccounts() : [];

  return <GovernancePanel accounts={accounts} currentEmail={session.email} localAuth={localAuth} />;
}
