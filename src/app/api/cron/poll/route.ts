import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function GET(request: Request) {
  // Verify cron secret for Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await inngest.send({ name: "app/poll.single-event", data: { eventId: "" } });

  return NextResponse.json({ ok: true, message: "Poll triggered via cron" });
}
