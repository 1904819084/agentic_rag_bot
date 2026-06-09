export type QueryPlanTaskType = 'retrieve' | 'reasoning';

export interface ChatMessageMetadata {
  rewrittenQuery?: string;
  queryPlan?: QueryPlan;
  stepResults?: QueryPlanStepResult[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  referenceDocuments?: Citation[];
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

export interface QueryPlanTask {
  id: number;
  type: QueryPlanTaskType;
  query: string;
  dependsOn: number[];
}

export interface QueryPlan {
  tasks: QueryPlanTask[];
}

export interface QueryPlanStepResult {
  stepId: number;
  query: string;
  dependencyStepIds: number[];
  answer: string;
  contexts: RetrievedContext[];
  taskType?: QueryPlanTaskType;
  searchQuery?: string;
}

export interface ChatAskResponse {
  conversationId: string;
  conversation?: Conversation;
  answer: string;
  rewrittenQuery?: string;
  queryPlan?: QueryPlan;
  stepResults?: QueryPlanStepResult[];
  referenceDocuments?: Citation[];
  contexts?: RetrievedContext[];
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
  referenceDocuments?: Citation[];
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

export interface UpdateConversationRequest {
  title?: string;
}

export interface UpdateConversationResponse {
  conversation: Conversation;
}

export interface DeleteConversationResponse {
  success: boolean;
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
