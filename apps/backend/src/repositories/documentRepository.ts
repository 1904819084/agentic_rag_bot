import { Injectable } from '@gulux/gulux';
import type { Document, RetrievedContext } from '@rag/shared';
import pgvector from 'pgvector';
import type { ChildChunk, ParentChunk } from '../types';
import { PostgresRepository } from './postgres';

type ChildChunkWithEmbedding = ChildChunk & {
  embedding?: number[];
};

@Injectable()
export default class DocumentRepository {
  public constructor(private readonly postgres: PostgresRepository) {}

  // 更新或插入文档，同时更新或插入父块和子块
  public async upsertDocumentWithChunks({
    document,
    parents,
    children,
  }: {
    document: Document;
    parents: ParentChunk[];
    children: ChildChunkWithEmbedding[];
  }) {
    await this.postgres.transaction(async (client) => {
      await client.query('DELETE FROM child_chunks WHERE doc_id = $1', [document.id]);
      await client.query('DELETE FROM parent_chunks WHERE doc_id = $1', [document.id]);
      await client.query(
        `INSERT INTO documents (
          id, source, source_doc_id, title, source_url, status,
          parent_chunk_count, child_chunk_count, updated_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          source = EXCLUDED.source,
          source_doc_id = EXCLUDED.source_doc_id,
          title = EXCLUDED.title,
          source_url = EXCLUDED.source_url,
          status = EXCLUDED.status,
          parent_chunk_count = EXCLUDED.parent_chunk_count,
          child_chunk_count = EXCLUDED.child_chunk_count,
          updated_at = EXCLUDED.updated_at`,
        [
          document.id,
          document.source,
          document.sourceDocId,
          document.title,
          document.sourceUrl ?? null,
          document.status,
          document.parentChunkCount,
          document.childChunkCount,
          document.updatedAt ?? null,
          document.createdAt,
        ],
      );

      for (const parent of parents) {
        await client.query(
          `INSERT INTO parent_chunks (id, doc_id, content, created_at)
           VALUES ($1, $2, $3, $4)`,
          [parent.id, parent.docId, parent.content, parent.createdAt ?? document.createdAt],
        );
      }

      for (const child of children) {
        await client.query(
          `INSERT INTO child_chunks (id, parent_id, doc_id, content, embedding)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            child.id,
            child.parentId,
            child.docId,
            child.content,
            child.embedding ? pgvector.toSql(child.embedding) : null,
          ],
        );
      }
    });
  }

  public async listDocuments(): Promise<Document[]> {
    try {
      const result = await this.postgres.query<{
        id: string;
        source: Document['source'];
        source_doc_id: string;
        title: string;
        source_url: string | null;
        status: Document['status'];
        parent_chunk_count: number;
        child_chunk_count: number;
        updated_at: Date | null;
        created_at: Date;
      }>(
        `SELECT id, source, source_doc_id, title, source_url, status, parent_chunk_count, child_chunk_count, updated_at, created_at
         FROM documents
         ORDER BY updated_at DESC NULLS LAST, created_at DESC
         LIMIT 200`,
      );

      return result.rows.map((row) => ({
        id: row.id,
        source: row.source,
        sourceDocId: row.source_doc_id,
        title: row.title,
        sourceUrl: row.source_url ?? undefined,
        status: row.status,
        parentChunkCount: row.parent_chunk_count,
        childChunkCount: row.child_chunk_count,
        updatedAt: row.updated_at?.toISOString(),
        createdAt: row.created_at.toISOString(),
      }));
    } catch {
      return [];
    }
  }

  public async searchKeyword(query: string, limit: number): Promise<RetrievedContext[]> {
    const result = await this.postgres.query<{
      id: string;
      parent_id: string;
      doc_id: string;
      title: string;
      content: string;
      source_url: string | null;
      score: number;
    }>(
      `WITH matched_children AS (
         SELECT child_chunks.parent_id,
                child_chunks.doc_id,
                max(ts_rank_cd(to_tsvector('simple', coalesce(child_chunks.content, '')), plainto_tsquery('simple', $1))) AS score,
                max(child_chunks.created_at) AS latest_child_created_at
         FROM child_chunks
         WHERE (
            to_tsvector('simple', coalesce(child_chunks.content, '')) @@ plainto_tsquery('simple', $1)
            OR child_chunks.content ILIKE '%' || $1 || '%'
         )
         GROUP BY child_chunks.parent_id, child_chunks.doc_id
       )
       SELECT parent_chunks.id, matched_children.parent_id, matched_children.doc_id, documents.title, parent_chunks.content, documents.source_url,
              matched_children.score
       FROM matched_children
       JOIN parent_chunks ON parent_chunks.id = matched_children.parent_id
       JOIN documents ON documents.id = matched_children.doc_id
       ORDER BY matched_children.score DESC, matched_children.latest_child_created_at DESC
       LIMIT $2`,
      [query, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      docId: row.doc_id,
      title: row.title,
      content: row.content,
      sourceUrl: row.source_url ?? undefined,
      score: row.score,
    }));
  }

  public async searchVector(vector: number[], limit: number): Promise<RetrievedContext[]> {
    const result = await this.postgres.query<{
      id: string;
      parent_id: string;
      doc_id: string;
      title: string;
      content: string;
      source_url: string | null;
      distance: number;
    }>(
      `WITH nearest_children AS (
         SELECT child_chunks.parent_id,
                child_chunks.doc_id,
                min(child_chunks.embedding <=> $1) AS distance
         FROM child_chunks
         WHERE child_chunks.embedding IS NOT NULL
         GROUP BY child_chunks.parent_id, child_chunks.doc_id
       )
       SELECT parent_chunks.id, nearest_children.parent_id, nearest_children.doc_id, documents.title, parent_chunks.content, documents.source_url,
              nearest_children.distance
       FROM nearest_children
       JOIN parent_chunks ON parent_chunks.id = nearest_children.parent_id
       JOIN documents ON documents.id = nearest_children.doc_id
       ORDER BY nearest_children.distance
       LIMIT $2`,
      [pgvector.toSql(vector), limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      docId: row.doc_id,
      title: row.title,
      content: row.content,
      sourceUrl: row.source_url ?? undefined,
      score: 1 - row.distance,
    }));
  }
}
