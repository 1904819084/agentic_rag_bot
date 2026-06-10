import { Injectable } from '@gulux/gulux';
import type { EvalTask, EvalTaskStatus } from '@rag/shared';
import { PostgresRepository } from './postgres';

type EvalTaskRow = {
  id: string;
  status: EvalTaskStatus;
  queue_job_id: string | null;
  report_generated_at: Date | null;
  error: string | null;
  queued_at: Date | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapEvalTask(row: EvalTaskRow): EvalTask {
  return {
    id: row.id,
    status: row.status,
    queueJobId: row.queue_job_id ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    queuedAt: row.queued_at?.toISOString(),
    startedAt: row.started_at?.toISOString(),
    finishedAt: row.finished_at?.toISOString(),
    reportGeneratedAt: row.report_generated_at?.toISOString(),
    error: row.error ?? undefined,
  };
}

@Injectable()
export default class EvalTaskRepository {
  public constructor(private readonly postgres: PostgresRepository) {}

  public async listTasks(limit = 100): Promise<EvalTask[]> {
    const result = await this.postgres.query<EvalTaskRow>(
      `SELECT id, status, queue_job_id, report_generated_at, error,
              queued_at, started_at, finished_at, created_at, updated_at
       FROM eval_tasks
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    return result.rows.map(mapEvalTask);
  }

  public async getTask(taskId: string): Promise<EvalTask | null> {
    const result = await this.postgres.query<EvalTaskRow>(
      `SELECT id, status, queue_job_id, report_generated_at, error,
              queued_at, started_at, finished_at, created_at, updated_at
       FROM eval_tasks
       WHERE id = $1`,
      [taskId],
    );

    return result.rows[0] ? mapEvalTask(result.rows[0]) : null;
  }

  public async requeueRunningTasks(input: {
    queuedAt: string;
    updatedAt: string;
  }): Promise<EvalTask[]> {
    const result = await this.postgres.query<EvalTaskRow>(
      `UPDATE eval_tasks
       SET status = 'queued',
           error = NULL,
           queued_at = $1,
           started_at = NULL,
           finished_at = NULL,
           updated_at = $2
       WHERE status = 'running'
       RETURNING id, status, queue_job_id, report_generated_at, error,
                 queued_at, started_at, finished_at, created_at, updated_at`,
      [input.queuedAt, input.updatedAt],
    );

    return result.rows.map(mapEvalTask);
  }

  public async createTask(task: EvalTask): Promise<EvalTask> {
    const result = await this.postgres.query<EvalTaskRow>(
      `INSERT INTO eval_tasks (id, status, queued_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status, queue_job_id, report_generated_at, error,
                 queued_at, started_at, finished_at, created_at, updated_at`,
      [task.id, task.status, task.queuedAt ?? null, task.createdAt, task.updatedAt],
    );

    return mapEvalTask(result.rows[0]);
  }

  public async attachQueueJobId(taskId: string, queueJobId: string): Promise<EvalTask | null> {
    const result = await this.postgres.query<EvalTaskRow>(
      `UPDATE eval_tasks
       SET queue_job_id = $2,
           updated_at = now()
       WHERE id = $1
       RETURNING id, status, queue_job_id, report_generated_at, error,
                 queued_at, started_at, finished_at, created_at, updated_at`,
      [taskId, queueJobId],
    );

    return result.rows[0] ? mapEvalTask(result.rows[0]) : null;
  }

  public async startQueuedTask(
    taskId: string,
    input: {
      startedAt: string;
      updatedAt: string;
    },
  ): Promise<EvalTask | null> {
    const result = await this.postgres.query<EvalTaskRow>(
      `UPDATE eval_tasks
       SET status = 'running',
           error = NULL,
           started_at = $2,
           finished_at = NULL,
           updated_at = $3
       WHERE id = $1 AND status = 'queued'
       RETURNING id, status, queue_job_id, report_generated_at, error,
                 queued_at, started_at, finished_at, created_at, updated_at`,
      [taskId, input.startedAt, input.updatedAt],
    );

    return result.rows[0] ? mapEvalTask(result.rows[0]) : null;
  }

  public async updateTask(
    taskId: string,
    patch: {
      status: EvalTaskStatus;
      reportGeneratedAt?: string;
      error?: string;
      updatedAt: string;
      startedAt?: string;
      finishedAt?: string;
    },
  ): Promise<EvalTask | null> {
    const result = await this.postgres.query<EvalTaskRow>(
      `UPDATE eval_tasks
       SET status = $2,
           report_generated_at = COALESCE($3, report_generated_at),
           error = $4,
           updated_at = $5,
           started_at = COALESCE($6, started_at),
           finished_at = COALESCE($7, finished_at)
       WHERE id = $1
       RETURNING id, status, queue_job_id, report_generated_at, error,
                 queued_at, started_at, finished_at, created_at, updated_at`,
      [
        taskId,
        patch.status,
        patch.reportGeneratedAt ?? null,
        patch.error ?? null,
        patch.updatedAt,
        patch.startedAt ?? null,
        patch.finishedAt ?? null,
      ],
    );

    return result.rows[0] ? mapEvalTask(result.rows[0]) : null;
  }
}
