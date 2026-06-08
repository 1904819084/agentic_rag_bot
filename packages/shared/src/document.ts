export type DocumentStatus = 'success' | 'deleted' | 'failed';
export type DocumentSource = 'feishu' | 'local_file';

// 文档元信息
export interface Document {
  id: string;
  source: DocumentSource;
  sourceDocId: string; // 文档在飞书中的 ID
  title: string;
  sourceUrl?: string;
  status: DocumentStatus;
  parentChunkCount: number;
  childChunkCount: number;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  storageKey?: string;
  contentHash?: string;
  importError?: string;
  updatedAt?: string;
  createdAt: string;
}

export interface ImportFeishuDocumentRequest {
  url: string;
}

export interface ImportFeishuDocumentResponse {
  document: Document;
}

export interface ImportLocalFileDocumentResponse {
  document: Document;
}
