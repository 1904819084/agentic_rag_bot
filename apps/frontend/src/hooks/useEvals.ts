import useRequest from 'ahooks/es/useRequest';
import { message } from 'antd';
import {
  createEvalTask,
  getEvalTaskReport,
  listEvalCases,
  listEvalTasks,
} from '../services/evalService';

export function useEvalCases() {
  return useRequest(listEvalCases, {
    onError: (error) => {
      message.error(error.message || '加载评测数据集失败');
    },
  });
}

export function useEvalTasks() {
  return useRequest(listEvalTasks, {
    onError: (error) => {
      message.error(error.message || '加载评测任务失败');
    },
  });
}

export function useEvalTaskReport(taskId?: string) {
  return useRequest(() => getEvalTaskReport(taskId as string), {
    ready: Boolean(taskId),
    refreshDeps: [taskId],
    onError: (error) => {
      message.error(error.message || '加载评测详情失败');
    },
  });
}

export function useCreateEvalTask() {
  return useRequest(createEvalTask, {
    manual: true,
    onError: (error) => {
      message.error(error.message || '创建评测任务失败');
    },
  });
}
