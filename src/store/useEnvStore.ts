import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchEnvironmentData, EnvironmentData } from '../services/environmentApi';

interface EnvState {
  enabled: boolean;
  data: EnvironmentData | null;
  isLoading: boolean;
  toggleEnabled: () => Promise<void>;
  refreshEnvironment: () => Promise<void>;
  loadPreferences: () => Promise<void>;
}

const ENV_PREF_KEY = '@otwo_env_enabled';

export const useEnvStore = create<EnvState>((set, get) => ({
  enabled: true,
  data: null,
  isLoading: false,

  loadPreferences: async () => {
    try {
      const stored = await AsyncStorage.getItem(ENV_PREF_KEY);
      const isEnabled = stored !== null ? JSON.parse(stored) : true;
      set({ enabled: isEnabled });
      if (isEnabled) {
        await get().refreshEnvironment();
      }
    } catch {
      // Ignore
    }
  },

  toggleEnabled: async () => {
    const next = !get().enabled;
    set({ enabled: next });
    await AsyncStorage.setItem(ENV_PREF_KEY, JSON.stringify(next));
    if (next) {
      await get().refreshEnvironment();
    }
  },

  refreshEnvironment: async () => {
    if (!get().enabled) return;
    try {
      set({ isLoading: true });
      const envData = await fetchEnvironmentData();
      set({ data: envData, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
