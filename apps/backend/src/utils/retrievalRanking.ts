import type { RetrievedContext } from '@rag/shared';

function tokenize(text: string) {
  const asciiTokens = text.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
  const cjkTokens = Array.from(text.matchAll(/[\u4e00-\u9fff]{2,}/g), (match) => match[0]);
  return Array.from(new Set([...asciiTokens, ...cjkTokens])).filter(Boolean);
}

export function combineHybridResults({
  vector,
  keyword,
  limit,
  k = 60,
}: {
  vector: RetrievedContext[];
  keyword: RetrievedContext[];
  limit: number;
  k?: number;
}) {
  const scores = new Map<string, { item: RetrievedContext; score: number }>();

  function add(items: RetrievedContext[], weight: number) {
    items.forEach((item, index) => {
      const reciprocalRank = weight / (k + index + 1);
      const existing = scores.get(item.id);
      if (existing) {
        existing.score += reciprocalRank;
        existing.item = { ...existing.item, ...item, score: existing.score };
        return;
      }
      scores.set(item.id, { item: { ...item }, score: reciprocalRank });
    });
  }

  add(vector, 1);
  add(keyword, 1);

  return Array.from(scores.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ item, score }) => ({ ...item, score }));
}

export function rerankByQueryOverlap(
  query: string,
  contexts: RetrievedContext[],
  limit = contexts.length,
) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length || contexts.length <= 1) {
    return contexts.slice(0, limit);
  }

  return contexts
    .map((context, index) => {
      const haystack =
        `${context.title} ${context.sectionPath?.join(' ') ?? ''} ${context.content}`.toLowerCase();
      const overlap = queryTokens.reduce(
        (score, token) => score + (haystack.includes(token.toLowerCase()) ? 1 : 0),
        0,
      );
      const baseScore = context.score ?? 0;
      return {
        context: {
          ...context,
          score: baseScore + overlap,
        },
        rankScore: overlap * 1000 + baseScore - index / 100000,
      };
    })
    .sort((left, right) => right.rankScore - left.rankScore)
    .slice(0, limit)
    .map((item) => item.context);
}
