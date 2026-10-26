/**
 * Symptom Logging Store (Zustand)
 * Non-diagnostic personal logging for doctor discussion and pattern spotting.
 */
import { create } from 'zustand';
import { symptomRepo } from '../db/repositories/symptomRepo';
import { SymptomLogRow } from '../db/sqlite';

interface SymptomState {
  logs: SymptomLogRow[];
  topTriggers: { trigger: string; count: number }[];
  isLoading: boolean;
  emergencyAlert: boolean;
  loadSymptoms: () => Promise<void>;
  logSymptom: (
    breathingDifficulty: number, // 1 to 5
    coughPresence: number,       // 0 = none, 1 = mild, 2 = persistent
    triggers: string[],
    notes?: string
  ) => Promise<{ isCritical: boolean }>;
  dismissEmergencyAlert: () => void;
}

export const useSymptomStore = create<SymptomState>((set, get) => ({
  logs: [],
  topTriggers: [],
  isLoading: true,
  emergencyAlert: false,

  loadSymptoms: async () => {
    try {
      set({ isLoading: true });
      const recent = await symptomRepo.getRecentLogs(30);
      const triggers = await symptomRepo.getTriggerFrequency(30);
      set({ logs: recent, topTriggers: triggers, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  logSymptom: async (breathingDifficulty, coughPresence, triggers, notes) => {
    const today = new Date().toISOString().split('T')[0];
    const logItem: SymptomLogRow = {
      id: `symptom-${Date.now()}`,
      date: today,
      timestamp: new Date().toISOString(),
      breathing_difficulty: breathingDifficulty,
      cough_presence: coughPresence,
      triggers: triggers.join(', '),
      notes: notes || undefined,
    };

    await symptomRepo.insertLog(logItem);
    await get().loadSymptoms();

    // Critical escalation check: Difficulty 5 or severe distress
    const isCritical = breathingDifficulty >= 5;
    if (isCritical) {
      set({ emergencyAlert: true });
    }
    return { isCritical };
  },

  dismissEmergencyAlert: () => {
    set({ emergencyAlert: false });
  },
}));
