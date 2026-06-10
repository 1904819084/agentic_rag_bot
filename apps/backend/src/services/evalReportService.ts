import path from 'node:path';
import { Injectable } from '@gulux/gulux';
import type { ListEvalCasesResponse, RagEvalReport } from '@rag/shared';
import { readEvalCases } from '../../evals/utils/evalCases';
import { readJsonFile } from '../utils/jsonFile';
import { AppError } from '../utils/appError';

const EVAL_DIR = path.resolve(process.cwd(), 'evals');
const EVAL_REPORTS_DIR = path.join(EVAL_DIR, 'reports');

function assertSafeReportDirName(reportDirName: string) {
  if (!/^[\w.-]+$/.test(reportDirName)) {
    throw new AppError('invalid_eval_report_id', 400, 'invalid eval report id');
  }
}

@Injectable()
export default class EvalReportService {
  public async listCases(): Promise<ListEvalCasesResponse> {
    return {
      items: await readEvalCases(),
    };
  }

  public async getReport(reportDirName: string) {
    return this.readReport(reportDirName);
  }

  private async readReport(reportDirName: string) {
    assertSafeReportDirName(reportDirName);

    try {
      return await readJsonFile<RagEvalReport>(
        path.join(EVAL_REPORTS_DIR, reportDirName, 'report.json'),
      );
    } catch {
      throw new AppError('eval_report_not_found', 404, 'eval report not found');
    }
  }
}
