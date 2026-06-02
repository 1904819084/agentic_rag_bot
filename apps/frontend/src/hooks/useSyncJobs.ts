import useRequest from 'ahooks/es/useRequest';
import { message } from 'antd';
import { listSyncJobs, triggerFeishuSync } from '../services/syncService';

export function useSyncJobs() {
  return useRequest(listSyncJobs, {
    onError: (error) => {
      message.error(error.message || '加载同步任务失败');
    },
  });
}

export function useTriggerFeishuSync(onSuccess?: () => void) {
  return useRequest(triggerFeishuSync, {
    manual: true,
    onSuccess: () => {
      message.success('已创建飞书同步任务');
      onSuccess?.();
    },
    onError: (error) => {
      message.error(error.message || '创建同步任务失败');
    },
  });
}
