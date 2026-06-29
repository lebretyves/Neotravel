import { PricingRulesEditor } from "@/features/admin/components/PricingRulesEditor";
import { RoutePricingTable } from "@/features/admin/components/RoutePricingTable";
import styles from "@/features/admin/components/adminPricing.module.css";
import { getPricingAdminData } from "@/features/admin/services/getPricingRules";

export default async function PricingPage() {
  const { pricingRules, routePricing, pricingVersion } = await getPricingAdminData();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Admin pricing</h1>
          <p>
            Consultation des matrices tarifaires. Le montant client reste calculé uniquement par calculer_devis(), jamais
            par cette interface.
          </p>
        </div>
        <span className={styles.badge}>Matrice {pricingVersion}</span>
      </header>

      <p className={styles.notice}>
        Consultation des matrices. Pour modifier les tarifs en temps réel, utilisez le tableau de bord :{" "}
        <a href="/dashboard/pricing">Tarification</a>.
      </p>

      <div className={styles.grid}>
        <PricingRulesEditor rules={pricingRules} />
        <RoutePricingTable routes={routePricing} />
      </div>
    </main>
  );
}
