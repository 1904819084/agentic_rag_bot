import type { RetrievedContext } from '@rag/shared';
import { fornaxExecute } from '../src/fornax/llm';
import { formatRetrievedContextsForPrompt } from '../src/utils/contextBuilder';
import type { AnswerQualityMetrics } from './types';
import { parseJsonObject } from './utils/json';
import { clampRatio, normalizeStringArray } from './utils/normalizers';

const JUDGE_PROMPT_KEY = 'demo.agentic_rag_eval.prompt';

type JudgeResponse = Partial<AnswerQualityMetrics>;

export async function judgeAnswer(input: {
  question: string;
  contexts: RetrievedContext[];
  answer: string;
  expectedAnswerPoints: string[];
  forbiddenClaims: string[];
}): Promise<AnswerQualityMetrics> {
  const result = await fornaxExecute({
    promptKey: JUDGE_PROMPT_KEY,
    variables: {
      question: input.question,
      retrieved_contexts: formatRetrievedContextsForPrompt(input.contexts),
      answer: input.answer,
      expected_answer_points: JSON.stringify(input.expectedAnswerPoints, null, 2),
      forbidden_claims: JSON.stringify(input.forbiddenClaims, null, 2),
    },
  });

  if (!result.ok) {
    throw new Error(`Fornax judge failed: ${result.error ?? 'unknown_error'}`);
  }

  if (!result.text) {
    throw new Error('Fornax judge returned empty text.');
  }

  const parsed = parseJsonObject<JudgeResponse>(result.text);
  if (!parsed) {
    throw new Error(`Fornax judge returned invalid JSON: ${result.text}`);
  }

  const coveredAnswerPoints = normalizeStringArray(parsed.coveredAnswerPoints);
  const missingAnswerPoints = normalizeStringArray(parsed.missingAnswerPoints);

  return {
    answerCorrectness: clampRatio(parsed.answerCorrectness),
    answerFaithfulness: clampRatio(parsed.answerFaithfulness),
    answerCompleteness: clampRatio(parsed.answerCompleteness),
    coveredAnswerPoints,
    missingAnswerPoints: missingAnswerPoints.length
      ? missingAnswerPoints
      : input.expectedAnswerPoints.filter((point) => !coveredAnswerPoints.includes(point)),
    unsupportedClaims: normalizeStringArray(parsed.unsupportedClaims),
    judgeReason: typeof parsed.judgeReason === 'string' ? parsed.judgeReason : '',
  };
}
