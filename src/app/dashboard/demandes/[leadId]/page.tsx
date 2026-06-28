import { LeadHeader } from "@/features/lead-detail/components/LeadHeader";
import { LeadEditForm } from "@/features/lead-detail/components/LeadEditForm";
import { LeadMessages } from "@/features/lead-detail/components/LeadMessages";
import { LeadQuotePanel } from "@/features/lead-detail/components/LeadQuotePanel";
import { LeadReviewActions } from "@/features/lead-detail/components/LeadReviewActions";
import { LeadProcessFlow } from "@/features/lead-pipeline/components/LeadProcessFlow";
import { LeadActivityTimeline } from "@/features/lead-pipeline/components/LeadActivityTimeline";
import { getLeadDetail } from "@/features/lead-detail/services/getLeadDetail";
import styles from "@/features/lead-detail/components/lead-detail.module.css";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";
import { listFollowups, listQuotes } from "@/shared/lib/data";
import { latestQuoteByLeadId, nextScheduledFollowup } from "@/features/dashboard/services/leadPipelinePresentation";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
 await requirePermission("leads");
 const { leadId } = await params;
 const [lead, quotes, followups] = await Promise.all([getLeadDetail(leadId), listQuotes(), listFollowups()]);

 if (!lead) {
  return (
   <main className={styles.page}>
    <section className={styles.card}>
     <h1>Demande introuvable</h1>
     <p>Aucune demande ne correspond à cet identifiant.</p>
    </section>
   </main>
  );
 }

 const quote = latestQuoteByLeadId(quotes).get(lead.id);
 const followup = nextScheduledFollowup(lead.id, followups);

 return (
  <main className={styles.page}>
   <LeadHeader lead={lead} quote={quote} followup={followup} />
   <LeadProcessFlow lead={lead} />
   <LeadReviewActions lead={lead} />
   <LeadEditForm lead={lead} />
   <div className={styles.grid}>
    <LeadMessages lead={lead} />
    <div className={styles.sideStack}>
     <LeadQuotePanel lead={lead} quote={quote} followup={followup} />
     <LeadActivityTimeline lead={lead} />
    </div>
   </div>
  </main>
 );
}
