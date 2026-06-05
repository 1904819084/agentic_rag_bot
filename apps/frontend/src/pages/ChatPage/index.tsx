import type { ChatMessage, Conversation, ConversationMessage } from '@rag/shared';
import { Card, message } from 'antd';
import { useMemo, useState } from 'react';
import { DEFAULT_QA_USER_ID } from '../../constants';
import { useChatAsk } from '../../hooks/useChatAsk';
import { useConversationMessages } from '../../hooks/useConversationMessages';
import { useConversations } from '../../hooks/useConversations';
import {
  clearActiveConversationId,
  loadActiveConversationId,
  saveActiveConversationId,
} from '../../services/chatStorage';
import { createConversation } from '../../services/conversationService';
import ChatInput from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import ConversationSidebar from './components/ConversationSidebar';
import styles from './index.module.less';
import { mergeConversationList } from './utils/conversations';

function createMessage(input: {
  role: ChatMessage['role'];
  content: string;
  citations?: ChatMessage['citations'];
  metadata?: ChatMessage['metadata'];
}): ChatMessage {
  return {
    id: `${input.role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: input.role,
    content: input.content,
    citations: input.citations,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };
}

function createWelcomeMessage() {
  return createMessage({
    role: 'assistant',
    content: '你好，我是研发知识库助手。可以基于知识库中的PRD、TRD文档回答业务研发问题，并附带引用来源。',
  });
}

function toChatMessage(message: ConversationMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    citations: message.citations,
    metadata: message.metadata,
    createdAt: message.createdAt,
  };
}

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string | undefined>(() => {
    return loadActiveConversationId();
  });
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [localConversations, setLocalConversations] = useState<Conversation[]>([]);
  const [hydratedConversationId, setHydratedConversationId] = useState<string | undefined>();
  const [pendingConversationId, setPendingConversationId] = useState<string | undefined>();
  const chatAskRequest = useChatAsk();
  const conversationsRequest = useConversations({
    userId: DEFAULT_QA_USER_ID,
  });
  const conversationMessagesRequest = useConversationMessages(
    conversationId,
    (loadedConversationId) => {
      setHydratedConversationId(loadedConversationId);
    },
    () => {
      clearActiveConversationId();
      setConversationId(undefined);
      setOptimisticMessages([]);
      setHydratedConversationId(undefined);
      setPendingConversationId(undefined);
    },
  );

  const conversations = useMemo(() => {
    return localConversations.reduce(
      (items, conversation) => mergeConversationList(items, conversation),
      conversationsRequest.data?.items ?? [],
    );
  }, [conversationsRequest.data?.items, localConversations]);
  const activeConversation = conversations.find((item) => item.id === conversationId);

  const persistedMessages = useMemo(() => {
    const response = conversationMessagesRequest.data;
    if (!response || response.conversation.id !== conversationId) {
      return [];
    }

    return response.messages.map(toChatMessage);
  }, [conversationId, conversationMessagesRequest.data]);
  const messages = useMemo(() => {
    const visibleOptimisticMessages =
      pendingConversationId && hydratedConversationId === pendingConversationId
        ? []
        : optimisticMessages;
    const mergedMessages = [...persistedMessages, ...visibleOptimisticMessages];
    return mergedMessages.length ? mergedMessages : [createWelcomeMessage()];
  }, [hydratedConversationId, optimisticMessages, pendingConversationId, persistedMessages]);

  function resetConversationView(nextConversationId?: string) {
    setConversationId(nextConversationId);
    setOptimisticMessages([]);
    setHydratedConversationId(undefined);
    setPendingConversationId(undefined);
  }

  async function handleAsk(question: string) {
    const requestConversationId = conversationId;

    setPendingConversationId(undefined);
    setHydratedConversationId(undefined);
    setOptimisticMessages([createMessage({ role: 'user', content: question })]);

    try {
      const response = await chatAskRequest.runAsync({
        question,
        conversationId: requestConversationId,
        userId: DEFAULT_QA_USER_ID,
      });
      setConversationId(response.conversationId);
      saveActiveConversationId(response.conversationId);
      setPendingConversationId(response.conversationId);
      setHydratedConversationId(undefined);
      const responseConversation = response.conversation;
      if (responseConversation) {
        setLocalConversations((items) => mergeConversationList(items, responseConversation));
      }
      if (requestConversationId === response.conversationId) {
        setOptimisticMessages((items) => [
          ...items,
          createMessage({
            role: 'assistant',
            content: response.answer,
            citations: response.citations,
            metadata: {
              rewrittenQuery: response.rewrittenQuery,
              queryPlanDag: response.queryPlanDag,
              stepResults: response.stepResults,
              answerVerification: response.answerVerification,
            },
          }),
        ]);
      }
      await conversationsRequest.refreshAsync();
      if (requestConversationId === response.conversationId) {
        await conversationMessagesRequest.refreshAsync();
      }
    } catch {
      // 错误提示由 useChatAsk 统一处理；保留用户消息便于重试和上下文回看。
    }
  }

  async function handleNewConversation() {
    if (activeConversation && !persistedMessages.length && !optimisticMessages.length) {
      return;
    }

    setCreatingConversation(true);
    try {
      const response = await createConversation({
        userId: DEFAULT_QA_USER_ID,
        title: '新会话',
      });
      saveActiveConversationId(response.conversation.id);
      resetConversationView(response.conversation.id);
      await conversationsRequest.refreshAsync();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '新建会话失败');
    } finally {
      setCreatingConversation(false);
    }
  }

  function handleSelectConversation(nextConversationId: string) {
    if (nextConversationId === conversationId) {
      return;
    }

    saveActiveConversationId(nextConversationId);
    resetConversationView(nextConversationId);
  }

  return (
    <div className={styles.layout}>
      <ConversationSidebar
        items={conversations}
        activeConversationId={conversationId}
        loading={conversationsRequest.loading}
        creating={creatingConversation}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onRefresh={conversationsRequest.refresh}
      />

      <Card className={`page-card ${styles.card}`} title="研发问答" variant="borderless">
        <ChatMessages
          messages={messages}
          loading={chatAskRequest.loading || conversationMessagesRequest.loading}
        />
        <ChatInput
          loading={chatAskRequest.loading}
          onAsk={handleAsk}
        />
      </Card>
    </div>
  );
}
