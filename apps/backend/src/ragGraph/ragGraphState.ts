import { Annotation } from '@langchain/langgraph';
import type {
  AnswerVerification,
  ChatMessage,
  Citation,
  QueryPlanDag,
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
  queryPlan: Annotation<string[]>,
  queryPlanDag: Annotation<QueryPlanDag | undefined>,
  stepResults: Annotation<QueryPlanStepResult[]>,
  contexts: Annotation<RetrievedContext[]>,
  formattedContexts: Annotation<string>,
  citations: Annotation<Citation[]>,
  answer: Annotation<string>,
  answerVerification: Annotation<AnswerVerification | undefined>,
});
