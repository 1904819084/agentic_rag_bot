import { fornaxExecute } from '../../fornax/llm';
import type { RagGraphOutput } from '../ragGraphState';

const PROMPT_KEY = 'demo.agentic_rag_rewrite.prompt';

/**
 * 从 LLM 返回文本中提取改写后的 query。
 * 期望的标准格式是 JSON：{ "newquery": "...", "oldquery": "..." }，
 * 兼容退化的 key: value 文本（newquery: xxx），都失败时返回空串让上游回退到原 question。
 */
function extractNewQuery(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  // 1) 标准 JSON
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const value = parsed.newquery ?? parsed.newQuery ?? parsed.new_query;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  } catch {
    // 不是 JSON，进入正则兜底
  }

  // 2) 文本兜底：匹配 newquery: xxx，到行尾或下一个已知字段
  const match = trimmed.match(/newquery\s*[:：]\s*([^\n\r]+)/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  return '';
}

// query 改写节点
export function createRewriteQueryNode() {
  return async (state: Partial<RagGraphOutput>) => {
    const question = state.question ?? '';
    const result = await fornaxExecute({
      promptKey: PROMPT_KEY,
      variables: { query: question },
    });

    const newQuery = result.ok ? extractNewQuery(result.text) : '';

    return {
      rewrittenQuery: newQuery || question,
    };
  };
}
