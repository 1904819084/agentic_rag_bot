import type { QueryPlanDag, QueryPlanStep } from '@rag/shared';

export type FornaxQueryDecomposition = {
  is_complex?: boolean;
  steps?: Array<{
    id?: unknown;
    query?: unknown;
    depends?: unknown;
  }>;
};

function stripMarkdownCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
    .replace(/```$/, '')
    .trim();
}

function normalizeFallbackQuery({
  question,
  rewrittenQuery,
}: {
  question?: string;
  rewrittenQuery?: string;
}) {
  return (rewrittenQuery || question || '').trim();
}

function createFallbackDag(input: { question?: string; rewrittenQuery?: string }): QueryPlanDag {
  const query = normalizeFallbackQuery(input);
  return {
    isComplex: false,
    steps: query ? [{ id: 1, query, depends: [] }] : [],
    executionLevels: query ? [[1]] : [],
  };
}

function toStep(
  rawStep: NonNullable<FornaxQueryDecomposition['steps']>[number],
): QueryPlanStep | null {
  const id = typeof rawStep.id === 'number' && Number.isInteger(rawStep.id) ? rawStep.id : null;
  const query = typeof rawStep.query === 'string' ? rawStep.query.trim() : '';
  const depends = Array.isArray(rawStep.depends)
    ? rawStep.depends.filter(
        (item): item is number => typeof item === 'number' && Number.isInteger(item),
      )
    : [];

  if (id === null || id <= 0 || !query) {
    return null;
  }

  return { id, query, depends };
}

// ---- 构建执行层级 ----拓扑排序算法-----基于入度的bfs
function buildExecutionLevels(steps: QueryPlanStep[]) {
  const stepIds = new Set(steps.map((step) => step.id));
  const inDegree = new Map<number, number>(); //id -> 入度
  const outgoing = new Map<number, number[]>(); //id -> 该 step 完成后能"解锁"的下游 step 列表

  for (const step of steps) {
    if (inDegree.has(step.id)) {
      return null;
    }

    inDegree.set(step.id, 0);
    outgoing.set(step.id, []);
  }

  for (const step of steps) {
    const uniqueDepends = Array.from(new Set(step.depends));
    if (uniqueDepends.some((dependency) => !stepIds.has(dependency) || dependency === step.id)) {
      return null;
    }

    step.depends = uniqueDepends;
    inDegree.set(step.id, uniqueDepends.length);
    for (const dependency of uniqueDepends) {
      outgoing.get(dependency)?.push(step.id);
    }
  }

  const executionLevels: number[][] = [];
  let ready = steps.filter((step) => inDegree.get(step.id) === 0).map((step) => step.id);
  const visited = new Set<number>();

  while (ready.length) {
    executionLevels.push(ready);
    const nextReady: number[] = [];

    for (const stepId of ready) {
      visited.add(stepId);
      for (const dependent of outgoing.get(stepId) ?? []) {
        const nextInDegree = (inDegree.get(dependent) ?? 0) - 1;
        inDegree.set(dependent, nextInDegree);
        if (nextInDegree === 0) {
          nextReady.push(dependent);
        }
      }
    }

    ready = nextReady;
  }

  if (visited.size !== steps.length) {
    return null;
  }

  return executionLevels;
}

export function parseQueryDecompositionJson(text: string): FornaxQueryDecomposition | null {
  if (!text.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(stripMarkdownCodeFence(text)) as FornaxQueryDecomposition;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.steps)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildQueryPlanDag({
  question,
  rewrittenQuery,
  decomposition,
}: {
  question?: string;
  rewrittenQuery?: string;
  decomposition?: FornaxQueryDecomposition | null;
}): QueryPlanDag {
  if (
    !decomposition?.is_complex ||
    !Array.isArray(decomposition.steps) ||
    decomposition.steps.length === 0
  ) {
    return createFallbackDag({ question, rewrittenQuery });
  }

  const steps = decomposition.steps.map(toStep);
  if (steps.some((step) => step === null)) {
    return createFallbackDag({ question, rewrittenQuery });
  }

  const normalizedSteps = steps as QueryPlanStep[];
  const executionLevels = buildExecutionLevels(normalizedSteps);
  if (!executionLevels) {
    return createFallbackDag({ question, rewrittenQuery });
  }

  return {
    isComplex: true,
    steps: normalizedSteps,
    executionLevels,
  };
}
