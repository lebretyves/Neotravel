export type FollowupStatus = "SCHEDULED" | "SENT" | "OPENED" | "REPLIED";

export type Followup = {
  id: string;
  leadId: string;
  quoteId?: string;
  channel: "email";
  status: FollowupStatus;
  dueAt: string;
  createdAt?: string | null;
};
