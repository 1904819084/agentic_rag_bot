import type { ChatMessage, Citation, ConversationMessage, RetrievedContext } from '@rag/shared';
import type { MemoryContext } from '../types';

function getCitationDocumentKey(context: RetrievedContext) {
  return context.docId ?? context.sourceUrl ?? context.title;
}

function buildReferenceDocuments(contexts: RetrievedContext[]) {
  const seen = new Set<string>();
  const citations: Citation[] = [];

  for (const context of contexts) {
    const key = getCitationDocumentKey(context);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    citations.push({
      sourceId: `文档 ${citations.length + 1}`,
      docId: context.docId,
      title: context.title,
      sourceUrl: context.sourceUrl,
      score: context.score,
    });
  }

  return citations;
}

export function buildReferenceDocumentContext(contexts: RetrievedContext[]) {
  const referenceDocuments = buildReferenceDocuments(contexts);

  return {
    referenceDocuments,
  };
}

export function formatRetrievedContextsForPrompt(contexts: RetrievedContext[] = []) {
  return contexts
    .map((context, index) =>
      [
        `[资料 ${index + 1}]`,
        `标题：${context.title}`,
        context.sourceUrl ? `来源：${context.sourceUrl}` : undefined,
        '内容：',
        context.content,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

export function formatRecentMessages(messages: Array<ChatMessage | ConversationMessage> = []) {
  return messages
    .map((message) => {
      const role = message.role === 'assistant' ? '助手' : message.role === 'user' ? '用户' : '系统';
      return `${role}：${message.content}`;
    })
    .join('\n');
}

export function formatMemoryContexts(memories: MemoryContext[] = []) {
  return memories
    .map((memory, index) =>
      [
        `[记忆 ${index + 1}]`,
        `类型：${memory.type}`,
        `内容：${memory.content}`,
        memory.usage ? `用途：${memory.usage}` : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

export function formatCitationRules() {
  return [
    '知识库事实必须优先基于资料上下文回答。',
    '会话历史和记忆只用于理解用户意图，不作为事实证据。',
    '资料不足时必须明确说明不足，不要伪造引用。',
    '引用只能来自本次提供的资料编号。',
  ].join('\n');
}
