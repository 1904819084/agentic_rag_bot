import { LinkOutlined } from '@ant-design/icons';
import type { Citation } from '@rag/shared';
import { Tag } from 'antd';
import styles from './index.module.less';

interface CitationCardProps {
  citation: Citation;
}

export default function CitationCard({ citation }: CitationCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{citation.title}</div>
      <div className={styles.footer}>
        <span>
          <Tag bordered={false}>{citation.sourceId}</Tag>
          {typeof citation.score === 'number' ? (
            <Tag color="blue" bordered={false}>
              score {citation.score.toFixed(3)}
            </Tag>
          ) : null}
        </span>
        {citation.sourceUrl ? (
          <a className={styles.link} href={citation.sourceUrl} target="_blank" rel="noreferrer">
            <LinkOutlined style={{ marginRight: 4 }} />
            打开来源
          </a>
        ) : null}
      </div>
    </div>
  );
}
