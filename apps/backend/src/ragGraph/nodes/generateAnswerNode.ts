import { fornaxExecute } from '../../fornax/llm';
import type { RagGraphOutput } from '../../types';
import {
  formatCitationRules,
  formatMemoryContexts,
  formatRecentMessages,
} from '../../utils/contextBuilder';

const PROMPT_KEY = 'demo.agentic_rag_answer.prompt';

function formatStepResults(state: Partial<RagGraphOutput>) {
  const steps = state.stepResults ?? [];
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
        step.expectedEvidence ? `期望证据：${step.expectedEvidence}` : undefined,
        step.dependencyStepIds.length ? `依赖步骤：${step.dependencyStepIds.join(', ')}` : '依赖步骤：无',
        step.evidenceStatus ? `证据状态：${step.evidenceStatus}` : undefined,
        step.missingEvidence?.length ? `缺失证据：${step.missingEvidence.join('；')}` : undefined,
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

// 生成答案节点
export function createGenerateAnswerNode() {
  return async (state: Partial<RagGraphOutput>) => {
    if (state.queryPlanDag?.needClarification && state.queryPlanDag.clarificationQuestion) {
      return { answer: state.queryPlanDag.clarificationQuestion };
    }

    const result = await fornaxExecute({
      promptKey: PROMPT_KEY,
      variables: {
        query: state.rewrittenQuery ?? state.question,
        original_query: state.question ?? '',
        conversation_summary: state.conversationSummary ?? '',
        recent_messages: formatRecentMessages(state.recentMessages ?? []),
        memory_context: formatMemoryContexts(state.memories ?? []),
        contexts: state.formattedContexts ?? '',
        step_results: formatStepResults(state),
        citation_rules: formatCitationRules(),
        insufficient_evidence_policy:
          '如果资料或步骤证据不足，必须明确说明不足，不要把会话历史或记忆当作事实证据。',
      },
    });

    if (result.ok && result.text) {
      return { answer: result.text };
    }

    const hasContexts = Boolean(state.contexts?.length);
    return {
      answer: hasContexts
        ? '已检索到相关资料，但当前 Fornax 大模型未配置或调用失败，暂时无法生成最终答案。请检查 Fornax 环境变量和 Prompt 发布状态。'
        : '当前知识库暂未检索到可用资料。请先上传 PRD/TRD，或检查 pgvector/Embedding/关键词索引配置。',
    };
  };
}
