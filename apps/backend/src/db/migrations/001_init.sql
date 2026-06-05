CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_doc_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  parent_chunk_count INT NOT NULL DEFAULT 0,
  child_chunk_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parent_chunks (
  id TEXT PRIMARY KEY,
  doc_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS child_chunks (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES parent_chunks(id) ON DELETE CASCADE,
  doc_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_chunks_content_fts
  ON child_chunks USING GIN (to_tsvector('simple', coalesce(content, '')));

CREATE INDEX IF NOT EXISTS idx_child_chunks_embedding_hnsw
  ON child_chunks USING hnsw (embedding vector_cosine_ops);

