import { Injectable } from '@gulux/gulux';
import type { SyncJob } from '@rag/shared';
import { PostgresRepository } from './postgres';

@Injectable()
export default class SyncJobRepository {
  public constructor(private readonly postgres: PostgresRepository) {}

  public async createJob(job: SyncJob): Promise<SyncJob> {
    try {
      await this.postgres.query(
        `INSERT INTO sync_jobs (id, type, status, message, document_count, chunk_count, started_at, finished_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          job.id,
          job.type,
          job.status,
          job.message ?? null,
          job.documentCount,
          job.chunkCount,
          job.startedAt ?? null,
          job.finishedAt ?? null,
          job.createdAt,
        ],
      );
    } catch {
      // MVP fallback when DB is not ready.
    }

    return job;
  }

  public async listJobs(): Promise<SyncJob[]> {
    try {
      const result = await this.postgres.query<{
        id: string;
        type: SyncJob['type'];
        status: SyncJob['status'];
        message: string | null;
        document_count: number;
        chunk_count: number;
        started_at: Date | null;
        finished_at: Date | null;
        created_at: Date;
      }>(
        `SELECT id, type, status, message, document_count, chunk_count, started_at, finished_at, created_at
         FROM sync_jobs
         ORDER BY created_at DESC
         LIMIT 200`,
      );

      return result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        message: row.message ?? undefined,
        documentCount: row.document_count,
        chunkCount: row.chunk_count,
        startedAt: row.started_at?.toISOString(),
        finishedAt: row.finished_at?.toISOString(),
        createdAt: row.created_at.toISOString(),
      }));
    } catch {
      return [];
    }
  }
}
