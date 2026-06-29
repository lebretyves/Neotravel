import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Client, ClientInput } from "@/shared/types/client";

type ClientRow = {
  id: string;
  organization: string | null;
  contact_name?: string | null;
  email: string;
  phone?: string | null;
  active?: boolean;
  created_at: string;
};

const SELECT = "id, organization, contact_name, email, phone, active, created_at";
const LEGACY_SELECT = "id, organization, email, created_at";

function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    organization: row.organization,
    contactName: row.contact_name ?? null,
    email: row.email,
    phone: row.phone ?? null,
    active: row.active ?? true,
    createdAt: row.created_at
  };
}

export async function createClient(input: ClientInput) {
  if (shouldUseDemoData()) return demoStore.createClient(input);

  const supabase = createSupabaseAdminClient();
  const payload = {
    organization: input.organization,
    contact_name: input.contactName ?? null,
    email: input.email,
    phone: input.phone ?? null,
    active: input.active ?? true
  };
  const { data, error } = await supabase
    .from("clients")
    .insert(payload)
    .select(SELECT)
    .single();

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("clients")
      .insert({
        organization: input.organization,
        email: input.email
      })
      .select(LEGACY_SELECT)
      .single();

    if (fallback.error) throw fallback.error;
    return toClient(fallback.data as ClientRow);
  }

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

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("clients")
      .select(LEGACY_SELECT)
      .order("created_at", { ascending: false });

    if (fallback.error) throw fallback.error;
    return (fallback.data as ClientRow[]).map(toClient);
  }

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
  if (error && isMissingColumnError(error)) {
    const fallback = await supabase.from("clients").select(LEGACY_SELECT).eq("id", id).maybeSingle();
    if (fallback.error) throw fallback.error;
    return fallback.data ? toClient(fallback.data as ClientRow) : null;
  }
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
  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("clients")
      .update({
        ...(patch.organization !== undefined && { organization: patch.organization }),
        ...(patch.email !== undefined && { email: patch.email })
      })
      .eq("id", id)
      .select(LEGACY_SELECT)
      .maybeSingle();

    if (fallback.error) throw fallback.error;
    return fallback.data ? toClient(fallback.data as ClientRow) : null;
  }
  if (error) throw error;
  return data ? toClient(data as ClientRow) : null;
}

export async function deleteClient(id: string): Promise<void> {
  if (shouldUseDemoData()) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}
