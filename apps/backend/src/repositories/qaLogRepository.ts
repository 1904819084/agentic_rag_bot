import { Injectable } from '@gulux/gulux';
import type { Citation, QaChannel, QaLog } from '@rag/shared';
import { PostgresRepository } from './postgres';

@Injectable()
export default class QaLogRepository {
  public constructor(private readonly postgres: PostgresRepository) {}

  public async createLog(input: Omit<QaLog, 'createdAt'>): Promise<QaLog> {
    const createdAt = new Date().toISOString();
    const item: QaLog = { ...input, createdAt };

    try {
      await this.postgres.query(
        `INSERT INTO qa_logs (id, question, answer, channel, user_id, citations, latency_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          item.id,
          item.question,
          item.answer,
          item.channel,
          item.userId ?? null,
          JSON.stringify(item.citations),
          item.latencyMs,
          createdAt,
        ],
      );
    } catch {
      // MVP fallback: keep API available when DB/migrations are not ready.
    }

    return item;
  }

  public async listLogs(): Promise<QaLog[]> {
    try {
      const result = await this.postgres.query<{
        id: string;
        question: string;
        answer: string;
        channel: QaChannel;
        user_id: string | null;
        citations: Citation[];
        latency_ms: number;
        created_at: Date;
      }>(
        `SELECT id, question, answer, channel, user_id, citations, latency_ms, created_at
         FROM qa_logs
         ORDER BY created_at DESC
         LIMIT 200`,
      );

      return result.rows.map((row) => ({
        id: row.id,
        question: row.question,
        answer: row.answer,
        channel: row.channel,
        userId: row.user_id ?? undefined,
        citations: row.citations ?? [],
        latencyMs: row.latency_ms,
        createdAt: row.created_at.toISOString(),
      }));
    } catch {
      return [];
    }
  }
}
