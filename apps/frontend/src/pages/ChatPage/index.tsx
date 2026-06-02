import type { AskQuestionResponse, ChatMessage, Citation } from '@rag/shared';
import { Card } from 'antd';
import { useMemo, useState } from 'react';
import { DEFAULT_QA_CHANNEL, DEFAULT_QA_USER_ID } from '../../constants';
import { useAskQuestion } from '../../hooks/useAskQuestion';
import ChatInput from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import CitationsPanel from './components/CitationsPanel';
import styles from './index.module.less';

function createMessage(
  role: ChatMessage['role'],
  content: string,
  citations?: Citation[],
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    citations,
    createdAt: new Date().toISOString(),
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      'assistant',
      '你好，我是研发知识库助手。可以基于知识库中的PRD、TRD文档回答业务研发问题，并附带引用来源。',
    ),
  ]);
  const [lastResponse, setLastResponse] = useState<AskQuestionResponse | null>(null);
  const [presetQuestion, setPresetQuestion] = useState<string>();
  const askQuestionRequest = useAskQuestion();

  const citations = useMemo(() => lastResponse?.citations ?? [], [lastResponse]);

  async function handleAsk(question: string) {
    setMessages((items) => [...items, createMessage('user', question)]);

    try {
      const response = await askQuestionRequest.runAsync({
        question,
        channel: DEFAULT_QA_CHANNEL,
        userId: DEFAULT_QA_USER_ID,
      });
      setLastResponse(response);
      setMessages((items) => [
        ...items,
        createMessage('assistant', response.answer, response.citations),
      ]);
    } catch {
      // 错误提示由 useAskQuestion 统一处理；保留用户消息便于重试和上下文回看。
    }
  }

  return (
    <div className={styles.layout}>
      <Card className={`page-card ${styles.card}`} title="研发问答" variant="borderless">
        <ChatMessages messages={messages} loading={askQuestionRequest.loading} />
        <ChatInput
          loading={askQuestionRequest.loading}
          presetQuestion={presetQuestion}
          onAsk={handleAsk}
        />
      </Card>

      <CitationsPanel citations={citations} onSampleClick={setPresetQuestion} />
    </div>
  );
}
