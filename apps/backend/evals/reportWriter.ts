import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RagEvalReport } from './types';
import { createEvalReportDirName } from './utils/evalTime';

const REPORT_DIR = path.resolve(process.cwd(), 'evals/reports');

export async function writeEvalReports(report: RagEvalReport, reportDirName?: string) {
  const jsonReport = `${JSON.stringify(report, null, 2)}\n`;
  const reportDir = path.join(
    REPORT_DIR,
    reportDirName ?? createEvalReportDirName(report.generatedAt),
  );

  await mkdir(REPORT_DIR, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  await writeFile(path.join(reportDir, 'report.json'), jsonReport, 'utf8');

  return {
    reportDir,
    reportJsonPath: path.join(reportDir, 'report.json'),
  };
}
