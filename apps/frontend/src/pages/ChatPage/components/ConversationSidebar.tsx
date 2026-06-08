import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { Conversation } from '@rag/shared';
import { Button, Empty, Spin, Tooltip } from 'antd';
import { formatLocalDateTime } from '../../../utils/dateTime';
import styles from '../index.module.less';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  loading: boolean;
  creating: boolean;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onEditConversationTitle: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
}

export default function ConversationSidebar({
  conversations,
  activeConversationId,
  loading,
  creating,
  onNewConversation,
  onSelectConversation,
  onEditConversationTitle,
  onDeleteConversation,
}: ConversationSidebarProps) {
  return (
    <aside className={`page-card ${styles.conversationPanel}`}>
      <div className={styles.conversationHeader}>
        <div>
          <div className={styles.conversationHeading}>会话</div>
          <div className={styles.conversationCount}>共 {conversations.length} 个</div>
        </div>
        <div className={styles.conversationActions}>
          <Button type="primary" size="small" icon={<PlusOutlined />} loading={creating} onClick={onNewConversation}>
            新建
          </Button>
        </div>
      </div>

      <div className={styles.conversationList}>
        <Spin spinning={loading}>
          {conversations.length ? (
            conversations.map((conversation) => {
              const active = conversation.id === activeConversationId;
              return (
                <button
                  className={`${styles.conversationItem} ${active ? styles.conversationItemActive : ''}`}
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className={styles.conversationItemHeader}>
                    <div className={styles.conversationTitle}>{conversation.title || '新会话'}</div>
                    <div className={styles.conversationItemActions}>
                      <Tooltip title="修改标题">
                        <span
                          className={styles.conversationIconAction}
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditConversationTitle(conversation);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              onEditConversationTitle(conversation);
                            }
                          }}
                        >
                          <EditOutlined />
                        </span>
                      </Tooltip>
                      <Tooltip title="删除会话">
                        <span
                          className={`${styles.conversationIconAction} ${styles.conversationDelete}`}
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteConversation(conversation);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              onDeleteConversation(conversation);
                            }
                          }}
                        >
                          <DeleteOutlined />
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                  <div className={styles.conversationMeta}>
                    {formatLocalDateTime(conversation.updatedAt)}
                  </div>
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
