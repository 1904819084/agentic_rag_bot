import useRequest from 'ahooks/es/useRequest';
import { message } from 'antd';
import { listConversations } from '../services/conversationService';

export function useConversations(params: { userId?: string } = {}) {
  return useRequest(() => listConversations(params), {
    refreshDeps: [params.userId],
    onError: (error) => {
      message.error(error.message || '加载会话列表失败');
    },
  });
}
