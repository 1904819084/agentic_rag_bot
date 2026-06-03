export type DocumentStatus = 'success' | 'deleted' | 'failed';
export type DocumentSource = 'feishu';

// 文档元信息
export interface KnowledgeDocument {
  id: string;
  source: DocumentSource;
  sourceDocId: string; // 文档在飞书中的 ID
  title: string;
  sourceUrl?: string;
  status: DocumentStatus;
  parentChunkCount: number;
  childChunkCount: number;
  updatedAt?: string;
  createdAt: string;
}

export interface ImportFeishuDocxDocumentRequest {
  url: string;
}

export interface ImportFeishuDocxDocumentResponse {
  document: KnowledgeDocument;
}
