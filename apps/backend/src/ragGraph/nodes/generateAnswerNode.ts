import { fornaxExecute } from '../../fornax/llm';
import type { RagGraphOutput } from '../ragGraphState';

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
        `子问题：${step.query}`,
        step.dependencyStepIds.length
          ? `依赖步骤：${step.dependencyStepIds.join(', ')}`
          : '依赖步骤：无',
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
    const result = await fornaxExecute({
      promptKey: PROMPT_KEY,
      variables: {
        query: state.rewrittenQuery ?? state.question,
        contexts: state.formattedContexts ?? '',
        step_results: formatStepResults(state),
      },
    });

    if (result.ok && result.text) {
      return { answer: result.text };
    }

    const hasContexts = Boolean(state.contexts?.length);
    return {
      answer: hasContexts
        ? '已检索到相关资料，但当前 Fornax 大模型未配置或调用失败，暂时无法生成最终答案。请检查 Fornax 环境变量和 Prompt 发布状态。'
        : '当前知识库暂未检索到可用资料。请先上传 PRD/TRD/评审纪要，或检查 Milvus/Embedding/关键词索引配置。',
    };
  };
}
