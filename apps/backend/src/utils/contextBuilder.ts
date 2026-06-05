import type { ChatMessage, Citation, ConversationMessage, RetrievedContext } from '@rag/shared';
import type { MemoryContext } from '../types';

export function buildAnswerContext(contexts: RetrievedContext[]) {
  const citations: Citation[] = contexts.map((context, index) => ({
    sourceId: `资料 ${index + 1}`,
    docId: context.docId,
    title: context.title,
    sourceUrl: context.sourceUrl,
    score: context.score,
  }));

  const formattedContexts = contexts
    .map((context, index) => {
      return [
        `[资料 ${index + 1}]`,
        `标题：${context.title}`,
        context.sourceUrl ? `来源：${context.sourceUrl}` : undefined,
        '内容：',
        context.content,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  return { citations, formattedContexts };
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
