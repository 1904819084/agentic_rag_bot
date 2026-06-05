import { Injectable } from '@gulux/gulux';
import type {
  ChatMessageMetadata,
  Citation,
  Conversation,
  ConversationMessage,
} from '@rag/shared';
import { PostgresRepository } from './postgres';

type ConversationRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  summary: string | null;
  created_at: Date;
  updated_at: Date;
};

type ConversationMessageRow = {
  id: string;
  conversation_id: string;
  role: ConversationMessage['role'];
  content: string;
  citations: Citation[];
  metadata: ChatMessageMetadata | null;
  created_at: Date;
};

export type EnsureConversationInput = {
  id: string;
  userId?: string;
  title?: string;
};

export type ListConversationsInput = {
  userId?: string;
  limit?: number;
};

export type AppendMessageInput = {
  id: string;
  conversationId: string;
  role: ConversationMessage['role'];
  content: string;
  citations?: Citation[];
  metadata?: ChatMessageMetadata;
  createdAt?: string;
};

function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    title: row.title ?? undefined,
    summary: row.summary ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapMessage(row: ConversationMessageRow): ConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    citations: row.citations ?? [],
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}

@Injectable()
export default class ConversationRepository {
  public constructor(private readonly postgres: PostgresRepository) {}

  // 确保会话存在
  // 如果会话不存在，创建一个新的会话
  // 如果会话存在，更新会话信息
  public async ensureConversation(input: EnsureConversationInput): Promise<Conversation | null> {
    try {
      const result = await this.postgres.query<ConversationRow>(
        `INSERT INTO conversations (id, user_id, title, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (id) DO UPDATE SET
           user_id = COALESCE(EXCLUDED.user_id, conversations.user_id),
           title = COALESCE(conversations.title, EXCLUDED.title),
           updated_at = now()
         RETURNING id, user_id, title, summary, created_at, updated_at`,
        [input.id, input.userId ?? null, input.title ?? null],
      );

      return result.rows[0] ? mapConversation(result.rows[0]) : null;
    } catch {
      return null;
    }
  }

  public async getConversation(id: string): Promise<Conversation | null> {
    try {
      const result = await this.postgres.query<ConversationRow>(
        `SELECT id, user_id, title, summary, created_at, updated_at
         FROM conversations
         WHERE id = $1`,
        [id],
      );

      return result.rows[0] ? mapConversation(result.rows[0]) : null;
    } catch {
      return null;
    }
  }

  public async listConversations(input: ListConversationsInput = {}): Promise<Conversation[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (input.userId) {
      params.push(input.userId);
      conditions.push(`user_id = $${params.length}`);
    }

    params.push(input.limit ?? 50);
    const limitParam = `$${params.length}`;
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const result = await this.postgres.query<ConversationRow>(
        `SELECT id, user_id, title, summary, created_at, updated_at
         FROM conversations
         ${whereClause}
         ORDER BY updated_at DESC
         LIMIT ${limitParam}`,
        params,
      );

      return result.rows.map(mapConversation);
    } catch {
      return [];
    }
  }

  public async listRecentMessages(
    conversationId: string,
    limit: number,
  ): Promise<ConversationMessage[]> {
    try {
      const result = await this.postgres.query<ConversationMessageRow>(
        `SELECT id, conversation_id, role, content, citations, metadata, created_at
         FROM conversation_messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [conversationId, limit],
      );

      return result.rows.map(mapMessage).reverse();
    } catch {
      return [];
    }
  }

  public async listMessages(conversationId: string): Promise<ConversationMessage[]> {
    const result = await this.postgres.query<ConversationMessageRow>(
      `SELECT id, conversation_id, role, content, citations, metadata, created_at
       FROM conversation_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId],
    );

    return result.rows.map(mapMessage);
  }

  public async appendMessage(input: AppendMessageInput): Promise<ConversationMessage | null> {
    const createdAt = input.createdAt ?? new Date().toISOString();

    try {
      const result = await this.postgres.query<ConversationMessageRow>(
        `INSERT INTO conversation_messages
           (id, conversation_id, role, content, citations, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, conversation_id, role, content, citations, metadata, created_at`,
        [
          input.id,
          input.conversationId,
          input.role,
          input.content,
          JSON.stringify(input.citations ?? []),
          JSON.stringify(input.metadata ?? {}),
          createdAt,
        ],
      );

      return result.rows[0] ? mapMessage(result.rows[0]) : null;
    } catch {
      return null;
    }
  }

  public async appendTurn(input: {
    conversationId: string;
    userMessage: AppendMessageInput;
    assistantMessage: AppendMessageInput;
  }) {
    try {
      await this.postgres.transaction(async (client) => {
        const insertSql = `INSERT INTO conversation_messages
           (id, conversation_id, role, content, citations, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        const userCreatedAt = input.userMessage.createdAt ?? new Date().toISOString();
        const assistantCreatedAt = input.assistantMessage.createdAt ?? new Date().toISOString();

        await client.query(insertSql, [
          input.userMessage.id,
          input.conversationId,
          input.userMessage.role,
          input.userMessage.content,
          JSON.stringify(input.userMessage.citations ?? []),
          JSON.stringify(input.userMessage.metadata ?? {}),
          userCreatedAt,
        ]);
        await client.query(insertSql, [
          input.assistantMessage.id,
          input.conversationId,
          input.assistantMessage.role,
          input.assistantMessage.content,
          JSON.stringify(input.assistantMessage.citations ?? []),
          JSON.stringify(input.assistantMessage.metadata ?? {}),
          assistantCreatedAt,
        ]);
        await client.query(
          `UPDATE conversations
           SET updated_at = now()
           WHERE id = $1`,
          [input.conversationId],
        );
      });
    } catch {
      // Keep the QA path available when persistence is not ready.
    }
  }

  public async updateSummary(input: {
    conversationId: string;
    summary?: string;
  }) {
    try {
      await this.postgres.query(
        `UPDATE conversations
         SET summary = $2,
             updated_at = now()
         WHERE id = $1`,
        [input.conversationId, input.summary ?? null],
      );
    } catch {
      // Summary is an enhancement and should not block QA.
    }
  }
}
