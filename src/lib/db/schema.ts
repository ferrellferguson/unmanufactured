import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  real,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Custom pgvector column type
import { customType } from "drizzle-orm/pg-core";

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === "string") return JSON.parse(value);
    return value as number[];
  },
});

// ─── EVENTS ───────────────────────────────────────────
export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  promptTemplate: text("prompt_template").notNull(),
  searchQuery: text("search_query"), // optional override for Tavily search query
  driftThreshold: real("drift_threshold").default(0.05).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, paused, archived
  lastPolledAt: timestamp("last_polled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventsRelations = relations(events, ({ many }) => ({
  pollCycles: many(pollCycles),
  sources: many(sources),
  snapshots: many(snapshots),
  searchResults: many(searchResults),
  contextRejections: many(contextRejections),
}));

// ─── POLL CYCLES ──────────────────────────────────────
export const pollCycles = pgTable(
  "poll_cycles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    frozenSourceIds: jsonb("frozen_source_ids").$type<string[]>().default([]),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    status: varchar("status", { length: 20 }).default("running").notNull(),
  },
  (table) => [index("poll_cycles_event_id_idx").on(table.eventId)]
);

export const pollCyclesRelations = relations(pollCycles, ({ one, many }) => ({
  event: one(events, {
    fields: [pollCycles.eventId],
    references: [events.id],
  }),
  snapshots: many(snapshots),
}));

// ─── SNAPSHOTS ────────────────────────────────────────
export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    pollCycleId: uuid("poll_cycle_id")
      .references(() => pollCycles.id, { onDelete: "cascade" })
      .notNull(),
    modelId: varchar("model_id", { length: 100 }).notNull(), // e.g. "claude-3-5-sonnet"
    modelProvider: varchar("model_provider", { length: 50 }).notNull(), // anthropic, openai, xai, google
    promptUsed: text("prompt_used").notNull(),
    responseText: text("response_text").notNull(),
    embedding: vector("embedding"),
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("snapshots_event_id_idx").on(table.eventId),
    index("snapshots_poll_cycle_id_idx").on(table.pollCycleId),
    index("snapshots_model_id_idx").on(table.modelId),
  ]
);

export const snapshotsRelations = relations(snapshots, ({ one, many }) => ({
  event: one(events, {
    fields: [snapshots.eventId],
    references: [events.id],
  }),
  pollCycle: one(pollCycles, {
    fields: [snapshots.pollCycleId],
    references: [pollCycles.id],
  }),
  factNodes: many(factNodes),
  driftScoresAsCurrent: many(driftScores, { relationName: "currentSnapshot" }),
  driftScoresAsPrevious: many(driftScores, {
    relationName: "previousSnapshot",
  }),
}));

// ─── SOURCES ──────────────────────────────────────────
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    url: text("url"),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => [index("sources_event_id_idx").on(table.eventId)]
);

export const sourcesRelations = relations(sources, ({ one }) => ({
  event: one(events, {
    fields: [sources.eventId],
    references: [events.id],
  }),
}));

// ─── FACT NODES ───────────────────────────────────────
export const factNodes = pgTable(
  "fact_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snapshotId: uuid("snapshot_id")
      .references(() => snapshots.id, { onDelete: "cascade" })
      .notNull(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    claim: text("claim").notNull(),
    embedding: vector("embedding"),
    confidence: real("confidence"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("fact_nodes_snapshot_id_idx").on(table.snapshotId),
    index("fact_nodes_event_id_idx").on(table.eventId),
  ]
);

export const factNodesRelations = relations(factNodes, ({ one }) => ({
  snapshot: one(snapshots, {
    fields: [factNodes.snapshotId],
    references: [snapshots.id],
  }),
  event: one(events, {
    fields: [factNodes.eventId],
    references: [events.id],
  }),
}));

// ─── DRIFT SCORES ─────────────────────────────────────
export const driftScores = pgTable(
  "drift_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    currentSnapshotId: uuid("current_snapshot_id")
      .references(() => snapshots.id, { onDelete: "cascade" })
      .notNull(),
    previousSnapshotId: uuid("previous_snapshot_id")
      .references(() => snapshots.id, { onDelete: "cascade" })
      .notNull(),
    cosineSimilarity: real("cosine_similarity").notNull(),
    driftMagnitude: real("drift_magnitude").notNull(),
    ghostPivot: boolean("ghost_pivot").default(false).notNull(),
    ghostPivotExplanation: text("ghost_pivot_explanation"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("drift_scores_event_id_idx").on(table.eventId),
    index("drift_scores_current_snapshot_idx").on(table.currentSnapshotId),
  ]
);

export const driftScoresRelations = relations(driftScores, ({ one }) => ({
  event: one(events, {
    fields: [driftScores.eventId],
    references: [events.id],
  }),
  currentSnapshot: one(snapshots, {
    fields: [driftScores.currentSnapshotId],
    references: [snapshots.id],
    relationName: "currentSnapshot",
  }),
  previousSnapshot: one(snapshots, {
    fields: [driftScores.previousSnapshotId],
    references: [snapshots.id],
    relationName: "previousSnapshot",
  }),
}));

// ─── MEMORY HOLES ─────────────────────────────────────
export const memoryHoles = pgTable(
  "memory_holes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    factNodeId: uuid("fact_node_id")
      .references(() => factNodes.id, { onDelete: "cascade" })
      .notNull(),
    lastSeenSnapshotId: uuid("last_seen_snapshot_id")
      .references(() => snapshots.id, { onDelete: "cascade" })
      .notNull(),
    missingFromSnapshotId: uuid("missing_from_snapshot_id")
      .references(() => snapshots.id, { onDelete: "cascade" })
      .notNull(),
    similarityScore: real("similarity_score").notNull(),
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
  },
  (table) => [index("memory_holes_event_id_idx").on(table.eventId)]
);

// ─── SEARCH RESULTS ──────────────────────────────────
export const searchResults = pgTable(
  "search_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pollCycleId: uuid("poll_cycle_id")
      .references(() => pollCycles.id, { onDelete: "cascade" })
      .notNull(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    query: text("query").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    url: text("url").notNull(),
    content: text("content").notNull(),
    score: real("score").notNull(),
    publishedDate: varchar("published_date", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("search_results_poll_cycle_id_idx").on(table.pollCycleId),
    index("search_results_event_id_idx").on(table.eventId),
  ]
);

export const searchResultsRelations = relations(searchResults, ({ one }) => ({
  pollCycle: one(pollCycles, {
    fields: [searchResults.pollCycleId],
    references: [pollCycles.id],
  }),
  event: one(events, {
    fields: [searchResults.eventId],
    references: [events.id],
  }),
}));

// ─── CONTEXT REJECTIONS ──────────────────────────────
export const contextRejections = pgTable(
  "context_rejections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snapshotId: uuid("snapshot_id")
      .references(() => snapshots.id, { onDelete: "cascade" })
      .notNull(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    searchResultId: uuid("search_result_id")
      .references(() => searchResults.id, { onDelete: "cascade" })
      .notNull(),
    providedFact: text("provided_fact").notNull(),
    rejected: boolean("rejected").notNull(),
    similarityScore: real("similarity_score").notNull(),
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
  },
  (table) => [
    index("context_rejections_snapshot_id_idx").on(table.snapshotId),
    index("context_rejections_event_id_idx").on(table.eventId),
  ]
);

export const contextRejectionsRelations = relations(
  contextRejections,
  ({ one }) => ({
    snapshot: one(snapshots, {
      fields: [contextRejections.snapshotId],
      references: [snapshots.id],
    }),
    event: one(events, {
      fields: [contextRejections.eventId],
      references: [events.id],
    }),
    searchResult: one(searchResults, {
      fields: [contextRejections.searchResultId],
      references: [searchResults.id],
    }),
  })
);

// ─── FEEDBACK ─────────────────────────────────────────
export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  message: text("message").notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;

// ─── CHAT MESSAGES ────────────────────────────────────
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 20 }).notNull(), // user, assistant
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("chat_messages_event_id_idx").on(table.eventId)]
);

// ─── TYPE EXPORTS ─────────────────────────────────────
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type DriftScore = typeof driftScores.$inferSelect;
export type FactNode = typeof factNodes.$inferSelect;
export type MemoryHole = typeof memoryHoles.$inferSelect;
export type PollCycle = typeof pollCycles.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type SearchResult = typeof searchResults.$inferSelect;
export type ContextRejection = typeof contextRejections.$inferSelect;
