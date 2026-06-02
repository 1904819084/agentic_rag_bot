import { fornaxExecute } from '../../fornax/llm';
import type { RagGraphOutput } from '../ragGraphState';

const PROMPT_KEY = 'demo.agentic_rag_queryRewrite.prompt';

// query改写节点
export function createRewriteQueryNode() {
  return async (state: Partial<RagGraphOutput>) => {
    const question = state.question ?? '';
    const result = await fornaxExecute({
      promptKey: PROMPT_KEY,
      variables: { query: question },
    });

    return {
      rewrittenQuery: result.ok && result.text ? result.text : question,
    };
  };
}
