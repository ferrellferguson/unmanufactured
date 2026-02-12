import { inngest } from "../client";
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

export const pollSingleEvent = inngest.createFunction(
  {
    id: "poll-single-event",
    name: "Poll Single Event",
    concurrency: { limit: 2 },
    retries: 2,
  },
  { event: "app/poll.single-event" },
  async ({ event, step }) => {
    const { eventId } = event.data;

    // 1. Fetch event and active sources
    const { eventRecord, activeSources } = await step.run(
      "fetch-event-data",
      async () => {
        const [eventRecord] = await db
          .select()
          .from(events)
          .where(eq(events.id, eventId))
          .limit(1);

        const activeSources = await db
          .select()
          .from(sources)
          .where(
            and(eq(sources.eventId, eventId), eq(sources.isActive, true))
          );

        return { eventRecord, activeSources };
      }
    );

    if (!eventRecord) throw new Error(`Event ${eventId} not found`);

    // 2. Create poll cycle
    const pollCycle = await step.run("create-poll-cycle", async () => {
      const [cycle] = await db
        .insert(pollCycles)
        .values({
          eventId,
          frozenSourceIds: activeSources.map((s) => s.id),
          status: "running",
        })
        .returning();
      return cycle;
    });

    // 3. Get previous poll cycle source IDs for ghost pivot detection
    const previousSourceIds = await step.run(
      "get-previous-sources",
      async () => {
        const previousCycles = await db
          .select()
          .from(pollCycles)
          .where(eq(pollCycles.eventId, eventId))
          .orderBy(pollCycles.startedAt)
          .limit(2);

        if (previousCycles.length < 2) return [];
        return (previousCycles[0].frozenSourceIds as string[]) ?? [];
      }
    );

    // 4. Search grounding — fetch real-time search results
    const searchResultRows = await step.run(
      "search-grounding",
      async () => {
        if (!process.env.TAVILY_API_KEY) return [];

        const searchQuery = eventRecord.searchQuery || eventRecord.title;
        const tavilyResults = await searchForEvent(searchQuery);

        if (tavilyResults.length === 0) return [];

        const rows = await db
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

        return rows;
      }
    );

    // 5. Build prompt
    const prompt = buildPollPrompt(
      eventRecord.promptTemplate,
      activeSources,
      searchResultRows
    );

    // 6. Query all models in parallel
    const results = await Promise.all(
      MODEL_CONFIGS.map((config) =>
        step.run(`query-${config.id}`, async () => {
          try {
            const { text, usage } = await generateText({
              model: config.model,
              prompt,
              maxOutputTokens: 2000,
            });

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

            // Compute drift
            await computeDriftForSnapshot(
              snapshot.id,
              eventId,
              config.id,
              embedding,
              pollCycle.frozenSourceIds as string[],
              previousSourceIds
            );

            // Detect memory holes
            await detectMemoryHoles(eventId, snapshot.id, config.id);

            // Detect context rejections
            if (searchResultRows.length > 0) {
              await detectContextRejection(
                snapshot.id,
                eventId,
                searchResultRows,
                text
              );
            }

            return {
              modelId: config.id,
              snapshotId: snapshot.id,
              success: true,
            };
          } catch (error) {
            return {
              modelId: config.id,
              snapshotId: null,
              success: false,
              error: String(error),
            };
          }
        })
      )
    );

    // 7. Mark poll cycle complete and update event's lastPolledAt
    await step.run("complete-poll-cycle", async () => {
      const now = new Date();
      await db
        .update(pollCycles)
        .set({ status: "completed", completedAt: now })
        .where(eq(pollCycles.id, pollCycle.id));
      await db
        .update(events)
        .set({ lastPolledAt: now })
        .where(eq(events.id, eventId));
    });

    return { pollCycleId: pollCycle.id, results };
  }
);
