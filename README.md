# AI QA Agent

An autonomous agent that tests websites the way a QA engineer would — using LLMs, RAG, MCP, and Playwright.

## How it works

1. Paste a URL and plain-English testing brief
2. The agent plans test cases, pulling in QA knowledge from a vector database (WCAG, OWASP, bug patterns)
3. It drives a real browser through Playwright MCP — clicking, typing, taking screenshots
4. It observes console logs, network errors, and accessibility violations
5. A critic agent reviews findings for false positives
6. A structured report is produced with severity, repro steps, and screenshots

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend + API | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind v4 + shadcn/ui |
| Agent framework | Vercel AI SDK v6 |
| LLM | Google Gemini 2.5 Flash |
| Browser automation | Playwright MCP (Microsoft) |
| Database + Auth | Supabase (Postgres + pgvector) |
| Vector search | pgvector (HNSW index on qa_knowledge) |
| Schemas | Zod |

## Getting started

```bash
npm install
cp .env.example .env.local
# Add your API keys to .env.local:
# - GOOGLE_GENERATIVE_AI_API_KEY
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY

npm run dev
```

### Database setup

Run `sql/001_schema.sql` and `sql/002_rag_migration.sql` in your Supabase SQL editor to create the schema and pgvector match function.

Then ingest the QA knowledge corpus:

```bash
npx tsx scripts/ingest-knowledge.ts
```

### Supabase Realtime

For the live tool activity timeline, enable Realtime on the `agent_steps` table in your Supabase dashboard (Database → Replication).

## Project structure

```
app/
  api/chat/         — Agent route: plan → execute → summarize → critic
  chat/             — Chat UI with Realtime timeline panel
  runs/[id]/        — Structured report page with markdown export
lib/
  types.ts          — Zod schemas (TestPlan, BugReport, Analysis)
  db/queries.ts     — Supabase CRUD for runs, findings, steps
  supabase.ts       — Admin client (service role)
knowledge/          — QA corpus (WCAG, OWASP, bug patterns, etc.)
scripts/
  ingest-knowledge.ts  — Chunk, embed, and insert knowledge corpus
sql/
  001_schema.sql    — Core schema + match function
  002_rag_migration.sql  — pgvector migration for existing DBs
```

## API

- `POST /api/chat` — Main agent endpoint (streams via `toUIMessageStreamResponse`)
- `GET /api/runs/[id]/export` — Download report as Markdown
- `GET /api/screenshot?file=name.png` — Serve local screenshots

## Tools available to the agent

- **Browser tools** (via Playwright MCP): navigate, click, type, screenshot, evaluate, etc.
- **`retrieve_qa_knowledge`**: vector search over WCAG, OWASP, bug pattern docs
- **`check_url_health`**: HTTP status, response time, security headers
- **`check_ssl_cert`**: SSL/TLS domain check

## Pipeline

1. **Planner** — `generateObject` + `TestPlanSchema` → structured test plan
2. **Executor** — `streamText` with browser tools, RAG retrieval, and URL checks
3. **Summarizer** — `generateObject` + `AnalysisSchema` → structured findings
4. **Critic** — reviews findings, rejects false positives and duplicates
