import { Injectable } from '@gulux/gulux';
import { createRagAnswerGraph } from '../ragGraph/createRagAnswerGraph';
import type { RagGraphInput, RagGraphOutput } from '../types';
import RetrievalService from './retrievalService';

@Injectable()
export default class RagGraphService {
  public constructor(private readonly retrievalService: RetrievalService) {}

  public async answer(input: RagGraphInput): Promise<RagGraphOutput> {
    const graph = createRagAnswerGraph({
      retrievalService: this.retrievalService,
    });

    const result = await graph.invoke({
      question: input.question,
      conversationId: input.conversationId,
      conversationSummary: input.conversationSummary,
      recentMessages: input.recentMessages,
      memories: input.memories ?? [],
      userId: input.userId,
      queryPlan: undefined,
      stepResults: [],
      contexts: [],
      formattedContexts: '',
      citations: [],
      answer: '',
      answerVerification: undefined,
    });

    return result as RagGraphOutput;
  }
}
