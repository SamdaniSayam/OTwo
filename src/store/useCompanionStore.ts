import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, generateOnDeviceResponse } from '../services/ai/onDeviceEngine';

interface CompanionState {
  messages: ChatMessage[];
  isTyping: boolean;
  emergencyAlertVisible: boolean;
  emergencyMessage: string;
  loadMessages: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  dismissEmergencyAlert: () => void;
  clearHistory: () => Promise<void>;
}

const CHAT_STORAGE_KEY = '@otwo_companion_chat_history';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-1',
  sender: 'assistant',
  text: 'Welcome to your daily companion space. I can help you plan your routine, stay consistent, and explore healthy lifestyle habits.\n\n🌿 Note: This is not medical advice. Please follow your doctor’s guidance.',
  timestamp: new Date().toISOString(),
};

export const useCompanionStore = create<CompanionState>((set, get) => ({
  messages: [INITIAL_WELCOME_MESSAGE],
  isTyping: false,
  emergencyAlertVisible: false,
  emergencyMessage: '',

  loadMessages: async () => {
    try {
      const stored = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        set({ messages: JSON.parse(stored) });
      }
    } catch {
      // Ignore
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

    // Process on-device response
    const { reply, isEmergency } = generateOnDeviceResponse(text);

    // Subtle simulated typing delay for pleasant UX without lag (300ms)
    setTimeout(async () => {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toISOString(),
        isEmergencyAlert: isEmergency,
      };

      const updated = [...currentList, assistantMsg];
      set({
        messages: updated,
        isTyping: false,
        emergencyAlertVisible: isEmergency,
        emergencyMessage: isEmergency ? reply : '',
      });

      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
    }, 250);
  },

  dismissEmergencyAlert: () => {
    set({ emergencyAlertVisible: false });
  },

  clearHistory: async () => {
    await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
    set({ messages: [INITIAL_WELCOME_MESSAGE] });
  },
}));
