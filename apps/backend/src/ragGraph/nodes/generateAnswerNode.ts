import type { QueryPlanStepResult, RetrievedContext } from '@rag/shared';
import { fornaxExecute } from '../../fornax/llm';
import type { RagGraphOutput } from '../../types';
import {
  formatCitationRules,
  formatMemoryContexts,
  formatRetrievedContextsForPrompt,
  formatRecentMessages,
} from '../../utils/contextBuilder';

const PROMPT_KEY = 'demo.agentic_rag_answer.prompt';
const EMPTY_CONTEXT_PATTERNS = [
  '材料内容没有提供',
  '检索的材料为空',
  '检索材料的内容没有提供',
  '没有提供相关材料内容',
];

type AnswerExecutor = typeof fornaxExecute;

export function formatStepResultsForFinalAnswer(steps: QueryPlanStepResult[] = []) {
  if (!steps.length) {
    return '';
  }

  return steps
    .map((step) =>
      [
        `[步骤 ${step.stepId}]`,
        `类型：${step.taskType ?? 'retrieve'}`,
        `子问题：${step.query}`,
        step.searchQuery ? `检索式：${step.searchQuery}` : undefined,
        step.dependencyStepIds.length ? `依赖步骤：${step.dependencyStepIds.join(', ')}` : '依赖步骤：无',
        step.answer ? `中间答案：${step.answer}` : undefined,
        step.contexts.length
          ? `命中资料：${step.contexts.map((context) => context.title).join('；')}`
          : '命中资料：无',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

function looksLikeEmptyContextAnswer(answer: string) {
  return EMPTY_CONTEXT_PATTERNS.some((pattern) => answer.includes(pattern));
}

function extractRelevantSentences(content: string, query: string) {
  const keywords = Array.from(new Set(query.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,}/g) ?? []));
  const sentences = content
    .replace(/^#{1,6}\s+/gm, '')
    .split(/(?<=[。！？!?；;])|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 8);
  const matched = sentences.filter((sentence) =>
    keywords.some((keyword) => sentence.includes(keyword)),
  );
  return (matched.length ? matched : sentences).slice(0, 5);
}

export function buildAnswerFallback(input: {
  question?: string;
  rewrittenQuery?: string;
  contexts?: RetrievedContext[];
}) {
  const contexts = input.contexts ?? [];
  if (!contexts.length) {
    return '当前知识库暂未检索到可用资料。请先上传相关文档，或调整问题后重试。';
  }

  const query = input.rewrittenQuery ?? input.question ?? '';
  const contextLines = contexts.slice(0, 3).flatMap((context) =>
    extractRelevantSentences(context.content, query),
  );
  const bullets = Array.from(new Set(contextLines)).slice(0, 6);

  if (!bullets.length) {
    return '已检索到相关资料，但当前大模型未能生成答案。请调整问题后重试。';
  }

  return [
    '根据已检索到的资料，可以先得到以下信息：',
    ...bullets.map((line) => `- ${line}`),
    '',
    '以上内容来自本次命中的知识库资料。',
  ].join('\n');
}

// 生成最终答案节点：整理上下文和步骤结果，调用最终回答 prompt。
export function createGenerateAnswerNode(executeAnswer: AnswerExecutor = fornaxExecute) {
  return async (state: Partial<RagGraphOutput>) => {
    const result = await executeAnswer({
      promptKey: PROMPT_KEY,
      variables: {
        original_query: state.question ?? '',
        rewrite_query: state.rewrittenQuery ?? '',
        recent_messages: formatRecentMessages(state.recentMessages ?? []),
        user_memory: formatMemoryContexts(state.memories ?? []),
        contexts: formatRetrievedContextsForPrompt(state.contexts),
        step_results: formatStepResultsForFinalAnswer(state.stepResults ?? []),
        citation_rules: formatCitationRules(),
      },
    });

    if (result.ok && result.text && !looksLikeEmptyContextAnswer(result.text)) {
      return { answer: result.text };
    }

    return {
      answer: buildAnswerFallback({
        question: state.question,
        rewrittenQuery: state.rewrittenQuery,
        contexts: state.contexts,
      }),
    };
  };
}
