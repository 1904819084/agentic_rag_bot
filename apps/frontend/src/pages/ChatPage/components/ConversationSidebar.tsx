import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Conversation } from '@rag/shared';
import { Button, Empty, Spin, Tooltip } from 'antd';
import styles from '../index.module.less';

interface ConversationSidebarProps {
  items: Conversation[];
  activeConversationId?: string;
  loading: boolean;
  creating: boolean;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onRefresh?: () => void;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConversationSidebar({
  items,
  activeConversationId,
  loading,
  creating,
  onNewConversation,
  onSelectConversation,
  onRefresh,
}: ConversationSidebarProps) {
  return (
    <aside className={`page-card ${styles.conversationPanel}`}>
      <div className={styles.conversationHeader}>
        <div>
          <div className={styles.conversationHeading}>会话</div>
          <div className={styles.conversationCount}>共 {items.length} 个</div>
        </div>
        <div className={styles.conversationActions}>
          {onRefresh ? (
            <Tooltip title="刷新会话">
              <Button icon={<ReloadOutlined />} size="small" onClick={onRefresh} />
            </Tooltip>
          ) : null}
          <Button type="primary" size="small" icon={<PlusOutlined />} loading={creating} onClick={onNewConversation}>
            新建
          </Button>
        </div>
      </div>

      <div className={styles.conversationList}>
        <Spin spinning={loading}>
          {items.length ? (
            items.map((item) => {
              const active = item.id === activeConversationId;
              return (
                <button
                  className={`${styles.conversationItem} ${active ? styles.conversationItemActive : ''}`}
                  key={item.id}
                  type="button"
                  onClick={() => onSelectConversation(item.id)}
                >
                  <div className={styles.conversationTitle}>{item.title || '新会话'}</div>
                  <div className={styles.conversationMeta}>{formatTime(item.updatedAt)}</div>
                </button>
              );
            })
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话" />
          )}
        </Spin>
      </div>
    </aside>
  );
}
