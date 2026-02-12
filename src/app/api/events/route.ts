import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const allEvents = await db
    .select()
    .from(events)
    .orderBy(desc(events.createdAt));

  return NextResponse.json(allEvents);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, promptTemplate, searchQuery, driftThreshold } = body;

  if (!title || !promptTemplate) {
    return NextResponse.json(
      { error: "Title and prompt template are required" },
      { status: 400 }
    );
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const [event] = await db
    .insert(events)
    .values({
      title,
      slug,
      description,
      promptTemplate,
      searchQuery: searchQuery || null,
      driftThreshold: driftThreshold ?? 0.05,
    })
    .returning();

  return NextResponse.json(event, { status: 201 });
}
