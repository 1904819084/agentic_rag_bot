import type { Citation, RetrievedContext } from '@rag/shared';

export function buildAnswerContext(contexts: RetrievedContext[]) {
  const citations: Citation[] = contexts.map((context, index) => ({
    sourceId: `资料 ${index + 1}`,
    docId: context.docId,
    title: context.title,
    sectionPath: context.sectionPath,
    url: context.url,
    snippet: context.content.slice(0, 220),
    score: context.score,
  }));

  const formattedContexts = contexts
    .map((context, index) => {
      return [
        `[资料 ${index + 1}]`,
        `标题：${context.title}`,
        context.sectionPath?.length ? `章节：${context.sectionPath.join(' > ')}` : undefined,
        context.url ? `来源：${context.url}` : undefined,
        '内容：',
        context.content,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  return { citations, formattedContexts };
}
