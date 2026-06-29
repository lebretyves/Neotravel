import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getLeadCommercialAction, leadDisplayName, leadRouteLabel } from "@/features/dashboard/services/leadPipelinePresentation";
import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import styles from "./lead-detail.module.css";

export function LeadHeader({ lead, quote, followup }: { lead: Lead; quote?: Quote; followup?: Followup }) {
 const action = getLeadCommercialAction({ lead, quote, followup });

 return (
  <header className={styles.header}>
   <div>
    <Link className={styles.secondary} href="/dashboard/demandes">
     <ArrowLeft aria-hidden="true" size={15} />
     Retour aux demandes
    </Link>
    <p className={styles.eyebrow}>Parcours commercial</p>
    <h1>{leadDisplayName(lead)}</h1>
    <p>{leadRouteLabel(lead)}</p>
    <div className={styles.headerMeta}>
     <StatusBadge status={lead.status} />
     <span>{quote ? `Devis ${quote.calculation.quoteNumber}` : "Aucun devis existant"}</span>
    </div>
  </div>
  <div className={styles.nextActionCard} data-tone={action.tone}>
    <span>Prochaine action</span>
    <strong>{action.label}</strong>
    <p>{action.detail}</p>
    <Link className={styles.primary} href={action.href}>
     {action.cta}
     <ArrowRight aria-hidden="true" size={15} />
    </Link>
   </div>
  </header>
 );
}
