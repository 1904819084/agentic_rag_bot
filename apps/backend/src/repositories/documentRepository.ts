import { Injectable } from '@gulux/gulux';
import type { KnowledgeDocument, KnowledgeDocumentType, RetrievedContext } from '@rag/shared';
import type { ChildChunk, ParentChunk } from '../utils/chunking';
import { PostgresRepository } from './postgres';

@Injectable()
export default class DocumentRepository {
  public constructor(private readonly postgres: PostgresRepository) {}

  public async upsertDocumentWithChunks({
    document,
    parents,
    children,
  }: {
    document: KnowledgeDocument & { metadata?: Record<string, unknown> };
    parents: ParentChunk[];
    children: ChildChunk[];
  }) {
    await this.postgres.query('BEGIN');
    try {
      await this.postgres.query('DELETE FROM child_chunks WHERE doc_id = $1', [document.id]);
      await this.postgres.query('DELETE FROM parent_chunks WHERE doc_id = $1', [document.id]);
      await this.postgres.query(
        `INSERT INTO documents (
          id, source, source_doc_id, document_type, project_key, business_domain, title, url, status,
          parent_chunk_count, child_chunk_count, metadata, updated_at, synced_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          source = EXCLUDED.source,
          source_doc_id = EXCLUDED.source_doc_id,
          document_type = EXCLUDED.document_type,
          project_key = EXCLUDED.project_key,
          business_domain = EXCLUDED.business_domain,
          title = EXCLUDED.title,
          url = EXCLUDED.url,
          status = EXCLUDED.status,
          parent_chunk_count = EXCLUDED.parent_chunk_count,
          child_chunk_count = EXCLUDED.child_chunk_count,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at,
          synced_at = EXCLUDED.synced_at`,
        [
          document.id,
          document.source,
          document.sourceDocId,
          document.documentType ?? 'other',
          document.projectKey ?? null,
          document.businessDomain ?? null,
          document.title,
          document.url ?? null,
          document.status,
          document.parentChunkCount,
          document.childChunkCount,
          JSON.stringify(document.metadata ?? {}),
          document.updatedAt ?? null,
          document.syncedAt ?? null,
        ],
      );

      for (const parent of parents) {
        await this.postgres.query(
          `INSERT INTO parent_chunks (id, doc_id, title, section_path, content, url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            parent.id,
            parent.docId,
            parent.title,
            parent.sectionPath,
            parent.content,
            document.url ?? null,
          ],
        );
      }

      for (const child of children) {
        await this.postgres.query(
          `INSERT INTO child_chunks (id, parent_id, doc_id, title, section_path, content, content_for_embedding, url, embedding_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            child.id,
            child.parentId,
            child.docId,
            child.title,
            child.sectionPath,
            child.content,
            child.contentForEmbedding,
            document.url ?? null,
            child.id,
          ],
        );
      }

      await this.postgres.query('COMMIT');
    } catch (error) {
      await this.postgres.query('ROLLBACK');
      throw error;
    }
  }

  public async listDocuments(): Promise<KnowledgeDocument[]> {
    try {
      const result = await this.postgres.query<{
        id: string;
        source: KnowledgeDocument['source'];
        source_doc_id: string;
        document_type: KnowledgeDocumentType;
        project_key: string | null;
        business_domain: string | null;
        title: string;
        url: string | null;
        status: KnowledgeDocument['status'];
        parent_chunk_count: number;
        child_chunk_count: number;
        updated_at: Date | null;
        synced_at: Date | null;
      }>(
        `SELECT id, source, source_doc_id, document_type, project_key, business_domain, title, url, status, parent_chunk_count, child_chunk_count, updated_at, synced_at
         FROM documents
         ORDER BY synced_at DESC NULLS LAST, created_at DESC
         LIMIT 200`,
      );

      return result.rows.map((row) => ({
        id: row.id,
        source: row.source,
        sourceDocId: row.source_doc_id,
        documentType: row.document_type,
        projectKey: row.project_key ?? undefined,
        businessDomain: row.business_domain ?? undefined,
        title: row.title,
        url: row.url ?? undefined,
        status: row.status,
        parentChunkCount: row.parent_chunk_count,
        childChunkCount: row.child_chunk_count,
        updatedAt: row.updated_at?.toISOString(),
        syncedAt: row.synced_at?.toISOString(),
      }));
    } catch {
      return [];
    }
  }

  public async searchKeyword(
    query: string,
    limit: number,
    options: { userId?: string } = {},
  ): Promise<RetrievedContext[]> {
    const result = await this.postgres.query<{
      id: string;
      parent_id: string;
      doc_id: string;
      title: string;
      section_path: string[];
      content: string;
      url: string | null;
      score: number;
    }>(
      `SELECT child_chunks.id, child_chunks.parent_id, child_chunks.doc_id, child_chunks.title, child_chunks.section_path, child_chunks.content, child_chunks.url,
              ts_rank_cd(to_tsvector('simple', coalesce(child_chunks.title, '') || ' ' || coalesce(child_chunks.content_for_embedding, '')), plainto_tsquery('simple', $1)) AS score
       FROM child_chunks
       JOIN documents ON documents.id = child_chunks.doc_id
       WHERE (
          to_tsvector('simple', coalesce(child_chunks.title, '') || ' ' || coalesce(child_chunks.content_for_embedding, '')) @@ plainto_tsquery('simple', $1)
          OR child_chunks.content_for_embedding ILIKE '%' || $1 || '%'
       )
       AND (
          $3::text IS NULL
          OR documents.metadata -> 'permission_users' IS NULL
          OR documents.metadata -> 'permission_users' ? $3
       )
       ORDER BY score DESC, child_chunks.created_at DESC
       LIMIT $2`,
      [query, limit, options.userId ?? null],
    );

    return result.rows.map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      docId: row.doc_id,
      title: row.title,
      sectionPath: row.section_path,
      content: row.content,
      url: row.url ?? undefined,
      score: row.score,
    }));
  }
}
