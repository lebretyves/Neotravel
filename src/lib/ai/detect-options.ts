/**
 * Deterministic detection of customer-requested options from a chat message.
 *
 * This NEVER prices anything — it only flags which options the prospect asked for so the
 * deterministic pricing engine (calculer_devis) can list them in the breakdown. Pricing
 * stays the sole responsibility of the engine.
 */
export type DetectedOptions = {
  guide?: true;
  driver_overnight?: true;
};

// Only the noun/option sense of "guide" — never the verb ("guide-moi", "me guider",
// "être guidé"). Matched via an option context: an accompagnateur, a "visite guidée", a
// determiner/preposition before "guide", or "guide touristique/accompagnateur/…".
const GUIDE =
  /\b(?:accompagnateur(?:s|rice)?|accompagnatrice)\b|\bvisites?\s+guid[ée]es?\b|\b(?:un|une|le|la|les|des|d['’]un|d['’]une|du|de|au|aux|avec|notre|votre|mon|ma|nos|vos|ce|cet|cette)\s+guides?\b|\bguides?\s+(?:accompagnateur|touristique|conf[ée]rencier|local)\b/iu;
const GUIDE_NEGATED = /\b(?:sans|pas\s+(?:de\s+|d['’]))\s*(?:guides?|accompagnateur(?:s|rice)?)\b/iu;

// driver_overnight is detected ONLY when "chauffeur" is explicitly tied to an overnight /
// stay-on-site signal. A multi-day trip alone (e.g. a next-day return) must NOT trigger it.
const DRIVER_OVERNIGHT =
  /\bchauffeur\b[^.!?]*\b(?:nuit[ée]?e?|dort|dormir|reste\s+sur\s+place|sur\s+place|h[ée]bergement|h[ée]berg[ée]|logement|log[ée]|d[ée]couche)\b|\b(?:nuit[ée]?e?|h[ée]bergement|logement|d[ée]couche)\s+(?:du\s+|pour\s+(?:le\s+)?|au\s+)?chauffeur\b/iu;

export function detectOptions(message: string): DetectedOptions {
  const options: DetectedOptions = {};

  if (GUIDE.test(message) && !GUIDE_NEGATED.test(message)) options.guide = true;
  if (DRIVER_OVERNIGHT.test(message)) options.driver_overnight = true;

  return options;
}

export type OptionCode = "guide" | "driver_overnight";

// Removal detection — a previously-chosen option can be dropped from the chat. A removal is
// only triggered by a noun-adjacent cue: a removal verb before the option ("enlève mon guide",
// "retire le guide", "supprime l'accompagnateur") OR a negation immediately before the option
// noun ("sans guide", "pas de guide", "je ne veux plus de guide"). The adjacency requirement
// avoids false positives like "je veux un guide mais pas de nuit chauffeur".
const REMOVE_VERB =
  "(?:enl[èe]ve[zr]?|enlever|retire[zr]?|retirer|supprime[zr]?|supprimer|annule[zr]?|annuler|oublie[zr]?|oublier)";
const REMOVE_NEG =
  "(?:sans|pas\\s+(?:de\\s+|d['’])|plus\\s+(?:de\\s+|d['’])|pas\\s+besoin\\s+(?:de\\s+|d['’])?|ne\\s+veu[xt]\\s+(?:pas|plus)\\s*(?:de\\s+|d['’])?)";
const DET = "(?:mon|ma|mes|le|la|l['’]|les|nos|notre|votre|vos|ce|cet|cette|un|une|des|du|de\\s+|d['’])";
const GUIDE_NOUN = "(?:guides?|accompagnateur(?:s|rice)?|accompagnatrice)";
const DRIVER_NOUN =
  "(?:nuit[ée]?e?\\s+(?:du\\s+|pour\\s+(?:le\\s+)?|au\\s+)?chauffeur|d[ée]couche|chauffeur\\b[^.!?]{0,40}?(?:nuit[ée]?e?|dort|dormir|sur\\s+place|h[ée]berg|logement|d[ée]couche))";

const GUIDE_REMOVE = new RegExp(
  `(?:${REMOVE_VERB})\\s+(?:${DET}\\s*)?${GUIDE_NOUN}\\b|(?:${REMOVE_NEG})\\s*${GUIDE_NOUN}\\b`,
  "iu",
);
const DRIVER_REMOVE = new RegExp(
  `(?:${REMOVE_VERB})\\s+(?:${DET}\\s*)?${DRIVER_NOUN}|(?:${REMOVE_NEG})\\s*${DRIVER_NOUN}`,
  "iu",
);

export function detectOptionRemovals(message: string): OptionCode[] {
  const removals: OptionCode[] = [];

  if (GUIDE_REMOVE.test(message)) removals.push("guide");
  if (DRIVER_REMOVE.test(message)) removals.push("driver_overnight");

  return removals;
}
