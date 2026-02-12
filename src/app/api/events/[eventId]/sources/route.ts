import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const eventSources = await db
    .select()
    .from(sources)
    .where(eq(sources.eventId, eventId))
    .orderBy(sources.addedAt);

  return NextResponse.json(eventSources);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const body = await request.json();
  const { title, url, content } = body;

  if (!title || !content) {
    return NextResponse.json(
      { error: "Title and content are required" },
      { status: 400 }
    );
  }

  const contentHash = createHash("sha256").update(content).digest("hex");

  const [source] = await db
    .insert(sources)
    .values({
      eventId,
      title,
      url,
      content,
      contentHash,
    })
    .returning();

  return NextResponse.json(source, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const body = await request.json();
  const { sourceId, isActive } = body;

  if (!sourceId || typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "sourceId and isActive are required" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(sources)
    .set({ isActive })
    .where(eq(sources.id, sourceId))
    .returning();

  return NextResponse.json(updated);
}
