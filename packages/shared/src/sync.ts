export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type SyncJobType =
  | 'document_upload'
  | 'feishu_full'
  | 'feishu_incremental'
  | 'feishu_permission'
  | 'reindex';

export interface SyncJob {
  id: string;
  type: SyncJobType;
  status: SyncJobStatus;
  message?: string;
  documentCount: number;
  chunkCount: number;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}
