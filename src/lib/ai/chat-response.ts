export type ChatApiStatus =
  | "INCOMPLETE"
  | "HUMAN_REVIEW"
  | "QUOTE_READY"
  | "QUALIFIED"
  | "ERROR";

export type ChatApiResponse = {
  status: ChatApiStatus;
  message: string;
  leadId?: string;
  quoteId?: string;
  missingFields?: string[];
  reviewReason?: string;
};

export function chatJson(response: ChatApiResponse, init?: ResponseInit): Response {
  return Response.json(response, init);
}
