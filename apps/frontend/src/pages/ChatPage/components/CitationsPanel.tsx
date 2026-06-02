import type { Citation } from '@rag/shared';
import { Card, Tag, Typography } from 'antd';
import CitationCard from '../../../components/CitationCard';
import EmptyState from '../../../components/EmptyState';
import { SAMPLE_QUESTIONS } from '../../../constants';
import styles from '../index.module.less';

interface CitationsPanelProps {
  citations: Citation[];
  onSampleClick: (question: string) => void;
}

export default function CitationsPanel({ citations, onSampleClick }: CitationsPanelProps) {
  return (
    <Card
      className="page-card"
      title="引用与上下文"
      extra={
        <Typography.Text type="secondary">
          {citations.length ? `${citations.length} 个来源` : '暂无'}
        </Typography.Text>
      }
      variant="borderless"
    >
      {citations.length ? (
        <div>
          {citations.map((item, index) => (
            <CitationCard key={`${item.sourceId}-${index}`} citation={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          description={
            <div>
              <div className={styles.emptyTitle}>暂无引用</div>
              <div className={styles.emptyHint}>提问后将展示对应的 PRD/TRD 引用</div>
            </div>
          }
        >
          <div className={styles.samples}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              试试这些问题：
            </Typography.Text>
            <div className={styles.samplesList}>
              {SAMPLE_QUESTIONS.map((q) => (
                <Tag
                  key={q}
                  bordered={false}
                  className={styles.sampleTag}
                  onClick={() => onSampleClick(q)}
                >
                  {q}
                </Tag>
              ))}
            </div>
          </div>
        </EmptyState>
      )}
    </Card>
  );
}
