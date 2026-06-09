import type { EvalFailureReason, RagEvalCaseResult, RagEvalReport } from '../types';

function average(values: Array<number | null | undefined>) {
  const numericValues = values.filter((value): value is number => typeof value === 'number');
  if (!numericValues.length) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function createFailureCounts(results: RagEvalCaseResult[]) {
  const initialCounts: Record<EvalFailureReason, number> = {
    pass: 0,
    retrieval_failure: 0,
    faithfulness_failure: 0,
    generation_failure: 0,
    incomplete_answer: 0,
  };

  return results.reduce((counts, result) => {
    counts[result.likelyCause] += 1;
    return counts;
  }, initialCounts);
}

export function createEvalSummary(
  results: RagEvalCaseResult[],
  parentRecallKey: string,
): RagEvalReport['summary'] {
  return {
    parentRecallAtK: {
      [parentRecallKey]: average(
        results.map((result) => result.metrics.parentRecallAtK[parentRecallKey]),
      ),
    },
    answerCorrectnessAvg: average(results.map((result) => result.metrics.answerCorrectness)) ?? 0,
    answerFaithfulnessAvg: average(results.map((result) => result.metrics.answerFaithfulness)) ?? 0,
    answerCompletenessAvg: average(results.map((result) => result.metrics.answerCompleteness)) ?? 0,
    failureCounts: createFailureCounts(results),
  };
}
