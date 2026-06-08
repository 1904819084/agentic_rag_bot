import type { AnswerVerification, QueryPlan, QueryPlanStepResult } from '@rag/shared';
import { Alert, Collapse, Space, Tag, Typography } from 'antd';
import styles from '../index.module.less';

const { Text, Paragraph } = Typography;

interface PlanStepsProps {
  rewrittenQuery?: string;
  queryPlan?: QueryPlan;
  stepResults?: QueryPlanStepResult[];
  answerVerification?: AnswerVerification;
}

export default function PlanSteps({
  rewrittenQuery,
  queryPlan,
  stepResults = [],
  answerVerification,
}: PlanStepsProps) {
  const hasPlan = Boolean(queryPlan?.tasks?.length || stepResults.length || rewrittenQuery);
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
                {(queryPlan?.tasks ?? []).map((task) => {
                  const result = resultByStepId.get(task.id);
                  return (
                    <div className={styles.planStep} key={task.id}>
                      <Space className={styles.stepHeader} size={[6, 6]} wrap>
                        <Tag color="geekblue">步骤 {task.id}</Tag>
                        <Tag>{task.type}</Tag>
                      </Space>
                      <Paragraph className={styles.planText}>
                        <Text strong>子问题：</Text>
                        {task.query}
                      </Paragraph>
                      {result?.searchQuery ? (
                        <Paragraph className={styles.planText}>
                          <Text strong>检索式：</Text>
                          {result.searchQuery}
                        </Paragraph>
                      ) : null}
                      {task.dependsOn.length ? (
                        <Paragraph className={styles.planText}>
                          <Text strong>依赖：</Text>
                          {task.dependsOn.join(', ')}
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
