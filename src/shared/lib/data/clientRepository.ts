import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Client, ClientInput } from "@/shared/types/client";

type ClientRow = {
 id: string;
 organization: string | null;
 contact_name: string | null;
 email: string;
 phone: string | null;
 active?: boolean | null;
 created_at: string;
};

function toClient(row: ClientRow): Client {
 return {
  id: row.id,
  organization: row.organization,
  contactName: row.contact_name,
  email: row.email,
  phone: row.phone,
  active: row.active ?? true,
  createdAt: row.created_at
 };
}

export async function createClient(input: ClientInput) {
 if (shouldUseDemoData()) return demoStore.createClient(input);

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("clients")
  .insert({
   organization: input.organization,
   contact_name: input.contactName ?? null,
   email: input.email,
   phone: input.phone ?? null,
   active: input.active ?? true
  })
  .select("id, organization, contact_name, email, phone, active, created_at")
  .single();

 if (error) throw error;
 return toClient(data as ClientRow);
}

/**
 * Garantit l'existence d'un compte client pour une demande entrante
 * (création si l'email n'existe pas encore). Permet qu'une demande de devis
 * client apparaisse automatiquement dans « Comptes clients ».
 */
export async function ensureClientForLead(input: {
 email: string;
 organization: string | null;
 contactName?: string | null;
 phone?: string | null;
}) {
 if (shouldUseDemoData()) {
  const existing = demoStore
   .listClients()
   .find((client) => client.email.toLowerCase() === input.email.toLowerCase());
  if (existing) return existing;
  return demoStore.createClient({
   organization: input.organization,
   contactName: input.contactName ?? null,
   email: input.email,
   phone: input.phone ?? null,
   active: true
  });
 }

 const supabase = createSupabaseAdminClient();
 const { data: existingClient, error: lookupError } = await supabase
  .from("clients")
  .select("id, organization, contact_name, email, phone, active, created_at")
  .eq("email", input.email)
  .maybeSingle();

 if (lookupError) throw lookupError;
 if (existingClient) return toClient(existingClient as ClientRow);

 const { data, error } = await supabase
  .from("clients")
  .insert({
   organization: input.organization,
   contact_name: input.contactName ?? null,
   email: input.email,
   phone: input.phone ?? null,
   active: true
  })
  .select("id, organization, contact_name, email, phone, active, created_at")
  .single();

 if (error) throw error;
 return toClient(data as ClientRow);
}

export async function listClients() {
 if (shouldUseDemoData()) return demoStore.listClients();

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("clients")
  .select("id, organization, contact_name, email, phone, active, created_at")
  .order("created_at", { ascending: false });

 if (error) throw error;
 return (data as ClientRow[]).map(toClient);
}

export async function getClientById(id: string) {
 if (shouldUseDemoData()) return demoStore.getClientById(id);

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("clients")
  .select("id, organization, contact_name, email, phone, active, created_at")
  .eq("id", id)
  .maybeSingle();

 if (error) throw error;
 return data ? toClient(data as ClientRow) : null;
}

export async function updateClient(id: string, patch: Partial<ClientInput>) {
 if (shouldUseDemoData()) {
  const next: Partial<Client> = {};
  if (patch.organization !== undefined) next.organization = patch.organization;
  if (patch.contactName !== undefined) next.contactName = patch.contactName ?? null;
  if (patch.email !== undefined) next.email = patch.email;
  if (patch.phone !== undefined) next.phone = patch.phone ?? null;
  if (patch.active !== undefined) next.active = patch.active;
  return demoStore.updateClient(id, next);
 }

 const supabase = createSupabaseAdminClient();
 const updates: Record<string, unknown> = {};
 if (patch.organization !== undefined) updates.organization = patch.organization;
 if (patch.contactName !== undefined) updates.contact_name = patch.contactName ?? null;
 if (patch.email !== undefined) updates.email = patch.email;
 if (patch.phone !== undefined) updates.phone = patch.phone ?? null;
 if (patch.active !== undefined) updates.active = patch.active;

 const { data, error } = await supabase
  .from("clients")
  .update(updates)
  .eq("id", id)
  .select("id, organization, contact_name, email, phone, active, created_at")
  .maybeSingle();

 if (error) throw error;
 return data ? toClient(data as ClientRow) : null;
}

export async function deleteClient(id: string) {
 if (shouldUseDemoData()) return demoStore.deleteClient(id);

 const supabase = createSupabaseAdminClient();
 const { error } = await supabase.from("clients").delete().eq("id", id);
 if (error) throw error;
 return true;
}
