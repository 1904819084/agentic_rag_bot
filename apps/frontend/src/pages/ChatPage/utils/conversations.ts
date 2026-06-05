import type { Conversation } from '@rag/shared';

export function mergeConversationList(
  conversations: Conversation[],
  conversation: Conversation,
): Conversation[] {
  return [
    conversation,
    ...conversations.filter((item) => item.id !== conversation.id),
  ];
}
