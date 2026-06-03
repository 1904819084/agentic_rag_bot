import type { QueryPlanStepResult, RetrievedContext } from '@rag/shared';
import { fornaxExecute } from '../../fornax/llm';
import type { RagGraphOutput, RetrievalSearchOptions } from '../../types';

type SearchService = {
  search(query: string, options?: RetrievalSearchOptions): Promise<RetrievedContext[]>;
};
type StepAnswerInput = {
  query: string;
  contexts: RetrievedContext[];
  dependencyResults: QueryPlanStepResult[];
};
type StepAnswerGenerator = (input: StepAnswerInput) => Promise<string>;

const STEP_ANSWER_PROMPT_KEY = 'demo.agentic_rag_answerGenerate.prompt';

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
      [
        `[资料 ${index + 1}]`,
        `标题：${context.title}`,
        context.sectionPath?.length ? `章节：${context.sectionPath.join(' > ')}` : undefined,
        `内容：${context.content}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

function formatDependencyResults(results: QueryPlanStepResult[]) {
  return results
    .map((result) =>
      [
        `[依赖步骤 ${result.stepId}]`,
        `问题：${result.query}`,
        result.answer ? `中间答案：${result.answer}` : undefined,
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
  const dependencyText = formatDependencyResults(dependencyResults);
  if (!dependencyText) {
    return query;
  }

  return [`当前子问题：${query}`, '上游依赖结果：', dependencyText].join('\n');
}

async function defaultStepAnswerGenerator({ query, contexts, dependencyResults }: StepAnswerInput) {
  const result = await fornaxExecute({
    promptKey: STEP_ANSWER_PROMPT_KEY,
    variables: {
      query,
      contexts: formatStepContexts(contexts),
      dependency_answers: formatDependencyResults(dependencyResults),
      citation_rules: '这是 DAG 子问题的中间答案。只能基于资料和依赖步骤回答；资料不足时说明不足。',
    },
  });

  if (result.ok && result.text) {
    return result.text;
  }

  return contexts.length
    ? `已检索到 ${contexts.length} 条相关资料，但中间答案生成失败。`
    : '当前子问题未检索到可用资料。';
}

// 检索节点，根据queryPlanDag执行检索
export function createRetrieveNode(
  retrievalService: SearchService,
  generateStepAnswer: StepAnswerGenerator = defaultStepAnswerGenerator,
) {
  return async (state: Partial<RagGraphOutput>) => {
    const steps = state.queryPlanDag?.steps ?? [];
    if (state.queryPlanDag?.executionLevels?.length && steps.length) {
      const stepById = new Map(steps.map((step) => [step.id, step]));
      const stepResults: QueryPlanStepResult[] = [];
      const resultByStepId = new Map<number, QueryPlanStepResult>();

      for (const level of state.queryPlanDag.executionLevels) {
        const levelResults = await Promise.all(
          level.map(async (stepId) => {
            const step = stepById.get(stepId);
            if (!step) {
              return null;
            }

            const dependencyResults = step.depends
              .map((dependencyStepId) => resultByStepId.get(dependencyStepId))
              .filter((result): result is QueryPlanStepResult => Boolean(result));
            const retrievalQuery = buildDependencyAwareRetrievalQuery(
              step.query,
              dependencyResults,
            );
            const contexts = await retrievalService.search(retrievalQuery, {
              userId: state.userId,
            });
            const answer = await generateStepAnswer({
              query: step.query,
              contexts,
              dependencyResults,
            });

            return {
              stepId: step.id,
              query: step.query,
              dependencyStepIds: step.depends,
              answer,
              contexts,
            };
          }),
        );

        const completedLevelResults = levelResults.filter((result): result is QueryPlanStepResult =>
          Boolean(result),
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

    const queries = state.queryPlan?.length ? state.queryPlan : [state.question ?? ''];
    const results = await Promise.all(
      queries
        .filter(Boolean)
        .map((query) => retrievalService.search(query, { userId: state.userId })),
    );
    const contexts = dedupeContexts(results.flat());

    return { contexts };
  };
}
