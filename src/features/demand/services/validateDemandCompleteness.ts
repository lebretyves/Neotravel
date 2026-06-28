import type { DemandDraft } from "@/shared/types/lead";

const requiredFields: Array<keyof DemandDraft> = [
  "organization",
  "email",
  "departureCity",
  "arrivalCity",
  "departureDate",
  "passengerCount",
  "tripType"
];

export function validateDemandCompleteness(demand: DemandDraft) {
  const missingFields = requiredFields.filter((field) => !demand[field]);
  if (demand.departureDate && new Date(demand.departureDate).getTime() < Date.now()) {
    missingFields.push("departureDate");
  }

  return {
    complete: missingFields.length === 0,
    missingFields
  };
}
