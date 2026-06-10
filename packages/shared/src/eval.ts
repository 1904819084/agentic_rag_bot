import type { Citation, QueryPlan, QueryPlanStepResult, RetrievedContext } from './conversation.js';

export type EvalFailureReason =
  | 'pass'
  | 'retrieval_failure'
  | 'faithfulness_failure'
  | 'generation_failure'
  | 'incomplete_answer';

export interface RagEvalCase {
  id: string;
  question: string;
  expectedParentChunkIds: string[];
  expectedAnswerPoints: string[];
  forbiddenClaims?: string[];
}

export interface AnswerQualityMetrics {
  answerCorrectness: number;
  answerFaithfulness: number;
  answerCompleteness: number;
  coveredAnswerPoints: string[];
  missingAnswerPoints: string[];
  unsupportedClaims: string[];
  judgeReason: string;
}

export interface RagEvalCaseResult {
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
}

export interface RagEvalReport {
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
}

export type EvalTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface EvalTask {
  id: string;
  status: EvalTaskStatus;
  queueJobId?: string;
  createdAt: string;
  updatedAt: string;
  queuedAt?: string;
  startedAt?: string;
  finishedAt?: string;
  reportGeneratedAt?: string;
  error?: string;
}

export interface ListEvalCasesResponse {
  items: RagEvalCase[];
}

export interface ListEvalTasksResponse {
  items: EvalTask[];
}

export interface CreateEvalTaskResponse {
  task: EvalTask;
}

export interface GetEvalTaskReportResponse {
  task: EvalTask;
  report: RagEvalReport;
}
