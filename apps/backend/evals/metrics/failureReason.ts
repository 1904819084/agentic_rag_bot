import type { EvalFailureReason, RagEvalCaseResult } from '../types';
import { EVAL_PARENT_RECALL_KEY } from '../utils/evalConfig';

// 归因
export function inferFailureReason(metrics: RagEvalCaseResult['metrics']): EvalFailureReason {
  const parentRecall = metrics.parentRecallAtK[EVAL_PARENT_RECALL_KEY];

  if (parentRecall !== null && parentRecall <= 0) {
    return 'retrieval_failure';
  }

  if (metrics.answerFaithfulness < 1) {
    return 'faithfulness_failure';
  }

  if (metrics.answerCorrectness < 0.8) {
    return 'generation_failure';
  }

  if (metrics.answerCompleteness < 0.8) {
    return 'incomplete_answer';
  }

  return 'pass';
}
