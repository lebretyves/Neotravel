import type { LeadWarning } from "./chat-response";
import type { LeadQualification } from "../domain/schemas";
import {
  isPastDate,
  isPaxBelowMin,
  isPaxOverMax,
  isReturnBeforeDeparture,
  isValidDateString,
} from "../../shared/lib/validation/leadValidators";

export type LeadReview = "PAX_OVER_85" | null;

export type ValidateLeadResult = {
  warnings: LeadWarning[];
  /** Copy of the lead with unusable values removed (so they re-appear as missing). */
  sanitized: LeadQualification;
  /** Set when the demand must go to HUMAN_REVIEW instead of being re-asked. */
  review: LeadReview;
};

/**
 * Deterministic source of truth for lead validity. The LLM only helps *parse*;
 * this function alone decides what is valid, what is stripped, and what escalates.
 *
 * - invalid / past departure_date → stripped (becomes missing) + blocking warning
 * - return_date before departure_date → stripped + blocking warning
 * - passenger_count ≤ 0 or non-integer → stripped (becomes missing) + blocking warning
 * - passenger_count > 85 → NOT stripped, NOT re-asked → review = "PAX_OVER_85"
 */
export function validateLead(
  lead: LeadQualification,
  today: Date = new Date(),
): ValidateLeadResult {
  const warnings: LeadWarning[] = [];
  const sanitized: LeadQualification = { ...lead };
  let review: LeadReview = null;

  // --- departure_date -------------------------------------------------------
  if (lead.departure_date != null) {
    if (!isValidDateString(lead.departure_date)) {
      warnings.push({
        field: "departureDate",
        code: "DEPARTURE_DATE_INVALID",
        message: "Je n’ai pas reconnu la date de départ. Indiquez-la par exemple comme « 11 juillet » ou « 11/07/2027 ».",
        blocking: true,
      });
      delete sanitized.departure_date;
    } else if (isPastDate(lead.departure_date, today)) {
      warnings.push({
        field: "departureDate",
        code: "DEPARTURE_DATE_PAST",
        message: "La date de départ est déjà passée. Merci d'indiquer une date à venir.",
        blocking: true,
      });
      delete sanitized.departure_date;
    }
  }

  // --- return_date ----------------------------------------------------------
  // Compare against the (possibly sanitized) departure date.
  if (
    lead.return_date != null &&
    isReturnBeforeDeparture(sanitized.departure_date, lead.return_date)
  ) {
    warnings.push({
      field: "returnDate",
      code: "RETURN_BEFORE_DEPARTURE",
      message: "La date de retour est antérieure à la date de départ. Merci de la corriger.",
      blocking: true,
    });
    delete sanitized.return_date;
  }

  // --- passenger_count ------------------------------------------------------
  if (isPaxOverMax(lead.passenger_count)) {
    // Keep the value; escalate instead of re-asking.
    review = "PAX_OVER_85";
  } else if (isPaxBelowMin(lead.passenger_count)) {
    warnings.push({
      field: "passengerCount",
      code: "PASSENGER_COUNT_INVALID",
      message: "Le nombre de passagers indiqué n'est pas valide. Merci de le préciser.",
      blocking: true,
    });
    delete sanitized.passenger_count;
  }

  return { warnings, sanitized, review };
}
