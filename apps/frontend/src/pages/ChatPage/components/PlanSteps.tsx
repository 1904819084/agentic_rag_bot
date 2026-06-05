import type { AnswerVerification, QueryPlanDag, QueryPlanStepResult } from '@rag/shared';
import { Alert, Collapse, Space, Tag, Typography } from 'antd';
import styles from '../index.module.less';

const { Text, Paragraph } = Typography;

interface PlanStepsProps {
  rewrittenQuery?: string;
  queryPlanDag?: QueryPlanDag;
  stepResults?: QueryPlanStepResult[];
  answerVerification?: AnswerVerification;
}

const EVIDENCE_COLOR: Record<string, string> = {
  sufficient: 'success',
  weak: 'warning',
  none: 'error',
  not_applicable: 'default',
};

export default function PlanSteps({
  rewrittenQuery,
  queryPlanDag,
  stepResults = [],
  answerVerification,
}: PlanStepsProps) {
  const hasPlan = Boolean(queryPlanDag?.steps?.length || stepResults.length || rewrittenQuery);
  const hasWarnings = Boolean(answerVerification?.warnings?.length);

  if (!hasPlan && !hasWarnings) {
    return null;
  }

  const resultByStepId = new Map(stepResults.map((result) => [result.stepId, result]));

  return (
    <div className={styles.planPanel}>
      {hasWarnings ? (
        <Alert
          className={styles.verificationAlert}
          type={answerVerification?.isSupported ? 'info' : 'warning'}
          showIcon
          message="资料充分性提示"
          description={answerVerification?.warnings.join('；')}
        />
      ) : null}

      <Collapse
        size="small"
        ghost
        items={[
          {
            key: 'plan',
            label: '执行计划与证据',
            children: (
              <div className={styles.planContent}>
                {rewrittenQuery ? (
                  <Paragraph className={styles.planText}>
                    <Text strong>改写问题：</Text>
                    {rewrittenQuery}
                  </Paragraph>
                ) : null}
                {queryPlanDag ? (
                  <Space className={styles.planMeta} size={[6, 6]} wrap>
                    <Tag color={queryPlanDag.isComplex ? 'blue' : 'default'}>
                      {queryPlanDag.isComplex ? '复杂问题' : '单步问题'}
                    </Tag>
                    {queryPlanDag.intent ? <Tag>{queryPlanDag.intent}</Tag> : null}
                    {queryPlanDag.needClarification ? <Tag color="orange">需澄清</Tag> : null}
                  </Space>
                ) : null}
                {(queryPlanDag?.steps ?? []).map((step) => {
                  const result = resultByStepId.get(step.id);
                  return (
                    <div className={styles.planStep} key={step.id}>
                      <Space className={styles.stepHeader} size={[6, 6]} wrap>
                        <Tag color="geekblue">步骤 {step.id}</Tag>
                        <Tag>{step.taskType ?? result?.taskType ?? 'retrieve'}</Tag>
                        {result?.evidenceStatus ? (
                          <Tag color={EVIDENCE_COLOR[result.evidenceStatus] ?? 'default'}>
                            {result.evidenceStatus}
                          </Tag>
                        ) : null}
                      </Space>
                      <Paragraph className={styles.planText}>
                        <Text strong>子问题：</Text>
                        {step.query}
                      </Paragraph>
                      {step.searchQuery || result?.searchQuery ? (
                        <Paragraph className={styles.planText}>
                          <Text strong>检索式：</Text>
                          {step.searchQuery ?? result?.searchQuery}
                        </Paragraph>
                      ) : null}
                      {step.expectedEvidence || result?.expectedEvidence ? (
                        <Paragraph className={styles.planText}>
                          <Text strong>期望证据：</Text>
                          {step.expectedEvidence ?? result?.expectedEvidence}
                        </Paragraph>
                      ) : null}
                      {step.depends.length ? (
                        <Paragraph className={styles.planText}>
                          <Text strong>依赖：</Text>
                          {step.depends.join(', ')}
                        </Paragraph>
                      ) : null}
                      {result ? (
                        <>
                          <Paragraph className={styles.planText}>
                            <Text strong>中间答案：</Text>
                            {result.answer}
                          </Paragraph>
                          <div className={styles.planMeta}>
                            命中资料 {result.contexts.length} 条
                            {result.missingEvidence?.length
                              ? `；缺失：${result.missingEvidence.join('；')}`
                              : ''}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
