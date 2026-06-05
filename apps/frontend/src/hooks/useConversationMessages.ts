import useRequest from 'ahooks/es/useRequest';
import { message } from 'antd';
import { getConversationMessages } from '../services/conversationService';

export function useConversationMessages(
  conversationId: string | undefined,
  onLoadedConversation?: (conversationId: string) => void,
  onMissingConversation?: () => void,
) {
  return useRequest(() => getConversationMessages(conversationId as string), {
    ready: Boolean(conversationId),
    refreshDeps: [conversationId],
    onSuccess: (response) => {
      onLoadedConversation?.(response.conversation.id);
    },
    onError: (error) => {
      onMissingConversation?.();
      message.warning(error.message || '会话已失效，请重新开始');
    },
  });
}
