import { RgpdAuditClient } from "@/features/dashboard/components/RgpdAuditClient";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardRgpdAuditPage() {
 await requirePermission("compliance");
 return <RgpdAuditClient />;
}
