export type QueryPlanIntent =
  | 'factual'
  | 'multi_hop'
  | 'compare'
  | 'summarize'
  | 'diagnose'
  | 'decision'
  | 'ambiguous';

export type QueryPlanTaskType = 'retrieve' | 'synthesize' | 'verify' | 'clarify';

export type EvidenceStatus = 'none' | 'weak' | 'sufficient' | 'not_applicable';

export interface AnswerVerification {
  isSupported: boolean;
  warnings: string[];
  missingCitations?: string[];
  invalidCitationSourceIds?: string[];
  insufficientEvidenceSections?: string[];
}

export interface ChatMessageMetadata {
  rewrittenQuery?: string;
  queryPlanDag?: QueryPlanDag;
  stepResults?: QueryPlanStepResult[];
  answerVerification?: AnswerVerification;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citations?: Citation[];
  metadata?: ChatMessageMetadata;
}

export interface ChatAskRequest {
  question: string;
  conversationId?: string;
  userId?: string;
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
  taskType?: QueryPlanTaskType;
  searchQuery?: string;
  expectedEvidence?: string;
  output?: string;
}

export interface QueryPlanDag {
  isComplex: boolean;
  intent?: QueryPlanIntent;
  needClarification?: boolean;
  clarificationQuestion?: string;
  steps: QueryPlanStep[];
  executionLevels: number[][];
  finalAnswerPlan?: string;
}

export interface QueryPlanStepResult {
  stepId: number;
  query: string;
  dependencyStepIds: number[];
  answer: string;
  contexts: RetrievedContext[];
  taskType?: QueryPlanTaskType;
  searchQuery?: string;
  expectedEvidence?: string;
  evidenceStatus?: EvidenceStatus;
  missingEvidence?: string[];
}

export interface ChatAskResponse {
  conversationId: string;
  conversation?: Conversation;
  answer: string;
  rewrittenQuery?: string;
  queryPlan?: string[];
  queryPlanDag?: QueryPlanDag;
  stepResults?: QueryPlanStepResult[];
  citations: Citation[];
  contexts?: RetrievedContext[];
  answerVerification?: AnswerVerification;
}

export interface Conversation {
  id: string;
  userId?: string;
  title?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: ChatMessage['role'];
  content: string;
  citations?: Citation[];
  metadata?: ChatMessageMetadata;
  createdAt: string;
}

export interface ListConversationsResponse {
  items: Conversation[];
}

export interface CreateConversationRequest {
  title?: string;
  userId?: string;
}

export interface CreateConversationResponse {
  conversation: Conversation;
}

export interface ListConversationMessagesResponse {
  conversation: Conversation;
  messages: ConversationMessage[];
}

export interface UserMemory {
  id: string;
  userId: string;
  type: 'preference' | 'constraint';
  content: string;
  confidence: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
