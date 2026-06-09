import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RagEvalReport } from './types';
import { createEvalReportDirName } from './utils/evalTime';
import { createMarkdownReport } from './utils/markdownReport';

const REPORT_DIR = path.resolve(process.cwd(), 'evals/reports');

export async function writeEvalReports(report: RagEvalReport) {
  const markdownReport = createMarkdownReport(report);
  const jsonReport = `${JSON.stringify(report, null, 2)}\n`;
  const runReportDir = path.join(REPORT_DIR, createEvalReportDirName(report.generatedAt));

  await mkdir(REPORT_DIR, { recursive: true });
  await mkdir(runReportDir, { recursive: true });

  await Promise.all([
    writeFile(path.join(runReportDir, 'report.json'), jsonReport, 'utf8'),
    writeFile(path.join(runReportDir, 'report.md'), markdownReport, 'utf8'),
  ]);

  return {
    runReportDir,
    reportJsonPath: path.join(runReportDir, 'report.json'),
    reportMarkdownPath: path.join(runReportDir, 'report.md'),
  };
}
