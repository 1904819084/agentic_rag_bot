CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_doc_id TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  project_key TEXT,
  business_domain TEXT,
  title TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  parent_chunk_count INT NOT NULL DEFAULT 0,
  child_chunk_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'other';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS project_key TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS business_domain TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS parent_chunks (
  id TEXT PRIMARY KEY,
  doc_id TEXT REFERENCES documents(id),
  title TEXT NOT NULL,
  section_path TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS child_chunks (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES parent_chunks(id),
  doc_id TEXT REFERENCES documents(id),
  title TEXT NOT NULL,
  section_path TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  content_for_embedding TEXT NOT NULL,
  url TEXT,
  embedding vector(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE child_chunks ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE child_chunks DROP COLUMN IF EXISTS embedding_id;

CREATE INDEX IF NOT EXISTS idx_child_chunks_content_fts
  ON child_chunks USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content_for_embedding, '')));

CREATE INDEX IF NOT EXISTS idx_child_chunks_embedding_hnsw
  ON child_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS qa_logs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  channel TEXT NOT NULL,
  user_id TEXT,
  citations JSONB NOT NULL DEFAULT '[]',
  latency_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
