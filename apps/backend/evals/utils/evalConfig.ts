import path from 'node:path';
import { env } from '../../src/config/env';

const DEFAULT_CASES_PATH = path.resolve(process.cwd(), 'evals/cases/rag_eval_cases.json');

export const EVAL_USER_ID = 'eval-user';

export const EVAL_PARENT_RECALL_K = env.retrieval.topK;

export const EVAL_PARENT_RECALL_KEY = `parentRecall@${EVAL_PARENT_RECALL_K}`;

export function resolveEvalCasesPath() {
  return process.env.RAG_EVAL_CASES_PATH
    ? path.resolve(process.cwd(), process.env.RAG_EVAL_CASES_PATH)
    : DEFAULT_CASES_PATH;
}
