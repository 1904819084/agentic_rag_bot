import { judgeAnswer } from './judgeAnswer';
import { inferFailureReason } from './metrics/failureReason';
import { calculateParentRecall } from './metrics/parentRecall';
import { createEvalRagGraphService } from './serviceFactory';
import type { RagEvalCase, RagEvalCaseResult } from './types';
import { EVAL_PARENT_RECALL_K, EVAL_PARENT_RECALL_KEY, EVAL_USER_ID } from './utils/evalConfig';

// 评估单个 case
export async function evaluateCase(
  evalCase: RagEvalCase,
  ragGraphService = createEvalRagGraphService(),
): Promise<RagEvalCaseResult> {
  const ragResult = await ragGraphService.answer({
    question: evalCase.question,
    userId: EVAL_USER_ID,
  });
  const retrievedParentIds = (ragResult.contexts ?? []).map((context) => context.id);
  const parentRecall = calculateParentRecall({
    expectedParentChunkIds: evalCase.expectedParentChunkIds,
    retrievedParentChunkIds: retrievedParentIds,
    k: EVAL_PARENT_RECALL_K,
  });
  const answerMetrics = await judgeAnswer({
    question: evalCase.question,
    contexts: ragResult.contexts ?? [],
    answer: ragResult.answer,
    expectedAnswerPoints: evalCase.expectedAnswerPoints,
    forbiddenClaims: evalCase.forbiddenClaims ?? [],
  });
  const metrics = {
    parentRecallAtK: {
      [EVAL_PARENT_RECALL_KEY]: parentRecall,
    },
    ...answerMetrics,
  };

  return {
    caseId: evalCase.id,
    question: evalCase.question,
    answer: ragResult.answer,
    rewrittenQuery: ragResult.rewrittenQuery,
    queryPlan: ragResult.queryPlan,
    stepResults: ragResult.stepResults ?? [],
    contexts: ragResult.contexts ?? [],
    retrievedParentIds,
    referenceDocuments: ragResult.referenceDocuments ?? [],
    expectedParentChunkIds: evalCase.expectedParentChunkIds,
    expectedAnswerPoints: evalCase.expectedAnswerPoints,
    forbiddenClaims: evalCase.forbiddenClaims ?? [],
    metrics,
    likelyCause: inferFailureReason(metrics),
  };
}
