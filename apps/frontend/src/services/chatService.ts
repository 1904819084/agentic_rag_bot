import type { ChatAskRequest, ChatAskResponse } from '@rag/shared';
import { request } from './http';

export function askChat(payload: ChatAskRequest) {
  return request<ChatAskResponse>('/chat/ask', {
    method: 'POST',
    data: payload,
  });
}
