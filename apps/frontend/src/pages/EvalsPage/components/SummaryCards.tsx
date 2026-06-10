import type { RagEvalReport } from '@rag/shared';
import { Card } from 'antd';
import { formatMetricName, formatPercent, getSummaryParentRecall } from '../utils';
import styles from '../index.module.less';

export default function SummaryCards({ report }: { report?: RagEvalReport }) {
  const parentRecall = getSummaryParentRecall(report);

  return (
    <div className={styles.metricGrid}>
      <Card className={styles.metricCard}>
        <div className={styles.metricLabel}>{formatMetricName(parentRecall.metricName)}</div>
        <div className={styles.metricValue}>{formatPercent(parentRecall.value)}</div>
      </Card>
      <Card className={styles.metricCard}>
        <div className={styles.metricLabel}>答案正确性均值</div>
        <div className={styles.metricValue}>
          {formatPercent(report?.summary.answerCorrectnessAvg)}
        </div>
      </Card>
      <Card className={styles.metricCard}>
        <div className={styles.metricLabel}>答案忠实性均值</div>
        <div className={styles.metricValue}>
          {formatPercent(report?.summary.answerFaithfulnessAvg)}
        </div>
      </Card>
      <Card className={styles.metricCard}>
        <div className={styles.metricLabel}>答案完整性均值</div>
        <div className={styles.metricValue}>
          {formatPercent(report?.summary.answerCompletenessAvg)}
        </div>
      </Card>
    </div>
  );
}
