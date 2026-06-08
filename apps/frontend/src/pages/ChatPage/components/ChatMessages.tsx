import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import type { ChatMessage } from '@rag/shared';
import { useEffect, useRef } from 'react';
import styles from '../index.module.less';
import PlanSteps from './PlanSteps';

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
}

export default function ChatMessages({ messages, loading }: ChatMessagesProps) {
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className={styles.messages} ref={messagesRef}>
      {messages.map((item) => {
        const isUser = item.role === 'user';
        return (
          <div key={item.id} className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
            <span className={styles.avatar} aria-hidden>
              {isUser ? <UserOutlined /> : <RobotOutlined />}
            </span>
            <div className={styles.body}>
              <div className={styles.role}>{isUser ? '我' : '助手'}</div>
              <div className={styles.bubble}>{item.content}</div>
              {item.citations?.length ? (
                <div className={styles.references}>
                  <div className={styles.referencesTitle}>参考文档</div>
                  <div className={styles.referenceList}>
                    {item.citations.map((citation) => (
                      <a
                        className={styles.referenceItem}
                        href={citation.sourceUrl}
                        key={`${item.id}-${citation.sourceId}`}
                        rel="noreferrer"
                        target={citation.sourceUrl ? '_blank' : undefined}
                      >
                        <span className={styles.referenceSource}>{citation.sourceId}</span>
                        <span className={styles.referenceName}>{citation.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
              {!isUser ? (
                <PlanSteps
                  rewrittenQuery={item.metadata?.rewrittenQuery}
                  queryPlan={item.metadata?.queryPlan}
                  stepResults={item.metadata?.stepResults}
                />
              ) : null}
            </div>
          </div>
        );
      })}
      {loading ? (
        <div className={styles.loading} role="status" aria-live="polite">
          <span className={styles.dots} aria-hidden>
            <span />
            <span />
            <span />
          </span>
          正在检索和生成答案…
        </div>
      ) : null}
    </div>
  );
}
