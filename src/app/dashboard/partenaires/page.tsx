import { PartnersManager } from "@/features/partners/components/PartnersManager";
import styles from "@/features/partners/components/partners.module.css";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function PartnersPage({
 searchParams
}: {
 searchParams: Promise<{ partner?: string }>;
}) {
 await requirePermission("partners");
 const { partner: selectedPartnerId } = await searchParams;

 return (
  <main className={styles.page}>
   <header className={styles.header}>
    <div>
     <h1>Partenaires autocaristes</h1>
     <p>
      Vue commerciale indicative pour rapprocher une demande NeoTravel d&apos;un partenaire pertinent. La validation
      finale reste humaine et auditee.
     </p>
    </div>
    <span className={styles.badge}>Intermediation partenaires</span>
   </header>

   <PartnersManager selectedPartnerId={selectedPartnerId} />
  </main>
 );
}
