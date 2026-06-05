import type { RagGraphOutput } from '../../types';
import { appendVerificationNotice, verifyAnswer } from '../../utils/answerVerifier';

// 最终答案轻量校验节点：先做规则型校验，不引入额外 LLM 调用。
export function createVerifyAnswerNode() {
  return async (state: Partial<RagGraphOutput>) => {
    const verification = verifyAnswer({
      answer: state.answer ?? '',
      contexts: state.contexts ?? [],
      citations: state.citations ?? [],
      stepResults: state.stepResults ?? [],
    });

    return {
      answer: appendVerificationNotice(state.answer ?? '', verification),
      answerVerification: verification,
    };
  };
}
