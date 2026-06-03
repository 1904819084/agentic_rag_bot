import { Injectable } from '@gulux/gulux';
import type { RetrievedContext } from '@rag/shared';
import { env } from '../config/env';
import { MilvusClientProvider } from '../infra/milvusClient';
import DocumentRepository from '../repositories/documentRepository';
import type { RetrievalSearchOptions } from '../types';
import { combineHybridResults, rerankByQueryOverlap } from '../utils/retrievalRanking';
import EmbeddingService from './embeddingService';
import MilvusIndexService from './milvusIndexService';

@Injectable()
export default class RetrievalService {
  public constructor(
    private readonly milvus: MilvusClientProvider,
    private readonly embeddingService: EmbeddingService,
    private readonly documentRepository: DocumentRepository,
    private readonly milvusIndexService: MilvusIndexService,
  ) {}

  public async search(
    query: string,
    options: RetrievalSearchOptions = {},
  ): Promise<RetrievedContext[]> {
    const topK = env.retrieval.topK;

    if (env.retrieval.provider === 'keyword') {
      return rerankByQueryOverlap(query, await this.searchKeyword(query, topK, options), topK);
    }

    if (env.retrieval.provider === 'milvus') {
      return rerankByQueryOverlap(query, await this.searchMilvus(query, topK, options), topK);
    }

    const [vector, keyword] = await Promise.all([
      this.searchMilvus(query, topK, options),
      this.searchKeyword(query, topK, options),
    ]);
    return rerankByQueryOverlap(
      query,
      combineHybridResults({ vector, keyword, limit: topK }),
      topK,
    );
  }

  private async searchKeyword(query: string, limit: number, options: RetrievalSearchOptions) {
    try {
      return await this.documentRepository.searchKeyword(query, limit, options);
    } catch {
      return [];
    }
  }

  private async searchMilvus(
    query: string,
    limit: number,
    _options: RetrievalSearchOptions,
  ): Promise<RetrievedContext[]> {
    try {
      await this.milvusIndexService.ensureCollection();
      const vector = await this.embeddingService.embedQuery(query);
      const client = this.milvus.getClient();
      const result = await client.search({
        collection_name: this.milvus.collectionName,
        data: vector,
        anns_field: 'embedding',
        limit,
        metric_type: 'COSINE',
        output_fields: ['id', 'parent_id', 'doc_id', 'title', 'section_path', 'content', 'url'],
      } as never);

      const rows = Array.isArray((result as { results?: unknown[] }).results)
        ? (result as { results: Record<string, unknown>[] }).results
        : [];

      return rows.map((row, index) => ({
        id: String(row.id ?? `milvus-${index}`),
        parentId: typeof row.parent_id === 'string' ? row.parent_id : undefined,
        docId: typeof row.doc_id === 'string' ? row.doc_id : undefined,
        title: typeof row.title === 'string' ? row.title : '未命名资料',
        sectionPath: Array.isArray(row.section_path)
          ? row.section_path.map(String)
          : typeof row.section_path === 'string'
            ? row.section_path.split(' > ').filter(Boolean)
            : undefined,
        content: typeof row.content === 'string' ? row.content : '',
        url: typeof row.url === 'string' ? row.url : undefined,
        score: typeof row.score === 'number' ? row.score : undefined,
      }));
    } catch {
      return [];
    }
  }
}
