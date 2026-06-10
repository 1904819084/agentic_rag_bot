import type {
  CreateEvalTaskResponse,
  GetEvalTaskReportResponse,
  ListEvalCasesResponse,
  ListEvalTasksResponse,
} from '@rag/shared';
import { request } from './http';

export function listEvalCases() {
  return request<ListEvalCasesResponse>('/evals/cases');
}

export function listEvalTasks() {
  return request<ListEvalTasksResponse>('/evals/tasks');
}

export function createEvalTask() {
  return request<CreateEvalTaskResponse>('/evals/task', {
    method: 'POST',
  });
}

export function getEvalTaskReport(taskId: string) {
  return request<GetEvalTaskReportResponse>(`/evals/tasks/${encodeURIComponent(taskId)}/report`);
}
