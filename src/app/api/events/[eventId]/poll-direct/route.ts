import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  events,
  pollCycles,
  snapshots,
  sources,
  factNodes,
  searchResults,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateText } from "ai";
import { MODEL_CONFIGS } from "@/lib/ai/providers";
import { buildPollPrompt } from "@/lib/ai/prompt-builder";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { extractFacts } from "@/lib/ai/fact-extractor";
import { computeDriftForSnapshot } from "@/lib/analysis/drift";
import { detectMemoryHoles } from "@/lib/analysis/memory-hole";
import { searchForEvent } from "@/lib/search/tavily";
import { detectContextRejection } from "@/lib/analysis/context-rejection";

export const maxDuration = 120; // Allow up to 2 minutes

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  // 1. Fetch event and active sources
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const activeSources = await db
    .select()
    .from(sources)
    .where(and(eq(sources.eventId, eventId), eq(sources.isActive, true)));

  // 2. Create poll cycle
  const [pollCycle] = await db
    .insert(pollCycles)
    .values({
      eventId,
      frozenSourceIds: activeSources.map((s) => s.id),
      status: "running",
    })
    .returning();

  // 3. Search grounding — fetch real-time search results
  let searchResultRows: typeof searchResults.$inferSelect[] = [];
  const searchQuery = event.searchQuery || event.title;

  if (process.env.TAVILY_API_KEY) {
    try {
      console.log(`[Poll] Searching Tavily for: "${searchQuery}"`);
      const tavilyResults = await searchForEvent(searchQuery);
      console.log(`[Poll] Got ${tavilyResults.length} search results`);

      if (tavilyResults.length > 0) {
        searchResultRows = await db
          .insert(searchResults)
          .values(
            tavilyResults.map((r) => ({
              pollCycleId: pollCycle.id,
              eventId,
              query: searchQuery,
              title: r.title,
              url: r.url,
              content: r.content,
              score: r.score,
              publishedDate: r.publishedDate,
            }))
          )
          .returning();
      }
    } catch (e) {
      console.error("[Poll] Tavily search failed:", e);
    }
  }

  // 4. Build prompt with both manual sources and search results
  const prompt = buildPollPrompt(
    event.promptTemplate,
    activeSources,
    searchResultRows
  );

  // 5. Query all models in parallel
  const results = await Promise.allSettled(
    MODEL_CONFIGS.map(async (config) => {
      console.log(`[Poll] Querying ${config.id}...`);

      const { text, usage } = await generateText({
        model: config.model,
        prompt,
        maxOutputTokens: 2000,
      });

      console.log(`[Poll] ${config.id} responded (${text.length} chars)`);

      // Store snapshot
      const [snapshot] = await db
        .insert(snapshots)
        .values({
          eventId,
          pollCycleId: pollCycle.id,
          modelId: config.id,
          modelProvider: config.provider,
          promptUsed: prompt,
          responseText: text,
          tokenCount: usage?.totalTokens,
        })
        .returning();

      // Generate embedding
      const embedding = await generateEmbedding(text);
      await db
        .update(snapshots)
        .set({ embedding })
        .where(eq(snapshots.id, snapshot.id));

      // Extract facts and store with embeddings
      try {
        const facts = await extractFacts(text);
        for (const fact of facts) {
          const factEmbedding = await generateEmbedding(fact.claim);
          await db.insert(factNodes).values({
            snapshotId: snapshot.id,
            eventId,
            claim: fact.claim,
            embedding: factEmbedding,
            confidence: fact.confidence,
          });
        }
      } catch (e) {
        console.error(`[Poll] Fact extraction failed for ${config.id}:`, e);
      }

      // Compute drift
      try {
        await computeDriftForSnapshot(
          snapshot.id,
          eventId,
          config.id,
          embedding,
          pollCycle.frozenSourceIds as string[],
          []
        );
      } catch (e) {
        console.error(`[Poll] Drift computation failed for ${config.id}:`, e);
      }

      // Detect memory holes
      try {
        await detectMemoryHoles(eventId, snapshot.id, config.id);
      } catch (e) {
        console.error(`[Poll] Memory hole detection failed for ${config.id}:`, e);
      }

      // Detect context rejections
      if (searchResultRows.length > 0) {
        try {
          await detectContextRejection(
            snapshot.id,
            eventId,
            searchResultRows,
            text
          );
        } catch (e) {
          console.error(`[Poll] Context rejection detection failed for ${config.id}:`, e);
        }
      }

      return {
        modelId: config.id,
        snapshotId: snapshot.id,
        responseLength: text.length,
      };
    })
  );

  // 6. Mark poll cycle complete
  await db
    .update(pollCycles)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(pollCycles.id, pollCycle.id));

  const summary = results.map((r, i) => ({
    model: MODEL_CONFIGS[i].id,
    status: r.status,
    ...(r.status === "fulfilled" ? r.value : { error: String((r as PromiseRejectedResult).reason) }),
  }));

  console.log("[Poll] Complete:", JSON.stringify(summary, null, 2));

  return NextResponse.json({
    pollCycleId: pollCycle.id,
    searchResultCount: searchResultRows.length,
    results: summary,
  });
}
