import { Injectable } from '@gulux/gulux';
import type {
  Document,
  ImportFeishuDocumentRequest,
  ImportFeishuDocumentResponse,
} from '@rag/shared';
import DocumentRepository from '../repositories/documentRepository';
import { chunkPlainText } from '../utils/chunking';
import EmbeddingService from './embeddingService';
import FeishuDocumentService from './feishuDocumentService';

function createDocumentId(sourceDocId: string) {
  const safeSourceDocId = sourceDocId.replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `feishu_${safeSourceDocId}`;
}

// 飞书文档提取服务
@Injectable()
export default class DocumentIngestionService {
  public constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly feishuDocumentService: FeishuDocumentService,
  ) {}
  
  // 从飞书文档 URL 提取文档内容并存储到数据库
  public async importFeishuDocxDocument(
    input: ImportFeishuDocumentRequest,
  ): Promise<ImportFeishuDocumentResponse> {
    const feishuDocument = await this.feishuDocumentService.fetchDocumentContent(input.url);
    const documentId = createDocumentId(feishuDocument.sourceDocId);
    const chunks = chunkPlainText({
      docId: documentId,
      title: feishuDocument.title,
      content: feishuDocument.content,
    });
    const now = new Date().toISOString();
    const document: Document = {
      id: documentId,
      source: 'feishu',
      sourceDocId: feishuDocument.sourceDocId,
      title: feishuDocument.title,
      sourceUrl: feishuDocument.sourceUrl,
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
