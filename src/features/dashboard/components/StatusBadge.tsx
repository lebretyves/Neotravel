import { getStatusDisplay } from "@/shared/lib/status/statusDisplay";
import styles from "./dashboard.module.css";

export function StatusBadge({ status }: { status: string }) {
 const { label, tone } = getStatusDisplay(status);

 return (
  <span className={styles.badge} data-tone={tone}>
   {label}
  </span>
 );
}
