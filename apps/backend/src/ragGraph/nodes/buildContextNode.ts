import type { RagGraphOutput } from '../../types';
import { buildReferenceDocumentContext } from '../../utils/contextBuilder';

// 构建上下文节点
export function createBuildContextNode() {
  return async (state: Partial<RagGraphOutput>) => {
    const { referenceDocuments } = buildReferenceDocumentContext(state.contexts ?? []);
    return {
      referenceDocuments,
    };
  };
}
