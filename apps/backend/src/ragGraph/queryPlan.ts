import type { QueryPlan, QueryPlanTask, QueryPlanTaskType } from '@rag/shared';

export type FornaxQueryPlan = {
  steps?: Array<{
    id?: unknown;
    type?: unknown;
    taskType?: unknown;
    task_type?: unknown;
    query?: unknown;
    question?: unknown;
    depends?: unknown;
    dependsOn?: unknown;
    depends_on?: unknown;
  }>;
};

const VALID_TASK_TYPES = new Set<QueryPlanTaskType>([
  'retrieve',
  'reasoning',
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

function normalizeTaskType(value: unknown): QueryPlanTaskType | null {
  if (value === undefined || value === null || value === '') {
    return 'retrieve';
  }
  if (typeof value === 'string' && VALID_TASK_TYPES.has(value as QueryPlanTaskType)) {
    return value as QueryPlanTaskType;
  }
  return null;
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

function createFallbackPlan(input: { question?: string; rewrittenQuery?: string }): QueryPlan {
  const query = normalizeFallbackQuery(input);
  return {
    tasks: query
      ? [
          {
            id: 1,
            type: 'retrieve',
            query,
            dependsOn: [],
          },
        ]
      : [],
  };
}

function normalizeDepends(rawStep: NonNullable<FornaxQueryPlan['steps']>[number]) {
  const depends = rawStep.dependsOn ?? rawStep.depends_on ?? rawStep.depends;
  return Array.isArray(depends)
    ? depends.filter(
        (item): item is number => typeof item === 'number' && Number.isInteger(item),
      )
    : [];
}

function toTask(
  rawStep: NonNullable<FornaxQueryPlan['steps']>[number],
): QueryPlanTask | null {
  const id = typeof rawStep.id === 'number' && Number.isInteger(rawStep.id) ? rawStep.id : null;
  const type = normalizeTaskType(rawStep.type ?? rawStep.taskType ?? rawStep.task_type);
  const query = normalizeString(rawStep.query) ?? normalizeString(rawStep.question) ?? '';
  const dependsOn = normalizeDepends(rawStep);

  if (id === null || id <= 0 || !type || !query) {
    return null;
  }

  if (type === 'reasoning' && dependsOn.length === 0) {
    return null;
  }

  return {
    id,
    type,
    query,
    dependsOn,
  };
}

export function buildExecutionLevels(tasks: QueryPlanTask[]) {
  const taskIds = new Set(tasks.map((task) => task.id));
  const inDegree = new Map<number, number>();
  const outgoing = new Map<number, number[]>();

  for (const task of tasks) {
    if (inDegree.has(task.id)) {
      return null;
    }

    inDegree.set(task.id, 0);
    outgoing.set(task.id, []);
  }

  for (const task of tasks) {
    const uniqueDependsOn = Array.from(new Set(task.dependsOn));
    if (uniqueDependsOn.some((dependency) => !taskIds.has(dependency) || dependency === task.id)) {
      return null;
    }

    task.dependsOn = uniqueDependsOn;
    inDegree.set(task.id, uniqueDependsOn.length);
    for (const dependency of uniqueDependsOn) {
      outgoing.get(dependency)?.push(task.id);
    }
  }

  const executionLevels: number[][] = [];
  let ready = tasks.filter((task) => inDegree.get(task.id) === 0).map((task) => task.id);
  const visited = new Set<number>();

  while (ready.length) {
    executionLevels.push(ready);
    const nextReady: number[] = [];

    for (const taskId of ready) {
      visited.add(taskId);
      for (const dependent of outgoing.get(taskId) ?? []) {
        const nextInDegree = (inDegree.get(dependent) ?? 0) - 1;
        inDegree.set(dependent, nextInDegree);
        if (nextInDegree === 0) {
          nextReady.push(dependent);
        }
      }
    }

    ready = nextReady;
  }

  if (visited.size !== tasks.length) {
    return null;
  }

  return executionLevels;
}

export function parseQueryPlanJson(text: string): FornaxQueryPlan | null {
  if (!text.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(stripMarkdownCodeFence(text)) as FornaxQueryPlan;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.steps)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildQueryPlan({
  question,
  rewrittenQuery,
  decomposition,
}: {
  question?: string;
  rewrittenQuery?: string;
  decomposition?: FornaxQueryPlan | null;
}): QueryPlan {
  if (!decomposition || !Array.isArray(decomposition.steps) || decomposition.steps.length === 0) {
    return createFallbackPlan({ question, rewrittenQuery });
  }

  const tasks = decomposition.steps.map(toTask);
  if (tasks.some((task) => task === null)) {
    return createFallbackPlan({ question, rewrittenQuery });
  }

  const normalizedTasks = tasks as QueryPlanTask[];
  if (!buildExecutionLevels(normalizedTasks)) {
    return createFallbackPlan({ question, rewrittenQuery });
  }

  return { tasks: normalizedTasks };
}
