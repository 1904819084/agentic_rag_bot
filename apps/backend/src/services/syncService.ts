import { Injectable } from '@gulux/gulux';
import type { SyncJob } from '@rag/shared';
import SyncJobRepository from '../repositories/syncJobRepository';
import SyncQueue from '../queues/syncQueue';

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

@Injectable()
export default class SyncService {
  public constructor(
    private readonly syncJobRepository: SyncJobRepository,
    private readonly syncQueue: SyncQueue,
  ) {}

  public listJobs() {
    return this.syncJobRepository.listJobs();
  }

  public async triggerFeishuSync(): Promise<SyncJob> {
    const job: SyncJob = {
      id: createId('sync'),
      type: 'feishu_incremental',
      status: 'pending',
      message: '飞书同步任务已创建。MVP 阶段仅创建任务骨架，后续接入真实文档同步。',
      documentCount: 0,
      chunkCount: 0,
      createdAt: new Date().toISOString(),
    };

    await this.syncJobRepository.createJob(job);

    try {
      await this.syncQueue.addFeishuSyncJob(job.id);
    } catch {
      // Redis not ready should not block API in MVP.
    }

    return job;
  }
}
