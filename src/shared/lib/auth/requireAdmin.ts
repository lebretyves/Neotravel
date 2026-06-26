import { redirect } from "next/navigation";
import { isDemoMode } from "@/shared/lib/demo/demoMode";
import { getAdminUser } from "@/shared/lib/supabase/auth-server";
import { getLocalAdminEmail, getLocalStaff, isLocalAuthEnabled, type StaffRole } from "./localAuth";
import { ALL_PERMISSION_KEYS, type PermissionKey } from "./permissions";

export const ADMIN_LOGIN_PATH = "/admin-connexion";

export type AdminSession = { email: string | null } | null;
export type StaffSession = {
  email: string | null;
  name?: string;
  role: StaffRole;
  permissions: PermissionKey[];
};

/**
 * Session du salarié connecté, rôle et permissions inclus.
 * - Auth locale -> lit le compte (admin = toutes permissions / commercial = les siennes).
 * - Supabase -> rôle admin par défaut (à brancher).
 * - Démo pure -> session ouverte (admin, toutes permissions).
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  if (isLocalAuthEnabled()) {
    const staff = await getLocalStaff();
    return staff
      ? { email: staff.email, name: staff.name, role: staff.role, permissions: staff.permissions }
      : null;
  }
  if (!isDemoMode()) {
    const user = await getAdminUser();
    return user ? { email: user.email ?? null, role: "admin", permissions: [...ALL_PERMISSION_KEYS] } : null;
  }
  return { email: null, role: "admin", permissions: [...ALL_PERMISSION_KEYS] };
}

/** Un admin a tout ; sinon on vérifie la liste de permissions. */
export function sessionHasPermission(session: StaffSession, permission: PermissionKey): boolean {
  return session.role === "admin" || session.permissions.includes(permission);
}

/**
 * Garde commune des espaces internes (`/dashboard`, `/admin`).
 * Conserve la signature historique.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getStaffSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  return { email: session.email };
}

/** Tout salarié connecté (admin OU commercial). Sinon -> page de connexion. */
export async function requireStaff(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  return session;
}

/** Réservé aux admins. Commercial -> renvoyé au dashboard. Non connecté -> login. */
export async function requireAdminRole(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  if (session.role !== "admin") redirect("/dashboard");
  return session;
}

/**
 * Exige une permission précise. Admin -> toujours autorisé.
 * Commercial sans la permission -> renvoyé au dashboard. Non connecté -> login.
 */
export async function requirePermission(permission: PermissionKey): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  if (!sessionHasPermission(session, permission)) redirect("/dashboard");
  return session;
}

/**
 * Variante pour les routes API : ne redirige pas, renvoie un booléen.
 * Protège les endpoints qui lisent/modifient des données (tout salarié).
 */
export async function isAdminAuthorized(): Promise<boolean> {
  if (isLocalAuthEnabled()) return Boolean(await getLocalAdminEmail());
  if (!isDemoMode()) return Boolean(await getAdminUser());
  return true;
}

/** Idem mais réservé au rôle admin (endpoints sensibles : comptes clients...). */
export async function isAdminRoleAuthorized(): Promise<boolean> {
  const session = await getStaffSession();
  return session?.role === "admin";
}
