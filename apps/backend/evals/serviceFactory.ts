import { PostgresRepository } from '../src/repositories/postgres';
import DocumentRepository from '../src/repositories/documentRepository';
import EmbeddingService from '../src/services/embeddingService';
import RagGraphService from '../src/services/ragGraphService';
import RetrievalService from '../src/services/retrievalService';

export function createEvalRagGraphService() {
  const postgresRepository = new PostgresRepository();
  const documentRepository = new DocumentRepository(postgresRepository);
  const embeddingService = new EmbeddingService();
  const retrievalService = new RetrievalService(embeddingService, documentRepository);

  return new RagGraphService(retrievalService);
}
