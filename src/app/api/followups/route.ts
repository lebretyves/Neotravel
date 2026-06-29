import { scheduleFollowups } from "@/features/followups/services/scheduleFollowups";
import { getDashboardData } from "@/features/dashboard/services/getDashboardData";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";
import { z } from "zod";

export const runtime = "nodejs";

const ScheduleSchema = z.object({
  leadId: z.string().min(1),
  quoteId: z.string().min(1).optional(),
  isUrgent: z.boolean().optional(),
});

export async function GET() {
  const { followups } = await getDashboardData();
  return Response.json(followups);
}

export async function POST(request: Request) {
  try {
    const body = ScheduleSchema.parse(await request.json());
    return jsonOk(await scheduleFollowups(body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
