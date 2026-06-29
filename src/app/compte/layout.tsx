import type { ReactNode } from "react";
import { ClientAccountProvider } from "@/features/client-account/components/ClientAccountContext";
import { ClientAccountSidebar } from "@/features/client-account/components/ClientAccountSidebar";
import { getClientAccountData } from "@/features/client-account/services/getClientAccountData";
import styles from "@/features/dashboard/components/dashboard.module.css";
import { requireClient } from "@/shared/lib/auth/requireClient";

export default async function CompteLayout({ children }: { children: ReactNode }) {
  const session = await requireClient();
  const data = await getClientAccountData(session);

  return (
    <ClientAccountProvider data={data}>
      <div className={styles.shell}>
        <ClientAccountSidebar displayName={data.displayName} email={data.client.email} />
        <div className={styles.routeContent}>{children}</div>
      </div>
    </ClientAccountProvider>
  );
}
