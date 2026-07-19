-- Enable pgvector extension (for Phase 7)
create extension if not exists vector with schema extensions;

-- Test runs
create table if not exists public.test_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  url text not null,
  brief text not null,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  started_at timestamptz default now(),
  finished_at timestamptz,
  summary jsonb,
  plan_json jsonb
);

-- Findings (bugs, observations)
create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.test_runs(id) on delete cascade,
  severity text not null check (severity in ('critical','high','medium','low','info')),
  title text not null,
  description text,
  repro_steps jsonb,
  screenshot_url text,
  source text not null default 'flow' check (source in ('console','network','a11y','visual','flow')),
  created_at timestamptz default now()
);

-- Agent steps (trace / replay log)
create table if not exists public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.test_runs(id) on delete cascade,
  step_index int not null,
  tool_name text,
  tool_input jsonb,
  tool_output jsonb,
  thought text,
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- RAG knowledge base corpus (for Phase 7)
create table if not exists public.qa_knowledge (
  id uuid primary key default gen_random_uuid(),
  source text,
  title text,
  chunk text not null,
  embedding vector(1536)
);

-- Indexes
create index if not exists idx_findings_run_id on public.findings(run_id);
create index if not exists idx_agent_steps_run_id on public.agent_steps(run_id);
create index if not exists idx_test_runs_user_id on public.test_runs(user_id);
create index if not exists idx_qa_knowledge_embedding on public.qa_knowledge
  using hnsw (embedding vector_cosine_ops);
