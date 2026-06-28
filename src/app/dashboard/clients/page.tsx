import { ClientsManager } from "@/features/clients/components/ClientsManager";
import type { ClientRow } from "@/features/clients/components/ClientsManager";
import { listClients } from "@/shared/lib/data/clientRepository";
import { listLeads } from "@/shared/lib/data/leadRepository";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

// Statuts d'une demande encore « à traiter » (avant envoi du devis).
const UNTREATED = new Set(["NEW", "INCOMPLETE", "QUALIFIED", "HIGH_VALUE", "HUMAN_REVIEW", "QUOTE_READY"]);

export default async function ClientsPage() {
 await requirePermission("clients");
 const [clients, leads] = await Promise.all([listClients(), listLeads()]);

 const rows: ClientRow[] = clients.map((client) => {
  const pending = leads.filter(
   (lead) =>
    lead.email &&
    client.email &&
    lead.email.toLowerCase() === client.email.toLowerCase() &&
    UNTREATED.has(lead.status)
  );

  return {
   ...client,
   pendingCount: pending.length,
   latestLeadId: pending[0]?.id ?? null
  };
 });

 return <ClientsManager initialClients={rows} />;
}
