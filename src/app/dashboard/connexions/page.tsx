import { IntegrationsPanel } from "@/features/integrations/components/IntegrationsPanel";
import { getIntegrationsStatus } from "@/features/integrations/integrations";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

export default async function ConnexionsPage() {
 await requirePermission("connections");
 const integrations = getIntegrationsStatus();
 return <IntegrationsPanel integrations={integrations} />;
}
