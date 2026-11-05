import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { fetchEnvironmentData, EnvironmentData } from '../services/environmentApi';

export type EnvironmentStatus =
  | 'idle'
  | 'checking'
  | 'ready'
  | 'needs_permission'
  | 'denied'
  | 'unavailable';

interface EnvState {
  enabled: boolean;
  data: EnvironmentData | null;
  status: EnvironmentStatus;
  isLoading: boolean;
  toggleEnabled: () => Promise<void>;
  refreshEnvironment: () => Promise<void>;
  requestEnvironmentAccess: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  reset: () => void;
}

const ENV_PREF_KEY = '@otwo_env_enabled';
const LOCATION_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Location request timed out')), milliseconds);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return null;

  // Last-known coordinates are used only when they are recent enough to avoid
  // showing air quality for a place the user has left.
  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 15 * 60 * 1000,
    requiredAccuracy: 20_000,
  });
  if (lastKnown) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
    };
  }

  const current = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
    LOCATION_TIMEOUT_MS
  );
  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  };
}

export const useEnvStore = create<EnvState>((set, get) => ({
  enabled: true,
  data: null,
  status: 'idle',
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
      set({ status: 'unavailable' });
    }
  },

  toggleEnabled: async () => {
    const next = !get().enabled;
    set({ enabled: next, data: next ? get().data : null, status: next ? 'idle' : 'idle' });
    await AsyncStorage.setItem(ENV_PREF_KEY, JSON.stringify(next));
    if (next) {
      await get().refreshEnvironment();
    }
  },

  requestEnvironmentAccess: async () => {
    if (!get().enabled) return;
    try {
      set({ isLoading: true, status: 'checking' });
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        set({
          data: null,
          status: permission.status === Location.PermissionStatus.DENIED ? 'denied' : 'needs_permission',
          isLoading: false,
        });
        return;
      }
      const coordinates = await getCurrentCoordinates();
      if (!coordinates) {
        set({ data: null, status: 'unavailable', isLoading: false });
        return;
      }
      const envData = await fetchEnvironmentData(
        coordinates.latitude,
        coordinates.longitude
      );
      set({
        data: envData,
        status: envData ? 'ready' : 'unavailable',
        isLoading: false,
      });
    } catch {
      set({ data: null, status: 'unavailable', isLoading: false });
    }
  },

  refreshEnvironment: async () => {
    if (!get().enabled) return;
    try {
      set({ isLoading: true, status: 'checking' });
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        set({
          data: null,
          status: permission.status === Location.PermissionStatus.DENIED ? 'denied' : 'needs_permission',
          isLoading: false,
        });
        return;
      }

      const coordinates = await getCurrentCoordinates();
      if (!coordinates) {
        set({ data: null, status: 'unavailable', isLoading: false });
        return;
      }
      const envData = await fetchEnvironmentData(
        coordinates.latitude,
        coordinates.longitude
      );
      set({
        data: envData,
        status: envData ? 'ready' : 'unavailable',
        isLoading: false,
      });
    } catch {
      set({ data: null, status: 'unavailable', isLoading: false });
    }
  },

  reset: () => set({ data: null, status: 'idle', isLoading: false }),
}));
