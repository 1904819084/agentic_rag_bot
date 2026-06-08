import useRequest from 'ahooks/es/useRequest';
import { message } from 'antd';
import { listConversations } from '../services/conversationService';

export function useConversations(conversationFilter: { userId?: string } = {}) {
  return useRequest(() => listConversations(conversationFilter), {
    refreshDeps: [conversationFilter.userId],
    onError: (error) => {
      message.error(error.message || '加载会话列表失败');
    },
  });
}
