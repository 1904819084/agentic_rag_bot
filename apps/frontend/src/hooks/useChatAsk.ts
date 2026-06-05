import useRequest from 'ahooks/es/useRequest';
import { message } from 'antd';
import { askChat } from '../services/chatService';

export function useChatAsk() {
  return useRequest(askChat, {
    manual: true,
    onError: (error) => {
      message.error(error.message || '消息发送失败');
    },
  });
}
