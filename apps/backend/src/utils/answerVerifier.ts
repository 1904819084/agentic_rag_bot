import type { AnswerVerification, Citation, QueryPlanStepResult, RetrievedContext } from '@rag/shared';

const INSUFFICIENT_PATTERNS = ['资料不足', '未检索到', '无法确认', '不足以', '暂无资料'];
const STRONG_FACT_PATTERNS = ['已实现', '支持', '代码中', '调用了', '已经接入', '当前实现'];

function containsAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

export function verifyAnswer(input: {
  answer: string;
  contexts: RetrievedContext[];
  citations: Citation[];
  stepResults: QueryPlanStepResult[];
}): AnswerVerification {
  const warnings: string[] = [];
  const missingCitations: string[] = [];
  const invalidCitationSourceIds: string[] = [];
  const insufficientEvidenceSections: string[] = [];
  const hasInsufficientStatement = containsAny(input.answer, INSUFFICIENT_PATTERNS);

  if (!input.contexts.length && !hasInsufficientStatement) {
    warnings.push('当前没有检索到资料，但答案没有明确说明资料不足。');
    insufficientEvidenceSections.push('全局资料上下文');
  }

  if (!input.citations.length && containsAny(input.answer, STRONG_FACT_PATTERNS)) {
    warnings.push('答案包含较强事实表述，但没有返回引用来源。');
    missingCitations.push('强事实表述缺少引用');
  }

  const validSourceIds = new Set(input.contexts.map((_, index) => `资料 ${index + 1}`));
  for (const citation of input.citations) {
    if (!validSourceIds.has(citation.sourceId)) {
      invalidCitationSourceIds.push(citation.sourceId);
    }
  }
  if (invalidCitationSourceIds.length) {
    warnings.push(`存在无效引用编号：${invalidCitationSourceIds.join('、')}。`);
  }

  const noEvidenceSteps = input.stepResults.filter(
    (step) => step.taskType === 'retrieve' && step.contexts.length === 0,
  );
  if (noEvidenceSteps.length && !hasInsufficientStatement) {
    warnings.push('部分检索步骤没有命中资料，但最终答案没有说明这些不足。');
    insufficientEvidenceSections.push(
      ...noEvidenceSteps.map((step) => `步骤 ${step.stepId}：${step.query}`),
    );
  }

  return {
    isSupported: warnings.length === 0,
    warnings,
    missingCitations,
    invalidCitationSourceIds,
    insufficientEvidenceSections,
  };
}

export function appendVerificationNotice(answer: string, verification: AnswerVerification) {
  if (!verification.warnings.length) {
    return answer;
  }

  return [
    answer,
    '',
    '---',
    '资料充分性提示：',
    ...verification.warnings.map((warning) => `- ${warning}`),
  ].join('\n');
}
