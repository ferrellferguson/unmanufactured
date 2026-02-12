import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, sources, snapshots } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateText } from "ai";
import { MODEL_CONFIGS } from "@/lib/ai/providers";
import { buildSynthesisPrompt } from "@/lib/ai/prompt-builder";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const body = await request.json();
  const { activeSourceIds, modelId } = body;

  // Get event
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Get only the specified active sources
  const allSources = await db
    .select()
    .from(sources)
    .where(eq(sources.eventId, eventId));

  const filteredSources = activeSourceIds
    ? allSources.filter((s: typeof allSources[number]) => activeSourceIds.includes(s.id))
    : allSources.filter((s: typeof allSources[number]) => s.isActive);

  // Build prompt with filtered sources
  const prompt = buildSynthesisPrompt(event.promptTemplate, filteredSources);

  // Find model config
  const config = MODEL_CONFIGS.find((m) => m.id === modelId) ?? MODEL_CONFIGS[0];

  const { text } = await generateText({
    model: config.model,
    prompt,
    maxOutputTokens: 2000,
  });

  // Get latest real snapshot for comparison
  const [latestSnapshot] = await db
    .select()
    .from(snapshots)
    .where(
      and(eq(snapshots.eventId, eventId), eq(snapshots.modelId, config.id))
    )
    .orderBy(desc(snapshots.createdAt))
    .limit(1);

  return NextResponse.json({
    synthesizedText: text,
    latestSnapshotText: latestSnapshot?.responseText ?? null,
    modelId: config.id,
    sourcesUsed: filteredSources.length,
  });
}
