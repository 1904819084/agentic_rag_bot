import type { EvalFailureReason, RagEvalCaseResult, RagEvalReport } from '@rag/shared';

export const FAILURE_LABEL: Record<EvalFailureReason, string> = {
  pass: '通过',
  retrieval_failure: '检索失败',
  faithfulness_failure: '忠实性失败',
  generation_failure: '生成失败',
  incomplete_answer: '回答不完整',
};

export const FAILURE_COLOR: Record<EvalFailureReason, string> = {
  pass: 'green',
  retrieval_failure: 'red',
  faithfulness_failure: 'orange',
  generation_failure: 'gold',
  incomplete_answer: 'blue',
};

export function formatPercent(value?: number | null) {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

export function getParentRecallMetric(metrics: RagEvalCaseResult['metrics']) {
  const [metricName, value] = Object.entries(metrics.parentRecallAtK)[0] ?? [];

  return {
    metricName: metricName ?? 'parentRecall',
    value,
  };
}

export function getSummaryParentRecall(report?: RagEvalReport) {
  const [metricName, value] = Object.entries(report?.summary.parentRecallAtK ?? {})[0] ?? [];

  return {
    metricName: metricName ?? 'parentRecall',
    value,
  };
}

export function formatMetricName(metricName?: string) {
  if (!metricName) {
    return '父块召回率';
  }

  return metricName.replace('parentRecall', '父块召回率');
}
