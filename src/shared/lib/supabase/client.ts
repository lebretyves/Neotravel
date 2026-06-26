import { createClient as _createClient } from "@supabase/supabase-js";

export function createBrowserSupabaseClient() {
  return _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

export const createClient = createBrowserSupabaseClient;
