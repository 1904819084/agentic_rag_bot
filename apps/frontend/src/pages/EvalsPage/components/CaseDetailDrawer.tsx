import type { RagEvalCaseResult } from '@rag/shared';
import { Descriptions, Drawer, Typography } from 'antd';
import { formatMetricName, formatPercent, getParentRecallMetric } from '../utils';
import TextList from './TextList';
import styles from '../index.module.less';

export default function CaseDetailDrawer({
  caseResult,
  onClose,
}: {
  caseResult?: RagEvalCaseResult;
  onClose: () => void;
}) {
  const parentRecall = caseResult ? getParentRecallMetric(caseResult.metrics) : undefined;

  return (
    <Drawer
      title={caseResult?.caseId ?? '用例详情'}
      open={Boolean(caseResult)}
      onClose={onClose}
      width={760}
      destroyOnClose
    >
      {caseResult ? (
        <>
          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>问题</div>
            <Typography.Paragraph>{caseResult.question}</Typography.Paragraph>
          </div>

          <Descriptions column={2} size="small" bordered className={styles.detailSection}>
            <Descriptions.Item label={formatMetricName(parentRecall?.metricName)}>
              {formatPercent(parentRecall?.value)}
            </Descriptions.Item>
            <Descriptions.Item label="答案正确性">
              {formatPercent(caseResult.metrics.answerCorrectness)}
            </Descriptions.Item>
            <Descriptions.Item label="答案忠实性">
              {formatPercent(caseResult.metrics.answerFaithfulness)}
            </Descriptions.Item>
            <Descriptions.Item label="答案完整性">
              {formatPercent(caseResult.metrics.answerCompleteness)}
            </Descriptions.Item>
          </Descriptions>

          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>评审原因</div>
            <Typography.Paragraph>{caseResult.metrics.judgeReason || '无'}</Typography.Paragraph>
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>答案</div>
            <div className={styles.answerBlock}>{caseResult.answer || '无'}</div>
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>期望答案要点</div>
            <TextList items={caseResult.expectedAnswerPoints} />
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>缺失答案要点</div>
            <TextList items={caseResult.metrics.missingAnswerPoints} />
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>无依据说法</div>
            <TextList items={caseResult.metrics.unsupportedClaims} />
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>命中父块 ID</div>
            <TextList items={caseResult.retrievedParentIds} />
          </div>
        </>
      ) : null}
    </Drawer>
  );
}
