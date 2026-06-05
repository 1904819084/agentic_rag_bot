import assert from 'node:assert/strict';
import test from 'node:test';
import type { Conversation } from '@rag/shared';
import { mergeConversationList } from './conversations';

const existingConversation: Conversation = {
  id: 'conv-existing',
  userId: 'u1',
  title: '已有会话',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

test('adds an auto-created conversation to the front of the list', () => {
  const autoCreatedConversation: Conversation = {
    id: 'conv-auto',
    userId: 'u1',
    title: '首个问题',
    createdAt: '2026-06-05T00:00:00.000Z',
    updatedAt: '2026-06-05T00:00:00.000Z',
  };

  assert.deepEqual(
    mergeConversationList([existingConversation], autoCreatedConversation).map((item) => item.id),
    ['conv-auto', 'conv-existing'],
  );
});

test('replaces an existing conversation without duplicating it', () => {
  const refreshedConversation: Conversation = {
    ...existingConversation,
    title: '更新后的会话',
    updatedAt: '2026-06-05T00:00:00.000Z',
  };

  assert.deepEqual(mergeConversationList([existingConversation], refreshedConversation), [
    refreshedConversation,
  ]);
});
