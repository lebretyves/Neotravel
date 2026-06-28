import type { LeadWarning } from "./chat-response";
import { buildQualificationResponse } from "./qualification-response";

export type ReplyTurn = { role: "user" | "assistant"; content: string };

export type ReplyContext = {
  /** Deterministic status the reply must respect — never let the LLM override it. */
  status: "INCOMPLETE" | "QUALIFIED";
  /** Known lead values (the source of truth) passed to the model for grounding. */
  collected: Record<string, unknown>;
  /** Critical fields still missing, in ask priority order. */
  missingFields: string[];
  /** Deterministic warnings to surface with tact. */
  warnings: readonly LeadWarning[];
  /** Recent conversation (oldest → newest), already trimmed by the caller. */
  conversation: readonly ReplyTurn[];
  lastTurnAddedUsableInfo?: boolean;
};

const FIELD_LABELS: Record<string, { label: string; noun: string }> = {
  departure_city: { label: "ville de départ", noun: "la ville de départ" },
  arrival_city: { label: "ville d'arrivée", noun: "la ville d'arrivée" },
  departure_date: { label: "date de départ", noun: "la date de départ" },
  passenger_count: { label: "nombre de passagers", noun: "le nombre de passagers" },
  trip_type: { label: "aller simple ou aller-retour", noun: "le type de trajet" },
  email: { label: "email de contact", noun: "l'email de contact" },
};

function labelFor(field: string): string {
  return FIELD_LABELS[field]?.label ?? field;
}

function nounFor(field: string): string {
  return FIELD_LABELS[field]?.noun ?? labelFor(field);
}

const NEXT_QUESTION: Record<string, string> = {
  departure_city: "Quelle est votre ville de départ ?",
  arrival_city: "Quelle est votre ville d'arrivée ?",
  departure_date: "Indiquez-moi la date de départ souhaitée, même approximative si besoin.",
  passenger_count: "Combien de passagers faut-il prévoir ?",
  trip_type: "Souhaitez-vous un aller simple ou un aller-retour ?",
  email: "Quel email devons-nous utiliser pour vous recontacter ?",
};

function questionFor(field: string) {
  return NEXT_QUESTION[field] ?? `Pouvez-vous préciser ${labelFor(field)} ?`;
}

function buildNoNewInfoResponse(field: string) {
  if (field === "departure_date") {
    return "Je n’ai pas encore la date de départ. Elle peut être approximative pour commencer, mais il m’en faut une pour préparer le devis.";
  }

  if (field === "passenger_count") {
    return "Je n’ai pas encore le nombre de passagers. Un ordre de grandeur suffit pour avancer.";
  }

  return `Je n’ai pas encore ${nounFor(field)}. ${questionFor(field)}`;
}

/**
 * Builds the prompt for the conversational reply. The reply is TEXT ONLY — it never
 * decides status, price, or distance (those stay deterministic). Its job is to make the
 * exchange feel human: acknowledge corrections, answer questions/suggestions, and ask for
 * the next missing field.
 */
export function buildReplyPrompt(ctx: ReplyContext): string {
  const transcript = ctx.conversation
    .map((turn) => `${turn.role === "user" ? "Client" : "Assistant"} : ${turn.content}`)
    .join("\n");

  const collectedEntries = Object.entries(ctx.collected).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  const collectedText = collectedEntries.length
    ? collectedEntries.map(([key, value]) => `${labelFor(key)} = ${String(value)}`).join(", ")
    : "aucune information pour l'instant";

  const missingText = ctx.missingFields.length
    ? ctx.missingFields.map(labelFor).join(", ")
    : "aucune";

  const warningsText = ctx.warnings.length
    ? ctx.warnings.map((warning) => warning.message).join(" ")
    : "aucune";
  const latestTurnSignal =
    ctx.lastTurnAddedUsableInfo === false
      ? "Le dernier message client n'a ajouté aucune information exploitable au dossier."
      : ctx.lastTurnAddedUsableInfo === true
        ? "Le dernier message client a ajouté ou corrigé au moins une information exploitable."
        : "Signal non fourni.";

  const objective =
    ctx.status === "QUALIFIED"
      ? `Toutes les informations nécessaires sont réunies. Confirme-le brièvement et invite le client à cliquer sur le bouton "Recevoir mon devis".`
      : `Il manque des informations. Termine ta réponse en demandant UNIQUEMENT la première information manquante : "${ctx.missingFields.map(labelFor)[0] ?? ""}".`;

  return `Tu es l'assistant NeoTravel, tu qualifies par chat une demande de transport de groupe en autocar.

Conversation (du plus ancien au plus récent) :
${transcript}

Informations déjà collectées (vérité, ne les redemande pas) : ${collectedText}.
Informations encore manquantes : ${missingText}.
Alertes à signaler : ${warningsText}.
Signal du dernier tour : ${latestTurnSignal}

Objectif de ta réponse : ${objective}

Règles impératives :
- Réponds en français, ton professionnel et chaleureux, 1 à 3 phrases maximum.
- Réagis au dernier message comme un conseiller humain : reconnais l'information réellement donnée, puis fais avancer la qualification.
- Si le dernier message du client corrige une information, accuse réception explicitement de la correction.
- Si le signal indique qu'aucune information exploitable n'a été ajoutée, ne remercie pas pour des précisions inexistantes : dis simplement l'information qui manque et pourquoi elle est nécessaire.
- N'écris pas "merci pour ces précisions" si le dernier message n'a ajouté aucune information exploitable.
- Si le client pose une question ou demande un conseil, réponds brièvement et utilement.
- Tu ne donnes JAMAIS de prix, d'estimation chiffrée, de distance, de kilométrage, de remise ni de coefficient : le tarif est calculé après qualification par notre moteur déterministe.
- S'il y a une alerte, explique-la avec tact et demande la correction de l'information concernée.
- N'invente jamais une information que le client n'a pas donnée. Ne redemande jamais une information déjà collectée.
- Ne propose pas de villes, de dates ou de nombres à la place du client : demande-lui de préciser.

Réponds uniquement avec le texte du message, sans guillemets ni préfixe de rôle.`;
}

/**
 * Generates the assistant's conversational reply via the injected `generate` function
 * (kept as a dependency so this module stays SDK-free and unit-testable). Any failure or
 * empty result falls back to the deterministic template so the chat never goes silent.
 */
export async function generateAssistantReply(
  ctx: ReplyContext,
  deps: {
    generate: (prompt: string) => Promise<string>;
    fallback?: string;
  },
): Promise<string> {
  const fallback =
    deps.fallback ?? buildQualificationResponse(ctx.warnings, ctx.missingFields);
  const firstMissingField = ctx.missingFields[0];

  if (
    ctx.status === "INCOMPLETE" &&
    ctx.warnings.length === 0 &&
    firstMissingField === "trip_type"
  ) {
    return ctx.lastTurnAddedUsableInfo
      ? "C’est noté. Souhaitez-vous un aller simple ou un aller-retour ?"
      : buildNoNewInfoResponse(firstMissingField);
  }

  if (
    ctx.status === "INCOMPLETE" &&
    ctx.warnings.length === 0 &&
    firstMissingField &&
    ctx.lastTurnAddedUsableInfo === false
  ) {
    return buildNoNewInfoResponse(firstMissingField);
  }

  try {
    const text = (await deps.generate(buildReplyPrompt(ctx))).trim();
    // Strip wrapping quotes the model sometimes adds.
    const cleaned = text.replace(/^["«»\s]+|["«»\s]+$/g, "");
    return cleaned.length > 0 ? cleaned : fallback;
  } catch {
    return fallback;
  }
}
