import type {
  Document,
  ImportFeishuDocumentRequest,
  ImportFeishuDocumentResponse,
  ImportLocalFileDocumentResponse,
} from '@rag/shared';
import { request } from './http';

export function listDocuments() {
  return request<{ items: Document[] }>('/documents');
}

export function importFeishuDocxDocument(importRequest: ImportFeishuDocumentRequest) {
  return request<ImportFeishuDocumentResponse>('/documents/import/feishu-docx', {
    method: 'POST',
    data: importRequest,
  });
}

export function importLocalFileDocument(documentFile: File) {
  const formData = new FormData();
  formData.append('file', documentFile);

  return request<ImportLocalFileDocumentResponse>('/documents/import/file', {
    method: 'POST',
    data: formData,
  });
}
