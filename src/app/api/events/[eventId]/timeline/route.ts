import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  snapshots,
  driftScores,
  memoryHoles,
  pollCycles,
  searchResults,
  contextRejections,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const [
    eventSnapshots,
    eventDriftScores,
    eventMemoryHoles,
    eventPollCycles,
    eventSearchResults,
    eventContextRejections,
  ] = await Promise.all([
    db
      .select({
        id: snapshots.id,
        modelId: snapshots.modelId,
        modelProvider: snapshots.modelProvider,
        responseText: snapshots.responseText,
        pollCycleId: snapshots.pollCycleId,
        tokenCount: snapshots.tokenCount,
        createdAt: snapshots.createdAt,
      })
      .from(snapshots)
      .where(eq(snapshots.eventId, eventId))
      .orderBy(desc(snapshots.createdAt)),

    db
      .select()
      .from(driftScores)
      .where(eq(driftScores.eventId, eventId))
      .orderBy(desc(driftScores.createdAt)),

    db
      .select({
        id: memoryHoles.id,
        factNodeId: memoryHoles.factNodeId,
        lastSeenSnapshotId: memoryHoles.lastSeenSnapshotId,
        missingFromSnapshotId: memoryHoles.missingFromSnapshotId,
        similarityScore: memoryHoles.similarityScore,
        detectedAt: memoryHoles.detectedAt,
      })
      .from(memoryHoles)
      .where(eq(memoryHoles.eventId, eventId)),

    db
      .select()
      .from(pollCycles)
      .where(eq(pollCycles.eventId, eventId))
      .orderBy(desc(pollCycles.startedAt)),

    db
      .select({
        id: searchResults.id,
        pollCycleId: searchResults.pollCycleId,
        query: searchResults.query,
        title: searchResults.title,
        url: searchResults.url,
        content: searchResults.content,
        score: searchResults.score,
        publishedDate: searchResults.publishedDate,
        createdAt: searchResults.createdAt,
      })
      .from(searchResults)
      .where(eq(searchResults.eventId, eventId))
      .orderBy(desc(searchResults.createdAt)),

    db
      .select({
        id: contextRejections.id,
        snapshotId: contextRejections.snapshotId,
        searchResultId: contextRejections.searchResultId,
        providedFact: contextRejections.providedFact,
        rejected: contextRejections.rejected,
        similarityScore: contextRejections.similarityScore,
        detectedAt: contextRejections.detectedAt,
      })
      .from(contextRejections)
      .where(eq(contextRejections.eventId, eventId)),
  ]);

  return NextResponse.json({
    snapshots: eventSnapshots,
    driftScores: eventDriftScores,
    memoryHoles: eventMemoryHoles,
    pollCycles: eventPollCycles,
    searchResults: eventSearchResults,
    contextRejections: eventContextRejections,
  });
}
