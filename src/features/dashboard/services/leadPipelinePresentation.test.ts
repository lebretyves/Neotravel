import { describe, expect, it } from "vitest";
import { getLeadCommercialAction } from "./leadPipelinePresentation";
import type { Lead } from "@/shared/types/lead";

function lead(overrides: Partial<Lead> = {}): Lead {
 return {
  id: "lead-1",
  status: "HUMAN_REVIEW",
  organization: null,
  email: "client@example.com",
  departureCity: "Paris",
  arrivalCity: "Lyon",
  departureDate: "2026-07-12",
  returnDate: null,
  passengerCount: 95,
  tripType: "one_way",
  options: [],
  ...overrides
 };
}

describe("getLeadCommercialAction", () => {
 it("oriente une revue humaine vers la zone de décision avec un motif lisible", () => {
  const action = getLeadCommercialAction({
   lead: lead({ humanReviewReason: "PAX_OVER_85" })
  });

  expect(action.label).toBe("Reprendre manuellement");
  expect(action.cta).toBe("Décider");
  expect(action.href).toBe("/dashboard/demandes/lead-1#human-review-actions");
  expect(action.detail).toBe("Motif : Groupe au-delà de la capacité standard (85 passagers) : reprise commerciale.");
  expect(action.detail).not.toContain("PAX_OVER_85");
 });

 it("n'affiche pas un motif vide ou technique quand aucune raison fiable n'existe", () => {
  const action = getLeadCommercialAction({
   lead: lead({ humanReviewReason: "UNKNOWN_INTERNAL_CODE" })
  });

  expect(action.detail).toBe("Motif : Cas à trancher par un commercial avant tout devis.");
 });
});
