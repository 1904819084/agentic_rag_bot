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
