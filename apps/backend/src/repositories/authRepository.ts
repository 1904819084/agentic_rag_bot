import { Injectable } from '@gulux/gulux';
import type { AuthUser } from '@rag/shared';
import { createId } from '../utils/id';
import { PostgresRepository } from './postgres';

export type AuthSession = {
  id: string;
  userId: string;
  feishuAccessToken?: string;
  feishuRefreshToken?: string;
  feishuTokenExpiresAt?: string;
  feishuRefreshExpiresAt?: string;
  expiresAt: string;
  createdAt: string;
};

type UserRow = {
  id: string;
  feishu_open_id: string;
  feishu_union_id: string | null;
  name: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    feishuOpenId: row.feishu_open_id,
    feishuUnionId: row.feishu_union_id ?? undefined,
    name: row.name,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

@Injectable()
export default class AuthRepository {
  public constructor(private readonly postgres: PostgresRepository) {}

  public async upsertFeishuUser(input: {
    feishuOpenId: string;
    feishuUnionId?: string;
    name: string;
    avatarUrl?: string;
  }): Promise<AuthUser> {
    const result = await this.postgres.query<UserRow>(
      `INSERT INTO app_users (id, feishu_open_id, feishu_union_id, name, avatar_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (feishu_open_id) DO UPDATE SET
         feishu_union_id = COALESCE(EXCLUDED.feishu_union_id, app_users.feishu_union_id),
         name = EXCLUDED.name,
         avatar_url = COALESCE(EXCLUDED.avatar_url, app_users.avatar_url),
         updated_at = now()
       RETURNING id, feishu_open_id, feishu_union_id, name, avatar_url, created_at, updated_at`,
      [
        createId('user'),
        input.feishuOpenId,
        input.feishuUnionId ?? null,
        input.name,
        input.avatarUrl ?? null,
      ],
    );

    return mapUser(result.rows[0]);
  }

  public async createSession(input: {
    id: string;
    userId: string;
    feishuAccessToken?: string;
    feishuRefreshToken?: string;
    feishuTokenExpiresAt?: string;
    feishuRefreshExpiresAt?: string;
    expiresAt: string;
  }) {
    await this.postgres.query(
      `INSERT INTO auth_sessions (
         id,
         user_id,
         feishu_access_token,
         feishu_refresh_token,
         feishu_token_expires_at,
         feishu_refresh_expires_at,
         expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.id,
        input.userId,
        input.feishuAccessToken ?? null,
        input.feishuRefreshToken ?? null,
        input.feishuTokenExpiresAt ?? null,
        input.feishuRefreshExpiresAt ?? null,
        input.expiresAt,
      ],
    );
  }

  public async getUserBySessionId(sessionId: string): Promise<AuthUser | null> {
    const result = await this.postgres.query<UserRow>(
      `SELECT u.id, u.feishu_open_id, u.feishu_union_id, u.name, u.avatar_url, u.created_at, u.updated_at
       FROM auth_sessions s
       INNER JOIN app_users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.expires_at > now()`,
      [sessionId],
    );

    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  public async getSessionById(sessionId: string): Promise<AuthSession | null> {
    const result = await this.postgres.query<{
      id: string;
      user_id: string;
      feishu_access_token: string | null;
      feishu_refresh_token: string | null;
      feishu_token_expires_at: Date | null;
      feishu_refresh_expires_at: Date | null;
      expires_at: Date;
      created_at: Date;
    }>(
      `SELECT
         id,
         user_id,
         feishu_access_token,
         feishu_refresh_token,
         feishu_token_expires_at,
         feishu_refresh_expires_at,
         expires_at,
         created_at
       FROM auth_sessions
       WHERE id = $1 AND expires_at > now()`,
      [sessionId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      userId: row.user_id,
      feishuAccessToken: row.feishu_access_token ?? undefined,
      feishuRefreshToken: row.feishu_refresh_token ?? undefined,
      feishuTokenExpiresAt: row.feishu_token_expires_at?.toISOString(),
      feishuRefreshExpiresAt: row.feishu_refresh_expires_at?.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      createdAt: row.created_at.toISOString(),
    };
  }

  public async updateSessionFeishuToken(
    sessionId: string,
    input: {
      feishuAccessToken?: string;
      feishuRefreshToken?: string;
      feishuTokenExpiresAt?: string;
      feishuRefreshExpiresAt?: string;
    },
  ) {
    const result = await this.postgres.query(
      `UPDATE auth_sessions
       SET
         feishu_access_token = $2,
         feishu_refresh_token = $3,
         feishu_token_expires_at = $4,
         feishu_refresh_expires_at = $5
       WHERE id = $1 AND expires_at > now()`,
      [
        sessionId,
        input.feishuAccessToken ?? null,
        input.feishuRefreshToken ?? null,
        input.feishuTokenExpiresAt ?? null,
        input.feishuRefreshExpiresAt ?? null,
      ],
    );

    return (result.rowCount ?? 0) > 0;
  }

  public async deleteSession(sessionId: string) {
    const result = await this.postgres.query(
      `DELETE FROM auth_sessions WHERE id = $1`,
      [sessionId],
    );

    return (result.rowCount ?? 0) > 0;
  }
}
