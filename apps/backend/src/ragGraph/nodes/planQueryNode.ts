import { fornaxExecute } from '../../fornax/llm';
import type { RagGraphOutput } from '../../types';
import { buildQueryPlanDag, parseQueryDecompositionJson } from '../queryPlanDag';

const PROMPT_KEY = 'demo.agentic_rag_planing.prompt';

// query 理解和拆分节点
export function createPlanQueryNode() {
  return async (state: Partial<RagGraphOutput>) => {
    const query = state.rewrittenQuery ?? state.question ?? '';
    const result = query
      ? await fornaxExecute({
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
