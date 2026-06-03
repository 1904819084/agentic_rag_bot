import type {
  Document,
  ImportFeishuDocumentRequest,
  ImportFeishuDocumentResponse,
} from '@rag/shared';
import { request } from './http';

export function listDocuments() {
  return request<{ items: Document[] }>('/documents');
}

export function importFeishuDocxDocument(payload: ImportFeishuDocumentRequest) {
  return request<ImportFeishuDocumentResponse>('/documents/import/feishu-docx', {
    method: 'POST',
    data: payload,
  });
}
