/**
 * Device-level preferences that are safe to share across local accounts.
 * Health data is never stored here.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDefaultEmergencyNumber,
  isEmergencyNumberValid,
  normalizeEmergencyNumber,
} from '../utils/emergencyNumbers';

const EMERGENCY_NUMBER_KEY = '@otwo_emergency_number';

interface SettingsState {
  emergencyNumber: string;
  emergencyNumberLoaded: boolean;
  loadEmergencyNumber: () => Promise<void>;
  setEmergencyNumber: (value: string) => Promise<{ success: boolean; error?: string }>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  emergencyNumber: getDefaultEmergencyNumber(),
  emergencyNumberLoaded: false,

  loadEmergencyNumber: async () => {
    try {
      const stored = await AsyncStorage.getItem(EMERGENCY_NUMBER_KEY);
      if (stored && isEmergencyNumberValid(stored)) {
        set({ emergencyNumber: normalizeEmergencyNumber(stored), emergencyNumberLoaded: true });
        return;
      }
    } catch {
      // Fall back to the locale default.
    }
    set({ emergencyNumber: getDefaultEmergencyNumber(), emergencyNumberLoaded: true });
  },

  setEmergencyNumber: async (value: string) => {
    if (!isEmergencyNumberValid(value)) {
      return { success: false, error: 'Enter a valid emergency phone number.' };
    }
    const normalized = normalizeEmergencyNumber(value);
    await AsyncStorage.setItem(EMERGENCY_NUMBER_KEY, normalized);
    set({ emergencyNumber: normalized, emergencyNumberLoaded: true });
    return { success: true };
  },
}));
