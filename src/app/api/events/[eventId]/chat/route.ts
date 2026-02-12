import { db } from "@/lib/db";
import {
  events,
  snapshots,
  driftScores,
  memoryHoles,
  factNodes,
  sources,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const { messages } = await request.json();

  // Gather context for RAG
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  const [recentSnapshots, recentDrift, holes, eventSources] =
    await Promise.all([
      db
        .select({
          modelId: snapshots.modelId,
          responseText: snapshots.responseText,
          createdAt: snapshots.createdAt,
        })
        .from(snapshots)
        .where(eq(snapshots.eventId, eventId))
        .orderBy(desc(snapshots.createdAt))
        .limit(8),

      db
        .select()
        .from(driftScores)
        .where(eq(driftScores.eventId, eventId))
        .orderBy(desc(driftScores.createdAt))
        .limit(8),

      db
        .select({
          id: memoryHoles.id,
          similarityScore: memoryHoles.similarityScore,
          detectedAt: memoryHoles.detectedAt,
          factNodeId: memoryHoles.factNodeId,
        })
        .from(memoryHoles)
        .where(eq(memoryHoles.eventId, eventId)),

      db
        .select({ title: sources.title, url: sources.url, isActive: sources.isActive })
        .from(sources)
        .where(eq(sources.eventId, eventId)),
    ]);

  // Get claims for any memory holes
  const holeFactIds = holes.map((h) => h.factNodeId);
  let vanishedClaims: string[] = [];
  if (holeFactIds.length > 0) {
    const facts = await db
      .select({ claim: factNodes.claim })
      .from(factNodes)
      .where(eq(factNodes.eventId, eventId));
    vanishedClaims = facts
      .filter((f) => holeFactIds.includes(f.claim)) // rough match
      .map((f) => f.claim);
  }

  const systemPrompt = `You are an investigative journalism analyst for Unmanufactured.org — a platform that tracks how AI models narrate news events over time.

## Your Role
- Answer questions about this tracked event factually and precisely
- Cite specific snapshots, drift scores, and sources when making claims
- Flag any suspicious narrative shifts, especially Ghost Pivots (narrative changed without new facts)
- Be direct and analytical, not diplomatic

## Event: ${event.title}
${event.description ?? ""}

## Recent Snapshots (most recent first)
${recentSnapshots.map((s) => `[${s.modelId} @ ${s.createdAt}]\n${s.responseText.slice(0, 500)}...`).join("\n\n---\n\n")}

## Drift Scores (most recent first)
${recentDrift.map((d) => `Drift: ${d.driftMagnitude.toFixed(4)} | Ghost Pivot: ${d.ghostPivot} | ${d.ghostPivotExplanation?.slice(0, 200) ?? "N/A"}`).join("\n")}

## Memory Holes (vanished claims)
${vanishedClaims.length > 0 ? vanishedClaims.join("\n") : "None detected yet."}

## Sources
${eventSources.map((s) => `- ${s.title} (${s.isActive ? "active" : "disabled"})${s.url ? ` — ${s.url}` : ""}`).join("\n")}`;

  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
