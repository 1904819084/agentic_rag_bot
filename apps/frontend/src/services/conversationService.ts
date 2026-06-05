import type {
  CreateConversationRequest,
  CreateConversationResponse,
  ListConversationMessagesResponse,
  ListConversationsResponse,
} from '@rag/shared';
import { request } from './http';

export function listConversations(params: { userId?: string } = {}) {
  return request<ListConversationsResponse>('/conversations', {
    params,
  });
}

export function createConversation(payload: CreateConversationRequest) {
  return request<CreateConversationResponse>('/conversations', {
    method: 'POST',
    data: payload,
  });
}

export function getConversationMessages(conversationId: string) {
  return request<ListConversationMessagesResponse>(`/conversations/${conversationId}/messages`);
}
