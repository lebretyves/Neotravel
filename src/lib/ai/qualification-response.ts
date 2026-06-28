import type { LeadWarning } from "./chat-response";

const NEXT_QUESTION: Record<string, string> = {
  departure_city: "Pour commencer, quelle est votre ville de départ ?",
  arrival_city: "Quelle est votre ville d'arrivée ?",
  departure_date: "À quelle date souhaitez-vous partir ? Une date approximative suffit pour avancer.",
  passenger_count: "Combien de passagers seront à bord ?",
  trip_type: "Souhaitez-vous un aller simple ou un aller-retour ?",
};

export function buildQualificationResponse(
  warnings: readonly LeadWarning[],
  missingFields: readonly string[],
): string {
  if (warnings.length > 0) {
    return warnings[0].message;
  }

  const nextQuestion = missingFields
    .map((field) => NEXT_QUESTION[field])
    .find((question): question is string => question !== undefined);

  return nextQuestion ?? "Votre demande est prête à être traitée.";
}
