import type { EvalFailureReason, RagEvalReport } from '../types';
import { formatEvalDisplayTime } from './evalTime';

function formatPercentage(value: number | null | undefined) {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

function createFailureCountRows(failureCounts: Record<EvalFailureReason, number>) {
  return Object.entries(failureCounts)
    .map(([reason, count]) => `| ${reason} | ${count} |`)
    .join('\n');
}

function createCaseSection(report: RagEvalReport) {
  return report.cases
    .map((caseResult) => {
      const parentRecallRows = Object.entries(caseResult.metrics.parentRecallAtK)
        .map(([metric, value]) => `- ${metric}: ${formatPercentage(value)}`)
        .join('\n');
      const retrievedParentIds = caseResult.retrievedParentIds.length
        ? caseResult.retrievedParentIds.map((id) => `  - ${id}`).join('\n')
        : '  - 无';

      return [
        `### ${caseResult.caseId}`,
        '',
        `Question: ${caseResult.question}`,
        '',
        `Likely Cause: ${caseResult.likelyCause}`,
        '',
        'Metrics:',
        parentRecallRows,
        `- answerCorrectness: ${formatPercentage(caseResult.metrics.answerCorrectness)}`,
        `- answerFaithfulness: ${formatPercentage(caseResult.metrics.answerFaithfulness)}`,
        `- answerCompleteness: ${formatPercentage(caseResult.metrics.answerCompleteness)}`,
        '',
        'Retrieved Parent IDs:',
        retrievedParentIds,
        '',
        'Missing Answer Points:',
        caseResult.metrics.missingAnswerPoints.length
          ? caseResult.metrics.missingAnswerPoints.map((point) => `- ${point}`).join('\n')
          : '- 无',
        '',
        'Unsupported Claims:',
        caseResult.metrics.unsupportedClaims.length
          ? caseResult.metrics.unsupportedClaims.map((claim) => `- ${claim}`).join('\n')
          : '- 无',
        '',
        'Answer:',
        '',
        caseResult.answer || '无',
      ].join('\n');
    })
    .join('\n\n');
}

export function createMarkdownReport(report: RagEvalReport) {
  const parentRecallRows = Object.entries(report.summary.parentRecallAtK)
    .map(([metric, value]) => `| ${metric} | ${formatPercentage(value)} |`)
    .join('\n');

  return [
    '# Agentic RAG Eval Report',
    '',
    `Generated At: ${formatEvalDisplayTime(report.generatedAt)}`,
    '',
    `Total Cases: ${report.totalCases}`,
    '',
    '## Summary',
    '',
    '| Metric | Score |',
    '|---|---:|',
    parentRecallRows,
    `| answerCorrectnessAvg | ${formatPercentage(report.summary.answerCorrectnessAvg)} |`,
    `| answerFaithfulnessAvg | ${formatPercentage(report.summary.answerFaithfulnessAvg)} |`,
    `| answerCompletenessAvg | ${formatPercentage(report.summary.answerCompletenessAvg)} |`,
    '',
    '## Failure Counts',
    '',
    '| Reason | Count |',
    '|---|---:|',
    createFailureCountRows(report.summary.failureCounts),
    '',
    '## Cases',
    '',
    createCaseSection(report),
    '',
  ].join('\n');
}
