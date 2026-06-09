import type {
  ChatMessage,
  Citation,
  Document,
  QueryPlan,
  QueryPlanStepResult,
  RetrievedContext,
} from '@rag/shared';

// ---------- RAG Graph ----------

export type MemoryContext = {
  type: string;
  content: string;
  usage?: string;
};

export type RagGraphInput = {
  question: string;
  conversationId?: string;
  conversationSummary?: string;
  recentMessages?: ChatMessage[];
  memories?: MemoryContext[];
  userId?: string;
};

export type RagGraphOutput = RagGraphInput & {
  rewrittenQuery?: string;
  queryPlan?: QueryPlan;
  stepResults: QueryPlanStepResult[];
  contexts: RetrievedContext[];
  referenceDocuments?: Citation[];
  answer: string;
};

// ---------- Chunking ----------

// 原始文本输入
export interface ChunkPlainTextInput {
  docId: string;
  title: string;
  content: string;
  childMaxChars?: number;
  childOverlapChars?: number;
}

// 父块
export interface ParentChunk {
  id: string;
  docId: string;
  content: string;
  sectionPath?: string[];
  createdAt?: string;
}

// 子块
export interface ChildChunk {
  id: string;
  parentId: string;
  docId: string;
  content: string;
  contentForEmbedding?: string;
  sectionPath?: string[];
  createdAt?: string;
}

// ---------- Retrieval ----------

export type RetrievalSearchOptions = {
  userId?: string;
};

// ---------- Feishu ----------

export interface FeishuDocumentUrlInfo {
  url: string;
  token: string;
  tokenType: 'docx' | 'wiki';
}

export interface FeishuMessageEvent {
  messageId?: string;
  userId?: string;
  text?: string;
}

export interface FeishuDocumentContent {
  sourceDocId: string;
  sourceUrl: string;
  title: string;
  content: string;
}

// ---------- Document Ingestion ----------

export interface ParsedDocumentInput {
  source: Document['source'];
  sourceDocId: string;
  title: string;
  sourceUrl?: string;
  content: string;
  metadata?: {
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    contentHash?: string;
    storageKey?: string;
  };
}
