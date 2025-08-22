import type { ChatMessage } from "@shared/schema";

const STORAGE_KEYS = {
  CHAT_MESSAGES: 'tradeable_chat_messages',
  USER_PREFERENCES: 'tradeable_user_preferences',
} as const;

export const localStorage = {
  // Chat messages
  getChatMessages: (): ChatMessage[] => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  setChatMessages: (messages: ChatMessage[]): void => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save chat messages:', error);
    }
  },

  addChatMessage: (message: ChatMessage): void => {
    const messages = localStorage.getChatMessages();
    messages.push(message);
    localStorage.setChatMessages(messages);
  },

  clearChatMessages: (): void => {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES);
    } catch (error) {
      console.error('Failed to clear chat messages:', error);
    }
  },

  // User preferences
  getUserPreferences: () => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  },

  setUserPreferences: (preferences: Record<string, any>): void => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }
};
