export type DocumentStatus = 'active' | 'deleted' | 'syncing' | 'failed';
export type DocumentSource = 'feishu' | 'manual' | 'upload';
export type KnowledgeDocumentType =
  | 'prd'
  | 'trd'
  | 'review_notes'
  | 'postmortem'
  | 'action_items'
  | 'other';

export interface KnowledgeDocument {
  id: string;
  source: DocumentSource;
  sourceDocId: string;
  documentType?: KnowledgeDocumentType;
  projectKey?: string;
  businessDomain?: string;
  title: string;
  url?: string;
  status: DocumentStatus;
  parentChunkCount: number;
  childChunkCount: number;
  updatedAt?: string;
  syncedAt?: string;
}

export interface ImportFeishuDocxDocumentRequest {
  url: string;
}

export interface ImportFeishuDocxDocumentResponse {
  document: KnowledgeDocument;
}
