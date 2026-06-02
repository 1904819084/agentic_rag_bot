import type {
  ImportFeishuDocxDocumentRequest,
  ImportFeishuDocxDocumentResponse,
  KnowledgeDocument,
} from '@rag/shared';
import { request } from './http';

export function listDocuments() {
  return request<{ items: KnowledgeDocument[] }>('/documents');
}

export function importFeishuDocxDocument(payload: ImportFeishuDocxDocumentRequest) {
  return request<ImportFeishuDocxDocumentResponse>('/documents/import/feishu-docx', {
    method: 'POST',
    data: payload,
  });
}
