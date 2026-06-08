import type { ChatMessage, Conversation, ConversationMessage } from '@rag/shared';
import { Card, Form, Input, message, Modal } from 'antd';
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
import {
  createConversation,
  deleteConversation,
  updateConversationTitle,
} from '../../services/conversationService';
import ChatInput from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import ConversationSidebar from './components/ConversationSidebar';
import styles from './index.module.less';
import { mergeConversationList } from './utils/conversations';

function createMessage(messageDraft: {
  role: ChatMessage['role'];
  content: string;
  citations?: ChatMessage['citations'];
  metadata?: ChatMessage['metadata'];
}): ChatMessage {
  return {
    id: `${messageDraft.role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: messageDraft.role,
    content: messageDraft.content,
    citations: messageDraft.citations,
    metadata: messageDraft.metadata,
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
  const [titleForm] = Form.useForm<{ title: string }>();
  const [conversationId, setConversationId] = useState<string | undefined>(() => {
    return loadActiveConversationId();
  });
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [updatingConversationTitle, setUpdatingConversationTitle] = useState(false);
  const [editingConversation, setEditingConversation] = useState<Conversation | undefined>();
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
      (mergedConversations, conversation) =>
        mergeConversationList(mergedConversations, conversation),
      conversationsRequest.data?.items ?? [],
    );
  }, [conversationsRequest.data?.items, localConversations]);
  const activeConversation = conversations.find((item) => item.id === conversationId);

  const persistedMessages = useMemo(() => {
    const messagesResult = conversationMessagesRequest.data;
    if (!messagesResult || messagesResult.conversation.id !== conversationId) {
      return [];
    }

    return messagesResult.messages.map(toChatMessage);
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

    // Optimistic messages keep the question visible while the RAG pipeline is running.
    setPendingConversationId(undefined);
    setHydratedConversationId(undefined);
    setOptimisticMessages([createMessage({ role: 'user', content: question })]);

    try {
      const chatAnswer = await chatAskRequest.runAsync({
        question,
        conversationId: requestConversationId,
        userId: DEFAULT_QA_USER_ID,
      });
      setConversationId(chatAnswer.conversationId);
      saveActiveConversationId(chatAnswer.conversationId);
      setPendingConversationId(chatAnswer.conversationId);
      setHydratedConversationId(undefined);
      const answeredConversation = chatAnswer.conversation;
      if (answeredConversation) {
        setLocalConversations((currentConversations) =>
          mergeConversationList(currentConversations, answeredConversation),
        );
      }
      if (requestConversationId === chatAnswer.conversationId) {
        setOptimisticMessages((currentMessages) => [
          ...currentMessages,
          createMessage({
            role: 'assistant',
            content: chatAnswer.answer,
            citations: chatAnswer.citations,
            metadata: {
              rewrittenQuery: chatAnswer.rewrittenQuery,
              queryPlanDag: chatAnswer.queryPlanDag,
              stepResults: chatAnswer.stepResults,
              answerVerification: chatAnswer.answerVerification,
            },
          }),
        ]);
      }
      await conversationsRequest.refreshAsync();
      if (requestConversationId === chatAnswer.conversationId) {
        await conversationMessagesRequest.refreshAsync();
      }
    } catch {
      // 错误提示由 useChatAsk 统一处理；保留用户消息便于重试和上下文回看。
    }
  }

  async function handleNewConversation() {
    // Keep only one empty conversation around; repeated clicks should teach the user what happened.
    if (activeConversation && !persistedMessages.length && !optimisticMessages.length) {
      message.info('当前已经是新的空会话，可以直接开始提问');
      return;
    }

    setCreatingConversation(true);
    try {
      const createResult = await createConversation({
        userId: DEFAULT_QA_USER_ID,
        title: '新会话',
      });
      saveActiveConversationId(createResult.conversation.id);
      resetConversationView(createResult.conversation.id);
      await conversationsRequest.refreshAsync();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '新建会话失败');
    } finally {
      setCreatingConversation(false);
    }
  }

  function handleEditConversationTitle(conversation: Conversation) {
    setEditingConversation(conversation);
    titleForm.setFieldsValue({
      title: conversation.title || '新会话',
    });
  }

  async function handleSaveConversationTitle() {
    if (!editingConversation) {
      return;
    }

    const values = await titleForm.validateFields();
    setUpdatingConversationTitle(true);
    try {
      const updateResult = await updateConversationTitle(editingConversation.id, {
        title: values.title.trim(),
      });
      setLocalConversations((currentConversations) =>
        mergeConversationList(currentConversations, updateResult.conversation),
      );
      setEditingConversation(undefined);
      titleForm.resetFields();
      message.success('会话标题已更新');
      await conversationsRequest.refreshAsync();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '修改会话标题失败');
    } finally {
      setUpdatingConversationTitle(false);
    }
  }

  async function handleDeleteConversation(conversationToDelete: Conversation) {
    Modal.confirm({
      title: '删除会话',
      content: `确定删除「${conversationToDelete.title || '新会话'}」吗？删除后该会话消息也会一起移除。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteConversation(conversationToDelete.id);
          setLocalConversations((currentConversations) =>
            currentConversations.filter((conversation) => conversation.id !== conversationToDelete.id),
          );

          if (conversationToDelete.id === conversationId) {
            clearActiveConversationId();
            resetConversationView(undefined);
          }

          message.success('会话已删除');
          await conversationsRequest.refreshAsync();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除会话失败');
        }
      },
    });
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
        conversations={conversations}
        activeConversationId={conversationId}
        loading={conversationsRequest.loading}
        creating={creatingConversation}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onEditConversationTitle={handleEditConversationTitle}
        onDeleteConversation={handleDeleteConversation}
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

      <Modal
        title="修改会话标题"
        open={Boolean(editingConversation)}
        confirmLoading={updatingConversationTitle}
        onOk={handleSaveConversationTitle}
        onCancel={() => {
          setEditingConversation(undefined);
          titleForm.resetFields();
        }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={titleForm} layout="vertical" preserve={false}>
          <Form.Item
            name="title"
            label="标题"
            rules={[
              { required: true, whitespace: true, message: '请输入会话标题' },
              { max: 80, message: '标题不能超过 80 个字符' },
            ]}
          >
            <Input autoFocus maxLength={80} placeholder="输入会话标题" showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
