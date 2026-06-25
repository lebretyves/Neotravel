import { Suspense } from "react";
import { DemandConversation } from "../../../features/demand/components/DemandConversation";

export default function DemandePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#5e6b7e" }}>Chargement…</div>}>
      <DemandConversation />
    </Suspense>
  );
}
