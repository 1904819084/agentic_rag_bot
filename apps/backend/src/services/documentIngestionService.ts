import { Injectable } from '@gulux/gulux';
import type {
  ImportFeishuDocxDocumentRequest,
  ImportFeishuDocxDocumentResponse,
  KnowledgeDocument,
} from '@rag/shared';
import DocumentRepository from '../repositories/documentRepository';
import { chunkPlainText } from '../utils/chunking';
import EmbeddingService from './embeddingService';
import FeishuDocxService from './feishuDocxService';
import MilvusIndexService from './milvusIndexService';

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

@Injectable()
export default class DocumentIngestionService {
  public constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly milvusIndexService: MilvusIndexService,
    private readonly feishuDocxService: FeishuDocxService,
  ) {}

  public async importFeishuDocxDocument(
    input: ImportFeishuDocxDocumentRequest,
  ): Promise<ImportFeishuDocxDocumentResponse> {
    const docx = await this.feishuDocxService.fetchDocxContent(input.url);
    const documentId = createId('docx');
    const chunks = chunkPlainText({
      docId: documentId,
      title: docx.title,
      content: docx.content,
    });
    const now = new Date().toISOString();
    const document: KnowledgeDocument & { metadata: Record<string, unknown> } = {
      id: documentId,
      source: 'feishu',
      sourceDocId: docx.sourceDocId,
      documentType: 'other',
      title: docx.title,
      url: docx.url,
      status: 'active',
      parentChunkCount: chunks.parents.length,
      childChunkCount: chunks.children.length,
      updatedAt: now,
      syncedAt: now,
      metadata: {
        ingestion: 'feishu_docx_url',
      },
    };

    await this.documentRepository.upsertDocumentWithChunks({
      document,
      parents: chunks.parents,
      children: chunks.children,
    });

    try {
      const vectors = await this.embeddingService.embedTexts(
        chunks.children.map((chunk) => chunk.contentForEmbedding),
      );
      await this.milvusIndexService.upsertChunks(chunks.children, vectors, docx.url);
    } catch {
      // Keyword retrieval remains available even when vector indexing is not configured.
    }

    return { document };
  }
}
