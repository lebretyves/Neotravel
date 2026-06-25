export const SUPABASE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export type SupabaseEnvKey = (typeof SUPABASE_ENV_KEYS)[number];
export type EnvLike = Record<string, string | undefined>;

export function getMissingSupabaseEnv(env: EnvLike = process.env): SupabaseEnvKey[] {
  return SUPABASE_ENV_KEYS.filter((key) => !env[key]);
}

export function assertSupabaseEnv(env: EnvLike = process.env): void {
  const missingKeys = getMissingSupabaseEnv(env);

  if (missingKeys.length > 0) {
    throw new Error(`Missing Supabase environment variables: ${missingKeys.join(", ")}`);
  }
}
