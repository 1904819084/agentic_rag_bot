import { Injectable } from '@gulux/gulux';
import type { ChatAskRequest, ChatAskResponse } from '@rag/shared';
import ConversationService from './conversationService';
import RagGraphService from './ragGraphService';
import UserMemoryService from './userMemoryService';

@Injectable()
export default class ChatService {
  public constructor(
    private readonly ragGraphService: RagGraphService,
    private readonly conversationService: ConversationService,
    private readonly userMemoryService: UserMemoryService,
  ) {}

  public async ask(payload: ChatAskRequest): Promise<ChatAskResponse> {
    const conversationContext = await this.conversationService.prepareConversation({
      conversationId: payload.conversationId,
      userId: payload.userId,
      question: payload.question,
    });
    const memories = await this.userMemoryService.listMemoryContexts(payload.userId);
    const result = await this.ragGraphService.answer({
      question: payload.question,
      conversationId: conversationContext.conversationId,
      conversationSummary: conversationContext.conversationSummary,
      recentMessages: conversationContext.recentMessages,
      memories,
      userId: payload.userId,
    });

    await this.conversationService.appendChatTurn({
      conversationId: conversationContext.conversationId,
      question: payload.question,
      answer: result.answer,
      citations: result.citations ?? [],
      assistantMetadata: {
        rewrittenQuery: result.rewrittenQuery,
        queryPlanDag: result.queryPlanDag,
        stepResults: result.stepResults ?? [],
        answerVerification: result.answerVerification,
      },
    });
    await this.conversationService.updateSummaryAfterTurn({
      conversationId: conversationContext.conversationId,
      previousSummary: conversationContext.conversationSummary,
      question: payload.question,
      answer: result.answer,
    });
    await this.userMemoryService.extractAndSaveFromQuestion({
      userId: payload.userId,
      conversationId: conversationContext.conversationId,
      question: payload.question,
    });

    const conversation = await this.conversationService.listMessages(
      conversationContext.conversationId,
    );

    return {
      conversationId: conversationContext.conversationId,
      conversation: conversation?.conversation,
      answer: result.answer,
      rewrittenQuery: result.rewrittenQuery,
      queryPlan: result.queryPlan,
      queryPlanDag: result.queryPlanDag,
      stepResults: result.stepResults ?? [],
      citations: result.citations ?? [],
      contexts: result.contexts ?? [],
      answerVerification: result.answerVerification,
    };
  }
}
