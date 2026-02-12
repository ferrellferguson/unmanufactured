import { db } from "@/lib/db";
import { factNodes, memoryHoles, snapshots, sources } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

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

const MEMORY_HOLE_THRESHOLD = 0.8;

export async function detectMemoryHoles(
  eventId: string,
  currentSnapshotId: string,
  modelId: string
) {
  // Get current snapshot's fact nodes
  const currentFacts = await db
    .select()
    .from(factNodes)
    .where(eq(factNodes.snapshotId, currentSnapshotId));

  if (currentFacts.length === 0) return [];

  // Find the previous snapshot for same model
  const previousSnaps = await db
    .select()
    .from(snapshots)
    .where(and(eq(snapshots.eventId, eventId), eq(snapshots.modelId, modelId)))
    .orderBy(desc(snapshots.createdAt))
    .limit(2);

  if (previousSnaps.length < 2) return [];
  const previousSnapshot = previousSnaps[1];

  // Get previous snapshot's fact nodes
  const previousFacts = await db
    .select()
    .from(factNodes)
    .where(eq(factNodes.snapshotId, previousSnapshot.id));

  if (previousFacts.length === 0) return [];

  // Get active sources for this event
  const activeSources = await db
    .select()
    .from(sources)
    .where(and(eq(sources.eventId, eventId), eq(sources.isActive, true)));

  const activeSourceIds = new Set(activeSources.map((s) => s.id));

  // For each previous fact, check if it has a match in current facts
  const holes = [];

  for (const prevFact of previousFacts) {
    if (!prevFact.embedding) continue;

    let bestSimilarity = 0;

    for (const currFact of currentFacts) {
      if (!currFact.embedding) continue;
      const sim = cosineSimilarity(prevFact.embedding, currFact.embedding);
      if (sim > bestSimilarity) bestSimilarity = sim;
    }

    // If no current fact is similar enough, this claim "vanished"
    if (bestSimilarity < MEMORY_HOLE_THRESHOLD) {
      const [hole] = await db
        .insert(memoryHoles)
        .values({
          eventId,
          factNodeId: prevFact.id,
          lastSeenSnapshotId: previousSnapshot.id,
          missingFromSnapshotId: currentSnapshotId,
          similarityScore: bestSimilarity,
        })
        .returning();

      holes.push(hole);
    }
  }

  return holes;
}
