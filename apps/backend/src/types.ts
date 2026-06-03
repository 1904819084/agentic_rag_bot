
import type { Citation, QueryPlanDag, QueryPlanStepResult, RetrievedContext } from '@rag/shared';

// ---------- RAG Graph ----------

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
  title: string;
  sectionPath: string[];
  content: string;
}

// 子块
export interface ChildChunk {
  id: string;
  parentId: string;
  docId: string;
  title: string;
  sectionPath: string[];
  content: string;
  contentForEmbedding: string;
}

// ---------- Retrieval ----------

export type RetrievalSearchOptions = {
  userId?: string;
};

// ---------- Feishu ----------

export interface FeishuDocxUrlInfo {
  url: string;
  docxToken: string;
}

export interface FeishuMessageEvent {
  messageId?: string;
  userId?: string;
  text?: string;
}

export interface FeishuDocxContent {
  sourceDocId: string;
  url: string;
  title: string;
  content: string;
}
