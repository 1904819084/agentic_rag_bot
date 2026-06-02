import useRequest from 'ahooks/es/useRequest';
import { message } from 'antd';
import { askQuestion } from '../services/qaService';

export function useAskQuestion() {
  return useRequest(askQuestion, {
    manual: true,
    onError: (error) => {
      message.error(error.message || '问答请求失败');
    },
  });
}
