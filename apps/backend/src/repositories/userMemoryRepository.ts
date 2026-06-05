import { Injectable } from '@gulux/gulux';
import type { UserMemory } from '@rag/shared';
import { PostgresRepository } from './postgres';

type UserMemoryRow = {
  id: string;
  user_id: string;
  type: UserMemory['type'];
  content: string;
  confidence: number;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

function mapUserMemory(row: UserMemoryRow): UserMemory {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    content: row.content,
    confidence: row.confidence,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

@Injectable()
export default class UserMemoryRepository {
  public constructor(private readonly postgres: PostgresRepository) {}

  public async listByUser(userId: string, limit = 20): Promise<UserMemory[]> {
    try {
      const result = await this.postgres.query<UserMemoryRow>(
        `SELECT id, user_id, type, content, confidence, metadata, created_at, updated_at
         FROM user_memories
         WHERE user_id = $1 AND deleted_at IS NULL
         ORDER BY updated_at DESC
         LIMIT $2`,
        [userId, limit],
      );

      return result.rows.map(mapUserMemory);
    } catch {
      return [];
    }
  }

  public async findSimilar(input: { userId: string; content: string }): Promise<UserMemory | null> {
    try {
      const result = await this.postgres.query<UserMemoryRow>(
        `SELECT id, user_id, type, content, confidence, metadata, created_at, updated_at
         FROM user_memories
         WHERE user_id = $1 AND deleted_at IS NULL AND lower(content) = lower($2)
         LIMIT 1`,
        [input.userId, input.content],
      );

      return result.rows[0] ? mapUserMemory(result.rows[0]) : null;
    } catch {
      return null;
    }
  }

  public async upsertMemory(input: {
    id: string;
    userId: string;
    type: UserMemory['type'];
    content: string;
    confidence: number;
    metadata?: Record<string, unknown>;
  }): Promise<UserMemory | null> {
    try {
      const existing = await this.findSimilar({ userId: input.userId, content: input.content });
      const id = existing?.id ?? input.id;
      const result = await this.postgres.query<UserMemoryRow>(
        `INSERT INTO user_memories
           (id, user_id, type, content, confidence, metadata, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (id) DO UPDATE SET
           type = EXCLUDED.type,
           content = EXCLUDED.content,
           confidence = GREATEST(user_memories.confidence, EXCLUDED.confidence),
           metadata = EXCLUDED.metadata,
           updated_at = now(),
           deleted_at = NULL
         RETURNING id, user_id, type, content, confidence, metadata, created_at, updated_at`,
        [
          id,
          input.userId,
          input.type,
          input.content,
          input.confidence,
          JSON.stringify(input.metadata ?? {}),
        ],
      );

      return result.rows[0] ? mapUserMemory(result.rows[0]) : null;
    } catch {
      return null;
    }
  }
}
