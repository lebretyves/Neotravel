import type { LeadWarning } from "./chat-response";
import type { ChatLanguage } from "./chat-locale";
import { localizedNextQuestion, localizedReadyDefault } from "./chat-locale";

export function buildQualificationResponse(
  warnings: readonly LeadWarning[],
  missingFields: readonly string[],
  language: ChatLanguage = "FR",
): string {
  if (warnings.length > 0) {
    return warnings[0].message;
  }

  const nextQuestion = missingFields
    .map((field) => localizedNextQuestion(field, language))
    .find((question): question is string => question !== undefined);

  return nextQuestion ?? localizedReadyDefault(language);
}
