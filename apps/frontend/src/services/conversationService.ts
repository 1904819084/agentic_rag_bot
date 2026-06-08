import type {
  CreateConversationRequest,
  CreateConversationResponse,
  DeleteConversationResponse,
  ListConversationMessagesResponse,
  ListConversationsResponse,
  UpdateConversationRequest,
  UpdateConversationResponse,
} from '@rag/shared';
import { request } from './http';

export function listConversations(filter: { userId?: string } = {}) {
  return request<ListConversationsResponse>('/conversations', {
    params: filter,
  });
}

export function createConversation(createRequest: CreateConversationRequest) {
  return request<CreateConversationResponse>('/conversations', {
    method: 'POST',
    data: createRequest,
  });
}

export function updateConversationTitle(
  conversationId: string,
  updateRequest: UpdateConversationRequest,
) {
  return request<UpdateConversationResponse>(`/conversations/${conversationId}`, {
    method: 'PATCH',
    data: updateRequest,
  });
}

export function deleteConversation(conversationId: string) {
  return request<DeleteConversationResponse>(`/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}

export function getConversationMessages(conversationId: string) {
  return request<ListConversationMessagesResponse>(`/conversations/${conversationId}/messages`);
}
