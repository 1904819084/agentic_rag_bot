import type {
  QueryPlanStepResult,
  QueryPlanTask,
  RetrievedContext,
} from '@rag/shared';
import { fornaxExecute } from '../../fornax/llm';
import type { RagGraphOutput, RetrievalSearchOptions } from '../../types';
import { buildExecutionLevels } from '../queryPlan';

type SearchService = {
  search(query: string, options?: RetrievalSearchOptions): Promise<RetrievedContext[]>;
};
type StepAnswerInput = {
  query: string;
  taskType?: QueryPlanTask['type'];
  contexts: RetrievedContext[];
  dependencyResults: QueryPlanStepResult[];
};
type StepAnswerGenerator = (input: StepAnswerInput) => Promise<string>;

const STEP_ANSWER_PROMPT_KEY = 'demo.agentic_rag_reasoning.prompt';

function dedupeContexts(contexts: RetrievedContext[]) {
  const seen = new Set<string>();
  return contexts.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function formatStepContexts(contexts: RetrievedContext[]) {
  return contexts
    .map((context, index) =>
      [`[资料 ${index + 1}]`, `标题：${context.title}`, `内容：${context.content}`]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

// 格式化前置依赖步骤结果
export function formatDependencySummary(results: QueryPlanStepResult[]) {
  return results
    .map((result) =>
      [
        `[依赖步骤 ${result.stepId}]`,
        `问题：${result.query}`,
        result.searchQuery ? `检索问题：${result.searchQuery}` : undefined,
        result.answer ? `中间答案：${result.answer}` : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

// 格式
export function formatDependencyResultsForReasoning(results: QueryPlanStepResult[]) {
  return results
    .map((result) =>
      [
        formatDependencySummary([result]),
        result.contexts.length ? ['命中资料：', formatStepContexts(result.contexts)].join('\n') : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

export function buildDependencyAwareRetrievalQuery(
  query: string,
  dependencyResults: QueryPlanStepResult[],
) {
  const dependencyText = formatDependencySummary(dependencyResults);
  if (!dependencyText) {
    return query;
  }

  return [`当前子问题：${query}`, '上游依赖结果：', dependencyText].join('\n');
}

async function defaultStepAnswerGenerator({
  query,
  taskType,
  contexts,
  dependencyResults,
}: StepAnswerInput) {
  const result = await fornaxExecute({
    promptKey: STEP_ANSWER_PROMPT_KEY,
    variables: {
      query,
      task_type: taskType ?? 'reasoning',
      contexts: formatStepContexts(contexts),
      dependency_answers: formatDependencyResultsForReasoning(dependencyResults),
      citation_rules: '这是 DAG 推理子任务的中间答案。只能基于依赖步骤和传入资料回答。',
    },
  });

  if (result.ok && result.text) {
    return result.text;
  }

  return dependencyResults.length || contexts.length
    ? '已读取依赖步骤或资料，但推理子任务生成失败。'
    : '当前推理子任务缺少依赖步骤或资料。';
}

function buildRetrieveStepAnswer(contexts: RetrievedContext[]) {
  return contexts.length
    ? `已检索到 ${contexts.length} 条相关资料。`
    : '当前检索子任务未检索到可用资料。';
}

// 执行计划节点，根据 queryPlan.tasks 推导执行层级并执行检索或推理子任务
export function createExecutePlanNode(
  retrievalService: SearchService,
  generateStepAnswer: StepAnswerGenerator = defaultStepAnswerGenerator,
) {
  return async (state: Partial<RagGraphOutput>) => {
    const tasks = state.queryPlan?.tasks ?? [];
    const executionLevels = buildExecutionLevels(
      tasks.map((task) => ({ ...task, dependsOn: [...task.dependsOn] })),
    );

    if (executionLevels?.length && tasks.length) {
      const taskById = new Map(tasks.map((task) => [task.id, task]));
      const stepResults: QueryPlanStepResult[] = [];
      const resultByStepId = new Map<number, QueryPlanStepResult>();

      for (const level of executionLevels) {
        const levelResults = await Promise.all(
          level.map(async (taskId) => {
            const task = taskById.get(taskId);
            if (!task) {
              return null;
            }

            const dependencyResults = task.dependsOn
              .map((dependencyStepId) => resultByStepId.get(dependencyStepId))
              .filter((result): result is QueryPlanStepResult => Boolean(result));
            const taskType = task.type;
            const searchQuery = taskType === 'retrieve'
              ? buildDependencyAwareRetrievalQuery(
                  task.query,
                  dependencyResults,
                )
              : undefined;
            const contexts = taskType === 'retrieve'
              ? await retrievalService.search(searchQuery ?? task.query, {
                  userId: state.userId,
                })
              : [];
            const answer = taskType === 'retrieve'
              ? buildRetrieveStepAnswer(contexts)
              : await generateStepAnswer({
                  query: task.query,
                  taskType,
                  contexts,
                  dependencyResults,
                });

            return {
              stepId: task.id,
              query: task.query,
              searchQuery,
              taskType,
              dependencyStepIds: task.dependsOn,
              answer,
              contexts,
            };
          }),
        );

        const completedLevelResults = levelResults.filter(
          (result): result is NonNullable<(typeof levelResults)[number]> => Boolean(result),
        );
        for (const result of completedLevelResults) {
          resultByStepId.set(result.stepId, result);
        }
        stepResults.push(...completedLevelResults);
      }

      return {
        stepResults,
        contexts: dedupeContexts(stepResults.flatMap((step) => step.contexts)),
      };
    }

    const query = state.rewrittenQuery ?? state.question ?? '';
    const contexts = query
      ? dedupeContexts(await retrievalService.search(query, { userId: state.userId }))
      : [];

    return { contexts };
  };
}
