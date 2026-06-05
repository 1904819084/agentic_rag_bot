import { fornaxExecute } from '../../fornax/llm';
import type { RagGraphOutput } from '../../types';
import { formatMemoryContexts, formatRecentMessages } from '../../utils/contextBuilder';

const PROMPT_KEY = 'demo.agentic_rag_rewrite.prompt';

// query 改写节点
// fornax prompt 输出格式：choices[0].message.content 即改写后的 query 纯文本
// llm.ts 的 normalizeTextResult 已抽出 content，这里直接 trim 使用
export function createRewriteQueryNode() {
  return async (state: Partial<RagGraphOutput>) => {
    const question = state.question ?? '';
    const result = await fornaxExecute({
      promptKey: PROMPT_KEY,
      variables: {
        current_question: question,
        conversation_summary: state.conversationSummary ?? '',
        recent_messages: formatRecentMessages(state.recentMessages ?? []),
        user_memory: formatMemoryContexts(state.memories ?? []),
      },
    });

    const newQuery = result.ok ? result.text.trim() : '';

    return {
      rewrittenQuery: newQuery || question,
    };
  };
}
