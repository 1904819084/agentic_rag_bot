import type { QueryPlanDag, QueryPlanIntent, QueryPlanStep, QueryPlanTaskType } from '@rag/shared';

export type FornaxQueryDecomposition = {
  schema_version?: unknown;
  schemaVersion?: unknown;
  is_complex?: unknown;
  isComplex?: unknown;
  intent?: unknown;
  need_clarification?: unknown;
  needClarification?: unknown;
  clarification_question?: unknown;
  clarificationQuestion?: unknown;
  final_answer_plan?: unknown;
  finalAnswerPlan?: unknown;
  steps?: Array<{
    id?: unknown;
    type?: unknown;
    taskType?: unknown;
    task_type?: unknown;
    query?: unknown;
    question?: unknown;
    search_query?: unknown;
    searchQuery?: unknown;
    expected_evidence?: unknown;
    expectedEvidence?: unknown;
    output?: unknown;
    depends?: unknown;
  }>;
};

const VALID_TASK_TYPES = new Set<QueryPlanTaskType>([
  'retrieve',
  'synthesize',
  'verify',
  'clarify',
]);
const VALID_INTENTS = new Set<QueryPlanIntent>([
  'factual',
  'multi_hop',
  'compare',
  'summarize',
  'diagnose',
  'decision',
  'ambiguous',
]);

function stripMarkdownCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
    .replace(/```$/, '')
    .trim();
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeIntent(value: unknown): QueryPlanIntent | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return VALID_INTENTS.has(value as QueryPlanIntent) ? (value as QueryPlanIntent) : undefined;
}

function normalizeTaskType(value: unknown): QueryPlanTaskType {
  if (typeof value === 'string' && VALID_TASK_TYPES.has(value as QueryPlanTaskType)) {
    return value as QueryPlanTaskType;
  }
  return 'retrieve';
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
    steps: query
      ? [
          {
            id: 1,
            query,
            searchQuery: query,
            taskType: 'retrieve',
            depends: [],
          },
        ]
      : [],
    executionLevels: query ? [[1]] : [],
  };
}

function toStep(
  rawStep: NonNullable<FornaxQueryDecomposition['steps']>[number],
): QueryPlanStep | null {
  const id = typeof rawStep.id === 'number' && Number.isInteger(rawStep.id) ? rawStep.id : null;
  const query = normalizeString(rawStep.query) ?? normalizeString(rawStep.question) ?? '';
  const searchQuery = normalizeString(rawStep.searchQuery) ?? normalizeString(rawStep.search_query) ?? query;
  const taskType = normalizeTaskType(rawStep.taskType ?? rawStep.task_type ?? rawStep.type);
  const expectedEvidence =
    normalizeString(rawStep.expectedEvidence) ?? normalizeString(rawStep.expected_evidence);
  const output = normalizeString(rawStep.output);
  const depends = Array.isArray(rawStep.depends)
    ? rawStep.depends.filter(
        (item): item is number => typeof item === 'number' && Number.isInteger(item),
      )
    : [];

  if (id === null || id <= 0 || !query) {
    return null;
  }

  if ((taskType === 'retrieve' || taskType === 'verify') && !searchQuery) {
    return null;
  }

  if (taskType === 'synthesize' && depends.length === 0) {
    return null;
  }

  return {
    id,
    query,
    searchQuery,
    taskType,
    expectedEvidence,
    output,
    depends,
  };
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
  if (!decomposition || !Array.isArray(decomposition.steps) || decomposition.steps.length === 0) {
    return createFallbackDag({ question, rewrittenQuery });
  }

  const needClarification =
    normalizeBoolean(decomposition.needClarification) ??
    normalizeBoolean(decomposition.need_clarification) ??
    false;
  const clarificationQuestion =
    normalizeString(decomposition.clarificationQuestion) ??
    normalizeString(decomposition.clarification_question);

  if (needClarification && clarificationQuestion) {
    return {
      isComplex: false,
      intent: normalizeIntent(decomposition.intent) ?? 'ambiguous',
      needClarification,
      clarificationQuestion,
      steps: [
        {
          id: 1,
          query: clarificationQuestion,
          taskType: 'clarify',
          depends: [],
        },
      ],
      executionLevels: [[1]],
      finalAnswerPlan:
        normalizeString(decomposition.finalAnswerPlan) ??
        normalizeString(decomposition.final_answer_plan),
    };
  }

  const isComplex =
    normalizeBoolean(decomposition.isComplex) ?? normalizeBoolean(decomposition.is_complex) ?? false;
  if (!isComplex) {
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
    intent: normalizeIntent(decomposition.intent),
    needClarification,
    clarificationQuestion,
    steps: normalizedSteps,
    executionLevels,
    finalAnswerPlan:
      normalizeString(decomposition.finalAnswerPlan) ?? normalizeString(decomposition.final_answer_plan),
  };
}
