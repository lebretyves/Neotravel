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
