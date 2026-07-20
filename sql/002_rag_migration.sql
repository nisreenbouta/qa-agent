-- Drop the HNSW index first (max 2000 dimensions, 3072 exceeds limit)
DROP INDEX IF EXISTS idx_qa_knowledge_embedding;

-- Change embedding column to 3072 dimensions (Google gemini-embedding-001)
ALTER TABLE qa_knowledge ALTER COLUMN embedding TYPE vector(3072);

-- Create match function for pgvector similarity search
create or replace function match_qa_knowledge(
  query_embedding vector(3072),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  source text,
  title text,
  chunk text,
  similarity float
)
language sql stable
as $$
  select
    qa_knowledge.id,
    qa_knowledge.source,
    qa_knowledge.title,
    qa_knowledge.chunk,
    1 - (qa_knowledge.embedding <=> query_embedding) as similarity
  from qa_knowledge
  where 1 - (qa_knowledge.embedding <=> query_embedding) > match_threshold
  order by qa_knowledge.embedding <=> query_embedding
  limit match_count;
$$;
