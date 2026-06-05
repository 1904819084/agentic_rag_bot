const ACTIVE_CONVERSATION_STORAGE_KEY = 'rag.chat.activeConversationId.v1';

function isBrowserStorageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function loadActiveConversationId(): string | undefined {
  if (!isBrowserStorageAvailable()) {
    return undefined;
  }

  try {
    return window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveActiveConversationId(conversationId: string) {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, conversationId);
  } catch {
    // Ignore local persistence failures; backend conversation state remains authoritative.
  }
}

export function clearActiveConversationId() {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
  } catch {
    // Ignore local persistence failures.
  }
}
