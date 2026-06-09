import type { Citation, QueryPlan, QueryPlanStepResult, RetrievedContext } from '@rag/shared';

export type RagEvalCase = {
  id: string;
  question: string;
  expectedParentChunkIds: string[];
  expectedAnswerPoints: string[];
  forbiddenClaims?: string[];
};

export type AnswerQualityMetrics = {
  answerCorrectness: number;
  answerFaithfulness: number;
  answerCompleteness: number;
  coveredAnswerPoints: string[];
  missingAnswerPoints: string[];
  unsupportedClaims: string[];
  judgeReason: string;
};

export type RagEvalCaseResult = {
  caseId: string;
  question: string;
  answer: string;
  rewrittenQuery?: string;
  queryPlan?: QueryPlan;
  stepResults: QueryPlanStepResult[];
  contexts: RetrievedContext[];
  retrievedParentIds: string[];
  referenceDocuments: Citation[];
  expectedParentChunkIds: string[];
  expectedAnswerPoints: string[];
  forbiddenClaims: string[];
  metrics: {
    parentRecallAtK: Record<string, number | null>;
  } & AnswerQualityMetrics;
  likelyCause: EvalFailureReason;
};

export type EvalFailureReason =
  | 'pass'
  | 'retrieval_failure'
  | 'faithfulness_failure'
  | 'generation_failure'
  | 'incomplete_answer';

export type RagEvalReport = {
  generatedAt: string;
  totalCases: number;
  summary: {
    parentRecallAtK: Record<string, number | null>;
    answerCorrectnessAvg: number;
    answerFaithfulnessAvg: number;
    answerCompletenessAvg: number;
    failureCounts: Record<EvalFailureReason, number>;
  };
  cases: RagEvalCaseResult[];
};
