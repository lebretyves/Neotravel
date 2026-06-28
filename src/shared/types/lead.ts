export type LeadStatus =
  | "NEW"
  | "INCOMPLETE"
  | "QUALIFIED"
  | "HIGH_VALUE"
  | "HUMAN_REVIEW"
  | "QUOTE_READY"
  | "QUOTE_SENT"
  | "FOLLOWUP_1"
  | "FOLLOWUP_2"
  | "FOLLOWUP_SCHEDULED"
  | "WON"
  | "LOST"
  | "CLOSED";

export type TripType = "one_way" | "round_trip";

export type DemandDraft = {
  rawMessage?: string;
  organization: string | null;
  email: string | null;
  departureCity: string | null;
  arrivalCity: string | null;
  departureDate: string | null;
  returnDate: string | null;
  passengerCount: number | null;
  tripType: TripType | null;
  options: string[];
};

export type Lead = DemandDraft & {
  id: string;
  status: LeadStatus;
  missingFields?: string[];
  confidence?: number | null;
  humanReviewReason?: string | null;
  humanReviewNotes?: string | null;
  aiSummary?: string | null;
  source?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  qualifiedAt?: string | null;
};
