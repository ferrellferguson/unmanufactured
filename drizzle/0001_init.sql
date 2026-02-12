-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Events table
CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "description" text,
  "prompt_template" text NOT NULL,
  "drift_threshold" real NOT NULL DEFAULT 0.05,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Poll Cycles table
CREATE TABLE IF NOT EXISTS "poll_cycles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "frozen_source_ids" jsonb DEFAULT '[]',
  "started_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp,
  "status" varchar(20) NOT NULL DEFAULT 'running'
);
CREATE INDEX IF NOT EXISTS "poll_cycles_event_id_idx" ON "poll_cycles" ("event_id");

-- Snapshots table
CREATE TABLE IF NOT EXISTS "snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "poll_cycle_id" uuid NOT NULL REFERENCES "poll_cycles"("id") ON DELETE CASCADE,
  "model_id" varchar(100) NOT NULL,
  "model_provider" varchar(50) NOT NULL,
  "prompt_used" text NOT NULL,
  "response_text" text NOT NULL,
  "embedding" vector(1536),
  "token_count" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "snapshots_event_id_idx" ON "snapshots" ("event_id");
CREATE INDEX IF NOT EXISTS "snapshots_poll_cycle_id_idx" ON "snapshots" ("poll_cycle_id");
CREATE INDEX IF NOT EXISTS "snapshots_model_id_idx" ON "snapshots" ("model_id");

-- Sources table
CREATE TABLE IF NOT EXISTS "sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "url" text,
  "title" varchar(500) NOT NULL,
  "content" text NOT NULL,
  "content_hash" varchar(64) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "added_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "sources_event_id_idx" ON "sources" ("event_id");

-- Fact Nodes table
CREATE TABLE IF NOT EXISTS "fact_nodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "snapshot_id" uuid NOT NULL REFERENCES "snapshots"("id") ON DELETE CASCADE,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "claim" text NOT NULL,
  "embedding" vector(1536),
  "confidence" real,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "fact_nodes_snapshot_id_idx" ON "fact_nodes" ("snapshot_id");
CREATE INDEX IF NOT EXISTS "fact_nodes_event_id_idx" ON "fact_nodes" ("event_id");

-- Drift Scores table
CREATE TABLE IF NOT EXISTS "drift_scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "current_snapshot_id" uuid NOT NULL REFERENCES "snapshots"("id") ON DELETE CASCADE,
  "previous_snapshot_id" uuid NOT NULL REFERENCES "snapshots"("id") ON DELETE CASCADE,
  "cosine_similarity" real NOT NULL,
  "drift_magnitude" real NOT NULL,
  "ghost_pivot" boolean NOT NULL DEFAULT false,
  "ghost_pivot_explanation" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "drift_scores_event_id_idx" ON "drift_scores" ("event_id");
CREATE INDEX IF NOT EXISTS "drift_scores_current_snapshot_idx" ON "drift_scores" ("current_snapshot_id");

-- Memory Holes table
CREATE TABLE IF NOT EXISTS "memory_holes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "fact_node_id" uuid NOT NULL REFERENCES "fact_nodes"("id") ON DELETE CASCADE,
  "last_seen_snapshot_id" uuid NOT NULL REFERENCES "snapshots"("id") ON DELETE CASCADE,
  "missing_from_snapshot_id" uuid NOT NULL REFERENCES "snapshots"("id") ON DELETE CASCADE,
  "similarity_score" real NOT NULL,
  "detected_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "memory_holes_event_id_idx" ON "memory_holes" ("event_id");

-- Chat Messages table
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "role" varchar(20) NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "chat_messages_event_id_idx" ON "chat_messages" ("event_id");
