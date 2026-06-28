"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import styles from "./dashboard.module.css";

/**
 * Rejoue une animation d'entrée à chaque changement de route du dashboard
 * (le `key` force le remount du conteneur), pour des transitions fluides.
 */
export function DashboardContent({ children }: { children: ReactNode }) {
 const pathname = usePathname();

 return (
  <div key={pathname} className={styles.routeContent}>
   {children}
  </div>
 );
}
