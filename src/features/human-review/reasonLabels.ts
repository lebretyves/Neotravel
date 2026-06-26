/**
 * Traduit les codes techniques de revue humaine en messages clairs et
 * actionnables (pour des utilisateurs non techniques). Utilisé partout où une
 * raison de revue humaine est affichée.
 */

const REASON_LABELS: Record<string, string> = {
  // --- Distance / itinéraire ---
  DISTANCE_PROVIDER_NOT_CONFIGURED:
    "Distance non calculable automatiquement (service d'itinéraire non configuré). Saisissez la distance à la main, ou validez la demande.",
  DISTANCE_PROVIDER_FAILED:
    "Le calcul de distance a échoué. Réessayez, ou saisissez la distance à la main.",
  DISTANCE_PROVIDER_NO_ROUTE: "Aucun itinéraire routier trouvé entre ces deux villes. Vérifiez les villes.",
  DISTANCE_NOT_FOUND_IN_CONTROLLED_BASE:
    "Trajet absent de la grille tarifaire. Saisissez la distance à la main, ou ajoutez la route.",
  DISTANCE_OUT_OF_ALLOWED_RANGE: "Distance hors des limites autorisées pour un devis automatique.",
  DISTANCE_GEOCODING_AMBIGUOUS: "Villes ambiguës : précisez le département ou la région.",
  DISTANCE_INPUT_INVALID: "Ville de départ ou d'arrivée invalide. Vérifiez la saisie.",

  // --- Date de départ ---
  DEPARTURE_LESS_THAN_48H: "Départ dans moins de 48h : validation manuelle requise (vérifier la disponibilité).",
  PAST_DEPARTURE_DATE: "La date de départ est déjà passée. Demandez une nouvelle date au client.",
  INVALID_DEPARTURE_DATE: "Date de départ invalide. Vérifiez la date.",

  // --- Passagers / données ---
  PASSENGER_COUNT_ABOVE_AUTOMATIC_LIMIT: "Groupe trop important pour un devis automatique : à traiter à la main.",
  PASSENGER_COUNT_REQUIRES_HUMAN_REVIEW: "Nombre de passagers trop élevé pour le calcul automatique.",
  PRICING_INPUT_INVALID: "Informations insuffisantes (nombre de passagers, villes ou date manquants).",

  // --- Tarification ---
  PRICING_MATRICES_INACTIVE: "Grille tarifaire indisponible. Prévenez l'administrateur.",
  PRICING_MATRICES_UNAVAILABLE: "Grille tarifaire indisponible. Prévenez l'administrateur.",

  // --- Trajet / qualification ---
  UNKNOWN_ROUTE_WITHOUT_CONTROLLED_DISTANCE: "Trajet inconnu sans distance vérifiée : à contrôler avant devis.",
  LOW_AI_CONFIDENCE: "Demande peu claire : à vérifier manuellement avant devis.",
  INCOHERENT_DEMAND: "Demande incohérente : à clarifier avec le client.",
  OUT_OF_SCOPE_MVP: "Demande hors périmètre (sur-mesure, médical, marchandises…) : traitement manuel.",
  PROMPT_INJECTION: "Message suspect détecté : vérification requise avant tout traitement.",

  // --- Commercial ---
  DISCOUNT_OR_FORCED_PRICE_REQUEST: "Demande de remise ou de prix imposé : décision commerciale requise.",
  REAL_PARTNER_AVAILABILITY_REQUEST: "Confirmation de disponibilité autocariste demandée : à traiter à la main.",
  QUOTE_CHANGE_REQUEST: "Le client demande une modification du devis.",

  // --- Générique ---
  QUOTE_GENERATION_BLOCKED: "Devis automatique bloqué : à finaliser à la main."
};

const DEFAULT_LABEL = "Cas à trancher par un commercial avant tout devis.";

/** Message clair pour une raison de revue humaine (code technique ou texte libre). */
export function humanReviewReasonLabel(reason?: string | null): string {
  if (!reason) return DEFAULT_LABEL;
  // Code connu -> message clair. Sinon, si ça ressemble à un code (MAJUSCULES_AVEC_UNDERSCORES),
  // on évite d'afficher le jargon et on retombe sur le message générique.
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  if (/^[A-Z0-9_]{4,}$/.test(reason)) return DEFAULT_LABEL;
  return reason;
}

/**
 * Valeur pour un champ éditable : code connu -> message clair, sinon on garde
 * le texte tel quel (un commercial a pu écrire une raison libre).
 */
export function humanReviewReasonText(reason?: string | null): string {
  if (!reason) return "";
  return REASON_LABELS[reason] ?? reason;
}
