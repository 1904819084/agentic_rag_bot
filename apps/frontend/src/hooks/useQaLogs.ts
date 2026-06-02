import useRequest from 'ahooks/es/useRequest';
import { message } from 'antd';
import { listQaLogs } from '../services/qaService';

export function useQaLogs() {
  return useRequest(listQaLogs, {
    onError: (error) => {
      message.error(error.message || '加载问答日志失败');
    },
  });
}
