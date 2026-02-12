-- Add search_query column to events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "search_query" text;

-- Search Results table
CREATE TABLE IF NOT EXISTS "search_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "poll_cycle_id" uuid NOT NULL REFERENCES "poll_cycles"("id") ON DELETE CASCADE,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "query" text NOT NULL,
  "title" varchar(500) NOT NULL,
  "url" text NOT NULL,
  "content" text NOT NULL,
  "score" real NOT NULL,
  "published_date" varchar(50),
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "search_results_poll_cycle_id_idx" ON "search_results" ("poll_cycle_id");
CREATE INDEX IF NOT EXISTS "search_results_event_id_idx" ON "search_results" ("event_id");

-- Context Rejections table
CREATE TABLE IF NOT EXISTS "context_rejections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "snapshot_id" uuid NOT NULL REFERENCES "snapshots"("id") ON DELETE CASCADE,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "search_result_id" uuid NOT NULL REFERENCES "search_results"("id") ON DELETE CASCADE,
  "provided_fact" text NOT NULL,
  "rejected" boolean NOT NULL,
  "similarity_score" real NOT NULL,
  "detected_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "context_rejections_snapshot_id_idx" ON "context_rejections" ("snapshot_id");
CREATE INDEX IF NOT EXISTS "context_rejections_event_id_idx" ON "context_rejections" ("event_id");
