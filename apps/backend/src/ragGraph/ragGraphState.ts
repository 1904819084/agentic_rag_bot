import { Annotation } from '@langchain/langgraph';
import type { Citation, QueryPlanDag, QueryPlanStepResult, RetrievedContext } from '@rag/shared';

export const RagGraphState = Annotation.Root({
  question: Annotation<string>,
  userId: Annotation<string | undefined>,
  channel: Annotation<'web' | 'feishu'>,
  rewrittenQuery: Annotation<string | undefined>,
  queryPlan: Annotation<string[]>,
  queryPlanDag: Annotation<QueryPlanDag | undefined>,
  stepResults: Annotation<QueryPlanStepResult[]>,
  contexts: Annotation<RetrievedContext[]>,
  formattedContexts: Annotation<string>,
  citations: Annotation<Citation[]>,
  answer: Annotation<string>,
});

export type RagGraphInput = {
  question: string;
  userId?: string;
  channel: 'web' | 'feishu';
};

export type RagGraphOutput = RagGraphInput & {
  rewrittenQuery?: string;
  queryPlan: string[];
  queryPlanDag?: QueryPlanDag;
  stepResults: QueryPlanStepResult[];
  contexts: RetrievedContext[];
  formattedContexts: string;
  citations: Citation[];
  answer: string;
};
