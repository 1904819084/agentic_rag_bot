// 计算单个 case 的父块召回率
export function calculateParentRecall(input: {
  expectedParentChunkIds: string[];
  retrievedParentChunkIds: string[];
  k: number;
}) {
  if (!input.expectedParentChunkIds.length) {
    return null;
  }

  const expected = new Set(input.expectedParentChunkIds);
  const retrievedTopK = input.retrievedParentChunkIds.slice(0, input.k);
  const hitCount = retrievedTopK.filter((parentChunkId) => expected.has(parentChunkId)).length;

  return hitCount / expected.size;
}
