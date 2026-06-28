export type StatusTone =
 | "new"
 | "info"
 | "warning"
 | "danger"
 | "success"
 | "muted"
 | "priority";

export type StatusEntry = { label: string; tone: StatusTone };

/**
 * Correspondance unique code de statut -> libelle pro (FR) + couleur de badge.
 * Couvre les leads, devis, relances et partenaires. Aucun nom de variable
 * ne doit etre affiche a l'utilisateur : on passe toujours par ici.
 */
const STATUS_MAP: Record<string, StatusEntry> = {
 // Lead / commercial
 NEW: { label: "Nouveau", tone: "new" },
 INCOMPLETE: { label: "À compléter", tone: "warning" },
 QUALIFIED: { label: "Qualifié", tone: "info" },
 HIGH_VALUE: { label: "Prioritaire", tone: "priority" },
 HUMAN_REVIEW: { label: "À valider", tone: "danger" },
 QUOTE_READY: { label: "Devis prêt", tone: "info" },
 QUOTE_SENT: { label: "Devis envoyé", tone: "info" },
 FOLLOWUP_SCHEDULED: { label: "Relance prévue", tone: "warning" },
 FOLLOWUP_1: { label: "1re relance", tone: "warning" },
 FOLLOWUP_2: { label: "2e relance", tone: "warning" },
 WON: { label: "Gagné", tone: "success" },
 LOST: { label: "Perdu", tone: "danger" },
 CLOSED: { label: "Clôturé", tone: "muted" },

 // Devis
 ACCEPTED: { label: "Accepté", tone: "success" },
 REFUSED: { label: "Refusé", tone: "danger" },

 // Relances
 SCHEDULED: { label: "Programmée", tone: "warning" },
 SENT: { label: "Envoyée", tone: "info" },
 OPENED: { label: "Ouverte", tone: "info" },
 REPLIED: { label: "Répondu", tone: "success" },

 // Partenaires autocaristes
 TO_CONFIRM: { label: "À confirmer", tone: "warning" },
 OPTION_HELD: { label: "Option posée", tone: "info" },
 CONFIRMED: { label: "Confirmé", tone: "success" },
 UNAVAILABLE: { label: "Indisponible", tone: "danger" }
};

// Statuts deja saisis en francais (donnees partenaires) -> couleur seulement.
const FRENCH_TONE: Record<string, StatusTone> = {
 "option posee": "info",
 "option posée": "info",
 "a confirmer": "warning",
 "à confirmer": "warning",
 "confirme": "success",
 "confirmé": "success",
 "indisponible": "danger"
};

function prettify(code: string) {
 const lower = code.replace(/_/g, " ").toLowerCase();
 return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function getStatusDisplay(code: string): StatusEntry {
 if (STATUS_MAP[code]) return STATUS_MAP[code];

 const french = FRENCH_TONE[code.trim().toLowerCase()];
 if (french) return { label: code, tone: french };

 return { label: prettify(code), tone: "muted" };
}
