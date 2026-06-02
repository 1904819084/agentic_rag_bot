import type { SyncJob } from '@rag/shared';
import { request } from './http';

export function listSyncJobs() {
  return request<{ items: SyncJob[] }>('/sync/jobs');
}

export function triggerFeishuSync() {
  return request<SyncJob>('/sync/feishu', {
    method: 'POST',
  });
}
