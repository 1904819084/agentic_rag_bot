import { buildAnswerContext } from '../../utils/contextBuilder';
import type { RagGraphOutput } from '../ragGraphState';

// 构建上下文节点
export function createBuildContextNode() {
  return async (state: Partial<RagGraphOutput>) => {
    const { citations, formattedContexts } = buildAnswerContext(state.contexts ?? []);
    return { citations, formattedContexts };
  };
}
