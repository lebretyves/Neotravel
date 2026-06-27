import { runDemandExtraction } from "@/features/ai-orchestration/services/runDemandExtraction";

export async function POST(request: Request) {
 try {
  const body = await request.json();

  if (!body || typeof body.message !== "string" || body.message.trim().length === 0) {
   return Response.json({ error: "message is required" }, { status: 400 });
  }

  return Response.json(await runDemandExtraction(body.message));
 } catch (error) {
  console.error("[NeoTravel] demand extraction endpoint failed", error);
  return Response.json({ error: "AI extraction failed" }, { status: 500 });
 }
}
