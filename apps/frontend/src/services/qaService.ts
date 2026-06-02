import type { AskQuestionRequest, AskQuestionResponse, QaLog } from '@rag/shared';
import { request } from './http';

export function askQuestion(payload: AskQuestionRequest) {
  return request<AskQuestionResponse>('/qa/ask', {
    method: 'POST',
    data: payload,
  });
}

export function listQaLogs() {
  return request<{ items: QaLog[] }>('/qa/logs');
}
