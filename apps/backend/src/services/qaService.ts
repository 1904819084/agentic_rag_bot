import { Injectable } from '@gulux/gulux';
import type { AskQuestionRequest, AskQuestionResponse, QaChannel } from '@rag/shared';
import QaLogRepository from '../repositories/qaLogRepository';
import RagGraphService from './ragGraphService';

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

@Injectable()
export default class QaService {
  public constructor(
    private readonly ragGraphService: RagGraphService,
    private readonly qaLogRepository: QaLogRepository,
  ) {}

  public async ask(payload: AskQuestionRequest): Promise<AskQuestionResponse> {
    const channel: QaChannel = payload.channel ?? 'web';
    const result = await this.ragGraphService.answer({
      question: payload.question,
      userId: payload.userId,
      channel,
    });
    const qaLogId = createId('qa');

    await this.qaLogRepository.createLog({
      id: qaLogId,
      question: payload.question,
      answer: result.answer,
      channel,
      userId: payload.userId,
      citations: result.citations ?? [],
    });

    return {
      answer: result.answer,
      rewrittenQuery: result.rewrittenQuery,
      queryPlan: result.queryPlan,
      queryPlanDag: result.queryPlanDag,
      stepResults: result.stepResults ?? [],
      citations: result.citations ?? [],
      contexts: result.contexts ?? [],
      qaLogId,
    };
  }

  public listLogs() {
    return this.qaLogRepository.listLogs();
  }
}
