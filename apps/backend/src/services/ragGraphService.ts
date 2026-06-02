import { Injectable } from '@gulux/gulux';
import type { QaChannel } from '@rag/shared';
import { createRagAnswerGraph } from '../ragGraph/createRagAnswerGraph';
import type { RagGraphOutput } from '../ragGraph/ragGraphState';
import RetrievalService from './retrievalService';

@Injectable()
export default class RagGraphService {
  public constructor(private readonly retrievalService: RetrievalService) {}

  public async answer(input: {
    question: string;
    userId?: string;
    channel: QaChannel;
  }): Promise<RagGraphOutput> {
    const graph = createRagAnswerGraph({
      retrievalService: this.retrievalService,
    });

    const result = await graph.invoke({
      question: input.question,
      userId: input.userId,
      channel: input.channel,
      queryPlan: [],
      queryPlanDag: undefined,
      stepResults: [],
      contexts: [],
      formattedContexts: '',
      citations: [],
      answer: '',
    });

    return result as RagGraphOutput;
  }
}
