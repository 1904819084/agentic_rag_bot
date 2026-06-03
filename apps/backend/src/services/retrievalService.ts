import { Injectable } from '@gulux/gulux';
import type { RetrievedContext } from '@rag/shared';
import { env } from '../config/env';
import DocumentRepository from '../repositories/documentRepository';
import type { RetrievalSearchOptions } from '../types';
import { combineHybridResults, rerankByQueryOverlap } from '../utils/retrievalRanking';
import EmbeddingService from './embeddingService';

@Injectable()
export default class RetrievalService {
  public constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly documentRepository: DocumentRepository,
  ) {}

  public async search(
    query: string,
    options: RetrievalSearchOptions = {},
  ): Promise<RetrievedContext[]> {
    const topK = env.retrieval.topK;

    if (env.retrieval.provider === 'keyword') {
      return rerankByQueryOverlap(query, await this.searchKeyword(query, topK, options), topK);
    }

    if (env.retrieval.provider === 'vector') {
      return rerankByQueryOverlap(query, await this.searchVector(query, topK, options), topK);
    }

    const [vector, keyword] = await Promise.all([
      this.searchVector(query, topK, options),
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

  private async searchVector(
    query: string,
    limit: number,
    options: RetrievalSearchOptions,
  ): Promise<RetrievedContext[]> {
    try {
      const vector = await this.embeddingService.embedQuery(query);
      return await this.documentRepository.searchVector(vector, limit, options);
    } catch {
      return [];
    }
  }
}
