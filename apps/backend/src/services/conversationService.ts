import { Injectable } from '@gulux/gulux';
import type {
  ChatMessageMetadata,
  Conversation,
  CreateConversationRequest,
  Citation,
  ConversationMessage,
} from '@rag/shared';
import ConversationRepository from '../repositories/conversationRepository';
import { AppError } from '../utils/appError';
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

  public async createConversation(createRequest: CreateConversationRequest) {
    const conversationId = createId('conv');
    return this.conversationRepository.ensureConversation({
      id: conversationId,
      userId: createRequest.userId,
      title: createRequest.title || '新会话',
    });
  }

  public listConversations(conversationFilter: { userId?: string } = {}) {
    return this.conversationRepository.listConversations(conversationFilter);
  }

  // 准备会话上下文：
  // - 未传 conversationId：创建新会话，title 直接用首问前 32 字。
  // - 已传 conversationId：复用已有会话；若不存在则惰性建一个，避免阻塞问答。
  public async prepareConversation(contextRequest: {
    conversationId?: string;
    userId?: string;
    question: string;
  }): Promise<ConversationContext> {
    const conversationId = contextRequest.conversationId || createId('conv');
    const fallbackTitle = contextRequest.question.slice(0, 32) || '新会话';

    const conversation = await this.conversationRepository.ensureConversation({
      id: conversationId,
      userId: contextRequest.userId,
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
  public async appendChatTurn(chatTurn: {
    conversationId: string;
    question: string;
    answer: string;
    citations: Citation[];
    assistantMetadata?: ChatMessageMetadata;
  }) {
    await this.conversationRepository.appendTurn({
      conversationId: chatTurn.conversationId,
      userMessage: {
        id: createId('msg'),
        conversationId: chatTurn.conversationId,
        role: 'user',
        content: chatTurn.question,
      },
      assistantMessage: {
        id: createId('msg'),
        conversationId: chatTurn.conversationId,
        role: 'assistant',
        content: chatTurn.answer,
        citations: chatTurn.citations,
        metadata: chatTurn.assistantMetadata,
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

  public updateConversationTitle(renameRequest: { conversationId: string; title: string }) {
    const normalizedTitle = renameRequest.title.trim();
    if (!normalizedTitle) {
      throw new AppError('invalid_conversation_title', 400, 'title is required');
    }

    if (normalizedTitle.length > 80) {
      throw new AppError(
        'conversation_title_too_long',
        400,
        'title must be 80 characters or fewer',
      );
    }

    return this.conversationRepository.updateConversationTitle({
      conversationId: renameRequest.conversationId,
      title: normalizedTitle,
    });
  }

  public deleteConversation(conversationId: string) {
    return this.conversationRepository.deleteConversation(conversationId);
  }

  // 更新会话摘要
  // 更新会话的摘要，包括用户最新问题和助手最新回答摘要
  public async updateSummaryAfterTurn(summaryUpdate: {
    conversationId: string;
    previousSummary?: string;
    question: string;
    answer: string;
  }) {
    const nextSummary = trimSummary(
      [
        summaryUpdate.previousSummary ? `此前摘要：${summaryUpdate.previousSummary}` : undefined,
        `用户最新问题：${summaryUpdate.question}`,
        `助手最新回答摘要：${summaryUpdate.answer.slice(0, 400)}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );

    await this.conversationRepository.updateSummary({
      conversationId: summaryUpdate.conversationId,
      summary: nextSummary,
    });
  }
}
