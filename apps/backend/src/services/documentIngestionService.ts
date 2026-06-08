import { Injectable } from '@gulux/gulux';
import type {
  Document,
  ImportFeishuDocumentRequest,
  ImportFeishuDocumentResponse,
  ImportLocalFileDocumentResponse,
} from '@rag/shared';
import DocumentRepository from '../repositories/documentRepository';
import type { ParsedDocumentInput } from '../types';
import { chunkPlainText } from '../utils/chunking';
import EmbeddingService from './embeddingService';
import FeishuDocumentService from './feishuDocumentService';
import LocalDocumentService, { type UploadedLocalFile } from './localDocumentService';

function createDocumentId(sourceDocId: string) {
  const safeSourceDocId = sourceDocId.replace(/[^a-zA-Z0-9_-]+/g, '_');
  return safeSourceDocId.startsWith('local_') ? safeSourceDocId : `feishu_${safeSourceDocId}`;
}

// 文档提取服务
@Injectable()
export default class DocumentIngestionService {
  public constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly feishuDocumentService: FeishuDocumentService,
    private readonly localDocumentService: LocalDocumentService,
  ) {}
  
  // 飞书 Docx 和本地上传都会先被解析成纯文本，再进入统一入库流程。
  public async importFeishuDocxDocument(
    importRequest: ImportFeishuDocumentRequest,
  ): Promise<ImportFeishuDocumentResponse> {
    const feishuDocument = await this.feishuDocumentService.fetchDocumentContent(importRequest.url);
    return this.importParsedDocument({
      source: 'feishu',
      sourceDocId: feishuDocument.sourceDocId,
      sourceUrl: feishuDocument.sourceUrl,
      title: feishuDocument.title,
      content: feishuDocument.content,
    });
  }

  public async importLocalFileDocument(
    uploadedFile: UploadedLocalFile,
  ): Promise<ImportLocalFileDocumentResponse> {
    return this.importParsedDocument(
      await this.localDocumentService.parseUploadedFile(uploadedFile),
    );
  }

  // Source-specific adapters end here. Everything below is shared by all document sources.
  private async importParsedDocument(parsedDocument: ParsedDocumentInput) {
    const documentId = createDocumentId(parsedDocument.sourceDocId);
    const chunks = chunkPlainText({
      docId: documentId,
      title: parsedDocument.title,
      content: parsedDocument.content,
    });
    const now = new Date().toISOString();
    const document: Document = {
      id: documentId,
      source: parsedDocument.source,
      sourceDocId: parsedDocument.sourceDocId,
      title: parsedDocument.title,
      sourceUrl: parsedDocument.sourceUrl,
      status: 'success',
      parentChunkCount: chunks.parents.length,
      childChunkCount: chunks.children.length,
      fileName: parsedDocument.metadata?.fileName,
      mimeType: parsedDocument.metadata?.mimeType,
      fileSize: parsedDocument.metadata?.fileSize,
      storageKey: parsedDocument.metadata?.storageKey,
      contentHash: parsedDocument.metadata?.contentHash,
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
