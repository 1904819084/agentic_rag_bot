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

function createDocumentId(sourceDocId: string) {
  const safeSourceDocId = sourceDocId.replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `docx_${safeSourceDocId}`;
}

// 飞书文档提取服务
@Injectable()
export default class DocumentIngestionService {
  public constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly feishuDocxService: FeishuDocxService,
  ) {}

  public async importFeishuDocxDocument(
    input: ImportFeishuDocxDocumentRequest,
  ): Promise<ImportFeishuDocxDocumentResponse> {
    const docx = await this.feishuDocxService.fetchDocxContent(input.url);
    const documentId = createDocumentId(docx.sourceDocId);
    const chunks = chunkPlainText({
      docId: documentId,
      title: docx.title,
      content: docx.content,
    });
    const now = new Date().toISOString();
    const document: KnowledgeDocument = {
      id: documentId,
      source: 'feishu',
      sourceDocId: docx.sourceDocId,
      title: docx.title,
      sourceUrl: docx.sourceUrl,
      status: 'success',
      parentChunkCount: chunks.parents.length,
      childChunkCount: chunks.children.length,
      updatedAt: now,
      createdAt: now,
    };
    const vectors = await this.embeddingService.embedTexts(
      chunks.children.map((chunk) => chunk.content),
    );
    const children = chunks.children.map((chunk, index) => ({
      ...chunk,
      embedding: vectors[index],
    }));

    await this.documentRepository.upsertDocumentWithChunks({
      document,
      parents: chunks.parents,
      children,
    });

    return { document };
  }
}
