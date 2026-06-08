import { Annotation } from '@langchain/langgraph';
import type {
  ChatMessage,
  Citation,
  QueryPlan,
  QueryPlanStepResult,
  RetrievedContext,
} from '@rag/shared';
import type { MemoryContext } from '../types';

export const RagGraphState = Annotation.Root({
  question: Annotation<string>,
  conversationId: Annotation<string | undefined>,
  conversationSummary: Annotation<string | undefined>,
  recentMessages: Annotation<ChatMessage[] | undefined>,
  memories: Annotation<MemoryContext[] | undefined>,
  userId: Annotation<string | undefined>,
  rewrittenQuery: Annotation<string | undefined>,
  queryPlan: Annotation<QueryPlan | undefined>,
  stepResults: Annotation<QueryPlanStepResult[]>,
  contexts: Annotation<RetrievedContext[]>,
  formattedContexts: Annotation<string>,
  citations: Annotation<Citation[]>,
  answer: Annotation<string>,
});
