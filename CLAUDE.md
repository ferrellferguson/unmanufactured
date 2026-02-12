# Unmanufactured.org

Narrative drift tracker — polls multiple AI models about the same news event over time and detects when narratives shift without new evidence.

## Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript), Tailwind v4, shadcn/ui
- **Database:** Neon Postgres + pgvector, Drizzle ORM
- **Background Jobs:** Inngest (cron + fan-out pattern)
- **AI:** Vercel AI SDK v6, models: Claude Sonnet 4, GPT-4o, Grok 3, Gemini 2.0 Flash
- **Search Grounding:** Tavily API

## Key Conventions

### AI SDK v6
- Use `maxOutputTokens` (not `maxTokens`)
- `useChat` uses `transport` object (not `api` string)
- Messages use `parts` (not `content`)

### Database
- DB connection uses lazy Proxy pattern to avoid build-time errors when DATABASE_URL isn't set
- Custom `vector(1536)` type for pgvector embedding columns
- Migrations are manual SQL files in `drizzle/` with corresponding runner scripts in `scripts/migrate-XXXX.mjs`
- Migration scripts use `@neondatabase/serverless` directly (see `scripts/migrate-0002.mjs` for pattern)

### Inngest
- Step results are JSON-serialized — Dates become strings. Functions consuming step data must accept `Date | string`.
- Concurrency limit of 2 for poll-single-event

### Adaptive Polling
- Cron runs every 15 minutes but only fans out events that are due
- Polling interval decays with event age: 30min (0-6h) → 2h (6-24h) → 6h (1-3d) → 12h (3-7d) → 24h (7d+)
- 15-minute minimum cooldown between polls
- Logic in `src/lib/polling/intervals.ts`

## Project Structure
```
src/
  app/
    api/              # API routes
    events/           # Event pages (list, detail, new)
    page.tsx          # Landing page (4 sections: hero, how-it-works, features, events list)
  components/ui/      # shadcn/ui components
  lib/
    db/
      index.ts        # Lazy DB connection
      schema.ts       # All tables (events, poll_cycles, snapshots, sources, fact_nodes, drift_scores, memory_holes, chat_messages, search_results, context_rejections)
    ai/               # providers, prompt-builder, embeddings, fact-extractor
    analysis/         # drift detection, memory-hole detection, context-rejection detection
    inngest/
      client.ts       # Inngest client
      functions/      # poll-all-events (cron), poll-single-event (fan-out)
    polling/          # Adaptive polling interval logic
    search/           # Tavily search integration
drizzle/              # SQL migration files (0001_init, 0002_search_results, 0003_adaptive_polling)
scripts/              # Migration runner scripts and utilities
```

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `node scripts/migrate-XXXX.mjs` — Run a specific migration against Neon
- `npm run db:studio` — Open Drizzle Studio
