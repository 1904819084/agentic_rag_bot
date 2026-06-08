import { fornaxExecute } from '../../fornax/llm';
import type { RagGraphOutput } from '../../types';
import { formatMemoryContexts, formatRecentMessages } from '../../utils/contextBuilder';
import { buildQueryPlan, parseQueryPlanJson } from '../queryPlan';

const PROMPT_KEY = 'demo.agentic_rag_planing.prompt';
type PlaningExecutor = typeof fornaxExecute;

// query 理解和拆分节点
export function createPlanQueryNode(executePlaning: PlaningExecutor = fornaxExecute) {
  return async (state: Partial<RagGraphOutput>) => {
    const query = state.rewrittenQuery ?? state.question ?? '';
    const result = query
      ? await executePlaning({
          promptKey: PROMPT_KEY,
          variables: {
            original_query: state.question ?? query,
            rewritten_query: query,
            conversation_summary: state.conversationSummary ?? '',
            recent_messages: formatRecentMessages(state.recentMessages ?? []),
            memory_context: formatMemoryContexts(state.memories ?? []),
          },
        })
      : null;
    const decomposition = result?.ok && result.text ? parseQueryPlanJson(result.text) : null;
    const queryPlan = buildQueryPlan({
      question: state.question,
      rewrittenQuery: state.rewrittenQuery,
      decomposition,
    });

    return {
      queryPlan,
    };
  };
}
