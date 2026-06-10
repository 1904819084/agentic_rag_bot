import { readJsonFile } from '../../src/utils/jsonFile';
import type { RagEvalCase } from '../types';
import { resolveEvalCasesPath } from './evalConfig';

export async function readEvalCases() {
  const rawCases = await readJsonFile<RagEvalCase[]>(resolveEvalCasesPath());

  return rawCases.filter((evalCase) => evalCase.id && evalCase.question);
}
