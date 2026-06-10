import { evaluateCase } from './evaluateCase';
import { writeEvalReports } from './reportWriter';
import { createEvalRagGraphService } from './serviceFactory';
import type { RagEvalCaseResult, RagEvalReport } from './types';
import { EVAL_PARENT_RECALL_KEY } from './utils/evalConfig';
import { readEvalCases } from './utils/evalCases';
import { createEvalSummary } from './utils/evalSummary';
import { createEvalGeneratedAt } from './utils/evalTime';

// 执行端到端的评测
export async function runEndToEndEval(reportDirName?: string) {
  const evalCases = await readEvalCases();
  const ragGraphService = createEvalRagGraphService();
  const results: RagEvalCaseResult[] = [];

  for (const evalCase of evalCases) {
    // Run sequentially to keep Fornax, DB, and embedding dependencies predictable.
    results.push(await evaluateCase(evalCase, ragGraphService));
  }

  const report: RagEvalReport = {
    generatedAt: createEvalGeneratedAt(),
    totalCases: results.length,
    summary: createEvalSummary(results, EVAL_PARENT_RECALL_KEY),
    cases: results,
  };
  await writeEvalReports(report, reportDirName);
  return report;
}

if (process.argv[1]?.endsWith('runEndToEndEval.ts')) {
  runEndToEndEval()
    .then((report) => {
      console.log(`RAG eval completed: ${report.totalCases} cases`);
      console.log(`Report written under evals/reports`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? (error.stack ?? error.message) : error);
      process.exitCode = 1;
    });
}
