export type PermissionKey =
  | "clients"
  | "leads"
  | "human_review"
  | "followups"
  | "quotes"
  | "agenda"
  | "partners"
  | "team"
  | "admin_view"
  | "pricing"
  | "automations"
  | "growth"
  | "costs_logs"
  | "costs_ai"
  | "compliance";

export type PermissionDef = {
  key: PermissionKey;
  label: string;
  section: string;
  defaultForCommercial: boolean;
};

export const PERMISSIONS: PermissionDef[] = [
  { key: "clients", label: "Comptes clients", section: "Activité", defaultForCommercial: false },
  { key: "leads", label: "Demandes (leads)", section: "Traitement", defaultForCommercial: true },
  { key: "human_review", label: "Validation humaine", section: "Traitement", defaultForCommercial: true },
  { key: "followups", label: "Relances", section: "Traitement", defaultForCommercial: true },
  { key: "quotes", label: "Devis", section: "Traitement", defaultForCommercial: true },
  { key: "agenda", label: "Agenda", section: "Traitement", defaultForCommercial: true },
  { key: "partners", label: "Partenaires autocars", section: "Partenaires & équipe", defaultForCommercial: false },
  { key: "team", label: "Gouvernance (équipe & accès)", section: "Gouvernance", defaultForCommercial: false },
  { key: "admin_view", label: "Vue admin", section: "Pilotage", defaultForCommercial: false },
  { key: "pricing", label: "Tarification", section: "Pilotage", defaultForCommercial: false },
  { key: "automations", label: "Automatisations", section: "Pilotage", defaultForCommercial: false },
  { key: "growth", label: "Croissance", section: "Pilotage", defaultForCommercial: false },
  { key: "costs_logs", label: "Coûts & logs", section: "Coûts & conformité", defaultForCommercial: false },
  { key: "costs_ai", label: "Coûts IA", section: "Coûts & conformité", defaultForCommercial: false },
  { key: "compliance", label: "Audit RGPD", section: "Coûts & conformité", defaultForCommercial: false }
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((permission) => permission.key);

export const DEFAULT_COMMERCIAL_PERMISSIONS: PermissionKey[] = PERMISSIONS.filter(
  (permission) => permission.defaultForCommercial
).map((permission) => permission.key);

export const PERMISSION_SECTIONS: string[] = PERMISSIONS.reduce<string[]>((sections, permission) => {
  if (!sections.includes(permission.section)) sections.push(permission.section);
  return sections;
}, []);

/** Onglets visibles par défaut pour un rôle commercial (traitement uniquement). */
export const COMMERCIAL_SIDEBAR_PERMISSIONS = DEFAULT_COMMERCIAL_PERMISSIONS;

export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSION_KEYS as string[]).includes(value);
}

export function sanitizePermissions(values: string[]): PermissionKey[] {
  return values.filter(isPermissionKey);
}
