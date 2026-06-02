import { Injectable } from '@gulux/gulux';
import { Worker } from 'bullmq';
import { RedisConnection } from '../infra/redis';
import { SYNC_QUEUE_NAME } from '../queues/syncQueue';

@Injectable()
export default class SyncWorker {
  private worker: Worker | null = null;

  public constructor(private readonly redis: RedisConnection) {}

  public start() {
    if (this.worker) {
      return;
    }

    this.worker = new Worker(
      SYNC_QUEUE_NAME,
      async (job) => {
        // MVP placeholder. Real implementation will call Feishu document sync, parsing, chunking and indexing.
        return {
          jobId: job.data.jobId,
          status: 'completed',
        };
      },
      { connection: this.redis.getConnection() as never },
    );
  }
}
