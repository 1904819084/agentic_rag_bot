import { Injectable } from '@gulux/gulux';
import type {
  ChatMessageMetadata,
  Conversation,
  CreateConversationRequest,
  Citation,
  ConversationMessage,
} from '@rag/shared';
import ConversationRepository from '../repositories/conversationRepository';
import { createId } from '../utils/id';

const RECENT_MESSAGE_LIMIT = 6;
const SUMMARY_MAX_CHARS = 1200;

export type ConversationContext = {
  conversationId: string;
  conversationSummary?: string;
  recentMessages: ConversationMessage[];
};

export type ConversationMessagesResult = {
  conversation: Conversation;
  messages: ConversationMessage[];
};

function trimSummary(summary: string) {
  return summary.length > SUMMARY_MAX_CHARS
    ? `${summary.slice(summary.length - SUMMARY_MAX_CHARS)}`
    : summary;
}

@Injectable()
export default class ConversationService {
  public constructor(private readonly conversationRepository: ConversationRepository) {}

  public async createConversation(input: CreateConversationRequest) {
    const conversationId = createId('conv');
    return this.conversationRepository.ensureConversation({
      id: conversationId,
      userId: input.userId,
      title: input.title || '新会话',
    });
  }

  public listConversations(input: { userId?: string } = {}) {
    return this.conversationRepository.listConversations(input);
  }

  // 准备会话上下文：
  // - 未传 conversationId：创建新会话，title 直接用首问前 32 字。
  // - 已传 conversationId：复用已有会话；若不存在则惰性建一个，避免阻塞问答。
  public async prepareConversation(input: {
    conversationId?: string;
    userId?: string;
    question: string;
  }): Promise<ConversationContext> {
    const conversationId = input.conversationId || createId('conv');
    const fallbackTitle = input.question.slice(0, 32) || '新会话';

    const conversation = await this.conversationRepository.ensureConversation({
      id: conversationId,
      userId: input.userId,
      title: fallbackTitle,
    });

    const recentMessages = conversation
      ? await this.conversationRepository.listRecentMessages(conversation.id, RECENT_MESSAGE_LIMIT)
      : [];

    return {
      conversationId: conversation?.id ?? conversationId,
      conversationSummary: conversation?.summary,
      recentMessages,
    };
  }

  // 追加会话轮次
  // 追加用户问题和助手回答到会话中
  public async appendChatTurn(input: {
    conversationId: string;
    question: string;
    answer: string;
    citations: Citation[];
    assistantMetadata?: ChatMessageMetadata;
  }) {
    await this.conversationRepository.appendTurn({
      conversationId: input.conversationId,
      userMessage: {
        id: createId('msg'),
        conversationId: input.conversationId,
        role: 'user',
        content: input.question,
      },
      assistantMessage: {
        id: createId('msg'),
        conversationId: input.conversationId,
        role: 'assistant',
        content: input.answer,
        citations: input.citations,
        metadata: input.assistantMetadata,
      },
    });
  }

  // 列出会话消息
  // 返回会话的所有消息，包括用户问题和助手回答
  public async listMessages(conversationId: string): Promise<ConversationMessagesResult | null> {
    const conversation = await this.conversationRepository.getConversation(conversationId);
    if (!conversation) {
      return null;
    }

    return {
      conversation,
      messages: await this.conversationRepository.listMessages(conversationId),
    };
  }

  // 更新会话摘要
  // 更新会话的摘要，包括用户最新问题和助手最新回答摘要
  public async updateSummaryAfterTurn(input: {
    conversationId: string;
    previousSummary?: string;
    question: string;
    answer: string;
  }) {
    const nextSummary = trimSummary(
      [
        input.previousSummary ? `此前摘要：${input.previousSummary}` : undefined,
        `用户最新问题：${input.question}`,
        `助手最新回答摘要：${input.answer.slice(0, 400)}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );

    await this.conversationRepository.updateSummary({
      conversationId: input.conversationId,
      summary: nextSummary,
    });
  }
}
