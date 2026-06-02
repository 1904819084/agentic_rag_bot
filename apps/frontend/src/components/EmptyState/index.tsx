import { Empty } from 'antd';
import type { ReactNode } from 'react';
import styles from './index.module.less';

interface EmptyStateProps {
  description?: ReactNode;
  children?: ReactNode;
}

/**
 * 项目内统一空态：固定使用简洁版 Empty 图。
 */
export default function EmptyState({ description, children }: EmptyStateProps) {
  return (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} className={styles.empty}>
      {children}
    </Empty>
  );
}
