import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { getLeadById } from "@/shared/lib/data/leadRepository";
import type { Lead } from "@/shared/types/lead";

export async function getLeadDetail(leadId: string): Promise<Lead | null> {
  if (shouldUseDemoData()) return getLeadById(leadId);
  return getLeadById(leadId);
}
