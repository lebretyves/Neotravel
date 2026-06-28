import type { ReactNode } from "react";
import { DashboardContent } from "@/features/dashboard/components/DashboardContent";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import styles from "@/features/dashboard/components/dashboard.module.css";
import { requireStaff } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
 const session = await requireStaff();

 return (
  <div className={styles.shell}>
   <DashboardSidebar
    role={session.role}
    email={session.email}
    name={session.name}
    permissions={session.permissions}
   />
   <DashboardContent>{children}</DashboardContent>
  </div>
 );
}
