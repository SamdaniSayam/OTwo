import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, generateOnDeviceResponse } from '../services/ai/onDeviceEngine';
import { getActiveLocalUserId, scopedStorageKey } from '../utils/localScope';

type EmergencyKind = 'medical' | 'crisis' | null;

interface CompanionState {
  messages: ChatMessage[];
  isTyping: boolean;
  emergencyAlertVisible: boolean;
  emergencyMessage: string;
  emergencyKind: EmergencyKind;
  loadMessages: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  dismissEmergencyAlert: () => void;
  clearHistory: () => Promise<void>;
  reset: () => void;
}

const CHAT_STORAGE_BASE_KEY = '@otwo_companion_chat_history';

function createWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome-1',
    sender: 'assistant',
    text:
      'Welcome to your daily companion space. I can help you plan your routine, stay consistent, and explore healthy lifestyle habits.\n\n🌿 Note: This is not medical advice. Please follow your doctor’s guidance.',
    timestamp: new Date().toISOString(),
  };
}

function chatStorageKey(): string | null {
  const userId = getActiveLocalUserId();
  return userId ? scopedStorageKey(CHAT_STORAGE_BASE_KEY, userId) : null;
}

export const useCompanionStore = create<CompanionState>((set, get) => ({
  messages: [createWelcomeMessage()],
  isTyping: false,
  emergencyAlertVisible: false,
  emergencyMessage: '',
  emergencyKind: null,

  loadMessages: async () => {
    const key = chatStorageKey();
    if (!key) {
      set({ messages: [createWelcomeMessage()] });
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ messages: parsed as ChatMessage[] });
          return;
        }
      }
      set({ messages: [createWelcomeMessage()] });
    } catch {
      set({ messages: [createWelcomeMessage()] });
    }
  },

  sendMessage: async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const currentList = [...get().messages, userMsg];
    set({ messages: currentList, isTyping: true });

    const { reply, isEmergency, isCrisis } = generateOnDeviceResponse(text);

    setTimeout(async () => {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toISOString(),
        isEmergencyAlert: isEmergency,
        isCrisisAlert: isCrisis,
      };

      const updated = [...currentList, assistantMsg];
      set({
        messages: updated,
        isTyping: false,
        emergencyAlertVisible: isEmergency,
        emergencyMessage: isEmergency ? reply : '',
        emergencyKind: isEmergency ? (isCrisis ? 'crisis' : 'medical') : null,
      });

      const key = chatStorageKey();
      if (key) {
        await AsyncStorage.setItem(key, JSON.stringify(updated));
      }
    }, 250);
  },

  dismissEmergencyAlert: () => {
    set({ emergencyAlertVisible: false });
  },

  clearHistory: async () => {
    const key = chatStorageKey();
    if (key) {
      await AsyncStorage.removeItem(key);
    }
    set({ messages: [createWelcomeMessage()] });
  },

  reset: () =>
    set({
      messages: [createWelcomeMessage()],
      isTyping: false,
      emergencyAlertVisible: false,
      emergencyMessage: '',
      emergencyKind: null,
    }),
}));
