export type QaChannel = 'web' | 'feishu';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  citations?: Citation[];
}

export interface AskQuestionRequest {
  question: string;
  conversationId?: string;
  userId?: string;
  channel?: QaChannel;
}

export interface Citation {
  sourceId: string;
  docId?: string;
  title: string;
  sourceUrl?: string;
  score?: number;
}

export interface RetrievedContext {
  id: string;
  parentId?: string;
  docId?: string;
  title: string;
  content: string;
  score?: number;
  sourceUrl?: string;
}

export interface QueryPlanStep {
  id: number;
  query: string;
  depends: number[];
}

export interface QueryPlanDag {
  isComplex: boolean;
  steps: QueryPlanStep[];
  executionLevels: number[][];
}

export interface QueryPlanStepResult {
  stepId: number;
  query: string;
  dependencyStepIds: number[];
  answer: string;
  contexts: RetrievedContext[];
}

export interface AskQuestionResponse {
  answer: string;
  rewrittenQuery?: string;
  queryPlan?: string[];
  queryPlanDag?: QueryPlanDag;
  stepResults?: QueryPlanStepResult[];
  citations: Citation[];
  contexts?: RetrievedContext[];
  qaLogId?: string;
}

export interface QaLog {
  id: string;
  question: string;
  answer: string;
  channel: QaChannel;
  userId?: string;
  citations: Citation[];
  createdAt: string;
}
