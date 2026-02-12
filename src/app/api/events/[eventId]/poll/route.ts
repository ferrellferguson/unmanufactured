import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  // Verify event exists
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Trigger Inngest function
  await inngest.send({
    name: "app/poll.single-event",
    data: { eventId },
  });

  return NextResponse.json({
    ok: true,
    message: `Poll triggered for "${event.title}"`,
  });
}
