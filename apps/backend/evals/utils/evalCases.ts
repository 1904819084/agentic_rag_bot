import { readFile } from 'node:fs/promises';
import type { RagEvalCase } from '../types';
import { resolveEvalCasesPath } from './evalConfig';

// 读取评估用例
export async function readEvalCases() {
  const rawCases = JSON.parse(await readFile(resolveEvalCasesPath(), 'utf8')) as RagEvalCase[];

  return rawCases.filter((evalCase) => evalCase.id && evalCase.question);
}
