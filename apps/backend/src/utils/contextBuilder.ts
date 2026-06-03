import type { Citation, RetrievedContext } from '@rag/shared';

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
