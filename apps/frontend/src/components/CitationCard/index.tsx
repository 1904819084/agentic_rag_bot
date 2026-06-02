import { LinkOutlined } from '@ant-design/icons';
import type { Citation } from '@rag/shared';
import { Tag, Typography } from 'antd';
import styles from './index.module.less';

interface CitationCardProps {
  citation: Citation;
}

/**
 * RAG 引用卡片：标题 / 路径 / 摘要 / 来源 Tag / 外链。
 */
export default function CitationCard({ citation }: CitationCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{citation.title}</div>
      {citation.sectionPath?.length ? (
        <div className={styles.path}>{citation.sectionPath.join(' / ')}</div>
      ) : null}
      {citation.snippet ? (
        <Typography.Paragraph className={styles.snippet} ellipsis={{ rows: 3 }}>
          {citation.snippet}
        </Typography.Paragraph>
      ) : null}
      <div className={styles.footer}>
        <span>
          <Tag bordered={false}>{citation.sourceId}</Tag>
          {typeof citation.score === 'number' ? (
            <Tag color="blue" bordered={false}>
              score {citation.score.toFixed(3)}
            </Tag>
          ) : null}
        </span>
        {citation.url ? (
          <a className={styles.link} href={citation.url} target="_blank" rel="noreferrer">
            <LinkOutlined style={{ marginRight: 4 }} />
            打开来源
          </a>
        ) : null}
      </div>
    </div>
  );
}
