import { fornaxExecute } from '../../fornax/llm';
import { buildQueryPlanDag, parseQueryDecompositionJson } from '../queryPlanDag';
import type { RagGraphOutput } from '../ragGraphState';

type QueryDecomposeExecutor = (input: {
  promptKey: string;
  variables?: Record<string, unknown>;
}) => Promise<{ ok: boolean; text: string; error?: unknown }>;

const PROMPT_KEY = 'demo.agentic_rag_planing.prompt';

// query理解和拆分节点
export function createPlanQueryNode(execute: QueryDecomposeExecutor = fornaxExecute) {
  return async (state: Partial<RagGraphOutput>) => {
    const query = state.rewrittenQuery ?? state.question ?? '';
    const result = query
      ? await execute({
          promptKey: PROMPT_KEY,
          variables: {
            query,
            original_query: state.question ?? query,
          },
        })
      : null;
    const decomposition =
      result?.ok && result.text ? parseQueryDecompositionJson(result.text) : null;
    const queryPlanDag = buildQueryPlanDag({
      question: state.question,
      rewrittenQuery: state.rewrittenQuery,
      decomposition,
    });

    return {
      queryPlan: queryPlanDag.steps.map((step) => step.query),
      queryPlanDag,
    };
  };
}
