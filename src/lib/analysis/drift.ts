import { db } from "@/lib/db";
import { snapshots, driftScores, events } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function computeDriftForSnapshot(
  snapshotId: string,
  eventId: string,
  modelId: string,
  currentEmbedding: number[],
  currentPollCycleSourceIds: string[],
  previousPollCycleSourceIds: string[]
) {
  // Find the previous snapshot for the same model and event
  const previousSnapshots = await db
    .select()
    .from(snapshots)
    .where(and(eq(snapshots.eventId, eventId), eq(snapshots.modelId, modelId)))
    .orderBy(desc(snapshots.createdAt))
    .limit(2);

  // Need at least 2 snapshots (current + previous)
  if (previousSnapshots.length < 2) return null;

  const previousSnapshot = previousSnapshots[1]; // Second most recent
  if (!previousSnapshot.embedding) return null;

  const similarity = cosineSimilarity(
    currentEmbedding,
    previousSnapshot.embedding
  );
  const magnitude = 1.0 - similarity;

  // Get event threshold
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const threshold = event?.driftThreshold ?? 0.05;

  // Check if this is a Ghost Pivot: significant drift with no new sources
  const sourcesChanged =
    JSON.stringify([...currentPollCycleSourceIds].sort()) !==
    JSON.stringify([...previousPollCycleSourceIds].sort());

  const isGhostPivot = magnitude > threshold && !sourcesChanged;

  let ghostPivotExplanation: string | null = null;

  if (isGhostPivot) {
    const currentSnap = previousSnapshots[0];
    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `Two AI-generated summaries of the same event were produced using the EXACT same sources, but the narrative shifted significantly.

PREVIOUS summary (by ${modelId}):
${previousSnapshot.responseText.slice(0, 2000)}

CURRENT summary (by ${modelId}):
${currentSnap.responseText.slice(0, 2000)}

Cosine similarity: ${similarity.toFixed(4)} (drift magnitude: ${magnitude.toFixed(4)})

Analyze: What specifically changed in the narrative? Why is this suspicious given that no new facts were added? Be specific about which claims shifted, appeared, or disappeared.`,
      });
      ghostPivotExplanation = text;
    } catch {
      ghostPivotExplanation = "Failed to generate explanation.";
    }
  }

  const [score] = await db
    .insert(driftScores)
    .values({
      eventId,
      currentSnapshotId: snapshotId,
      previousSnapshotId: previousSnapshot.id,
      cosineSimilarity: similarity,
      driftMagnitude: magnitude,
      ghostPivot: isGhostPivot,
      ghostPivotExplanation,
    })
    .returning();

  return score;
}
