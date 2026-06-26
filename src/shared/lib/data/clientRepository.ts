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
  active: boolean;
  created_at: string;
};

const SELECT = "id, organization, contact_name, email, phone, active, created_at";

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
    .select(SELECT)
    .single();

  if (error) throw error;
  return toClient(data as ClientRow);
}

export async function listClients() {
  if (shouldUseDemoData()) return demoStore.listClients();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as ClientRow[]).map(toClient);
}

export async function getClientById(id: string): Promise<Client | null> {
  if (shouldUseDemoData()) {
    const all = await demoStore.listClients();
    return all.find((c) => c.id === id) ?? null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("clients").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toClient(data as ClientRow) : null;
}

export async function updateClient(
  id: string,
  patch: Partial<{ organization: string | null; contactName: string | null; email: string; phone: string | null; active: boolean }>
): Promise<Client | null> {
  if (shouldUseDemoData()) {
    const all = await demoStore.listClients();
    const existing = all.find((c) => c.id === id);
    if (!existing) return null;
    return { ...existing, ...patch };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .update({
      ...(patch.organization !== undefined && { organization: patch.organization }),
      ...(patch.contactName !== undefined && { contact_name: patch.contactName }),
      ...(patch.email !== undefined && { email: patch.email }),
      ...(patch.phone !== undefined && { phone: patch.phone }),
      ...(patch.active !== undefined && { active: patch.active })
    })
    .eq("id", id)
    .select(SELECT)
    .maybeSingle();
  if (error) throw error;
  return data ? toClient(data as ClientRow) : null;
}

export async function deleteClient(id: string): Promise<void> {
  if (shouldUseDemoData()) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}
