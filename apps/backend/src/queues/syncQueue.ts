import { Injectable } from '@gulux/gulux';
import { Queue } from 'bullmq';
import { RedisConnection } from '../infra/redis';

export const SYNC_QUEUE_NAME = 'rag-sync';

@Injectable()
export default class SyncQueue {
  private queue: Queue | null = null;

  public constructor(private readonly redis: RedisConnection) {}

  private getQueue() {
    if (!this.queue) {
      this.queue = new Queue(SYNC_QUEUE_NAME, {
        connection: this.redis.getConnection() as never,
      });
    }

    return this.queue;
  }

  public async addFeishuSyncJob(jobId: string) {
    await this.getQueue().add('feishu-sync', { jobId }, { jobId });
  }
}
