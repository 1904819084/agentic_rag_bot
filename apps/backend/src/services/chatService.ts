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

  public async ask(chatRequest: ChatAskRequest): Promise<ChatAskResponse> {
    const conversationContext = await this.conversationService.prepareConversation({
      conversationId: chatRequest.conversationId,
      userId: chatRequest.userId,
      question: chatRequest.question,
    });
    const memoryContexts = await this.userMemoryService.listMemoryContexts(chatRequest.userId);
    const ragAnswer = await this.ragGraphService.answer({
      question: chatRequest.question,
      conversationId: conversationContext.conversationId,
      conversationSummary: conversationContext.conversationSummary,
      recentMessages: conversationContext.recentMessages,
      memories: memoryContexts,
      userId: chatRequest.userId,
    });

    // Persist the full RAG trace so historical assistant messages can still show references and plan steps.
    await this.conversationService.appendChatTurn({
      conversationId: conversationContext.conversationId,
      question: chatRequest.question,
      answer: ragAnswer.answer,
      referenceDocuments: ragAnswer.referenceDocuments ?? [],
      assistantMetadata: {
        rewrittenQuery: ragAnswer.rewrittenQuery,
        queryPlan: ragAnswer.queryPlan,
        stepResults: ragAnswer.stepResults ?? [],
      },
    });
    await this.conversationService.updateSummaryAfterTurn({
      conversationId: conversationContext.conversationId,
      previousSummary: conversationContext.conversationSummary,
      question: chatRequest.question,
      answer: ragAnswer.answer,
    });
    await this.userMemoryService.extractAndSaveFromQuestion({
      userId: chatRequest.userId,
      conversationId: conversationContext.conversationId,
      question: chatRequest.question,
    });

    const savedConversation = await this.conversationService.listMessages(
      conversationContext.conversationId,
    );

    return {
      conversationId: conversationContext.conversationId,
      conversation: savedConversation?.conversation,
      answer: ragAnswer.answer,
      rewrittenQuery: ragAnswer.rewrittenQuery,
      queryPlan: ragAnswer.queryPlan,
      stepResults: ragAnswer.stepResults ?? [],
      referenceDocuments: ragAnswer.referenceDocuments ?? [],
      contexts: ragAnswer.contexts ?? [],
    };
  }
}
