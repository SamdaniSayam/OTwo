/**
 * Small secure-storage adapter.
 *
 * Native: expo-secure-store (Android Keystore / iOS Keychain). Values larger
 * than the platform limit are chunked, because Supabase sessions commonly
 * exceed the ~2 KB Android limit. Chunk metadata is stored in SecureStore, not
 * AsyncStorage, so the session is never silently downgraded to plaintext.
 *
 * Web: AsyncStorage, because a browser does not expose a native secure enclave
 * to a web app. Never describe web storage as hardware-backed or encrypted.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  isValidSecureStorageKey,
  SECURE_STORAGE_KEYS,
} from '../utils/secureStorageKeys';

export { SECURE_STORAGE_KEYS };

const INDEX_KEY = 'otwo_secure_index';
const CHUNK_SIZE = 1800;
const CHUNK_SUFFIX = '.chunks';

function chunkKey(key: string, index: number): string {
  return `${key}.chunk.${index}`;
}

function assertValidKey(key: string): void {
  if (!isValidSecureStorageKey(key)) {
    throw new Error(`Invalid secure-storage key: ${key}`);
  }
}

async function writeIndex(keys: string[]): Promise<void> {
  const unique = Array.from(new Set(keys));
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(unique), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

async function readIndex(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

async function addToIndex(key: string): Promise<void> {
  if (key === INDEX_KEY) return;
  const keys = await readIndex();
  if (!keys.includes(key)) {
    await writeIndex([...keys, key]);
  }
}

async function removeFromIndex(key: string): Promise<void> {
  if (key === INDEX_KEY) return;
  const keys = await readIndex();
  if (keys.includes(key)) {
    await writeIndex(keys.filter((item) => item !== key));
  }
}

async function deleteChunks(key: string): Promise<void> {
  const manifest = await SecureStore.getItemAsync(`${key}${CHUNK_SUFFIX}`);
  if (!manifest) return;
  const count = Number(manifest);
  if (Number.isInteger(count) && count > 0) {
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)).catch(() => undefined)
      )
    );
  }
  await SecureStore.deleteItemAsync(`${key}${CHUNK_SUFFIX}`);
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }

  assertValidKey(key);
  const manifest = await SecureStore.getItemAsync(`${key}${CHUNK_SUFFIX}`);
  if (manifest) {
    const count = Number(manifest);
    if (!Number.isInteger(count) || count <= 0) return null;
    const parts: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, index));
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  }

  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }

  assertValidKey(key);
  await deleteChunks(key);

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    await SecureStore.deleteItemAsync(`${key}${CHUNK_SUFFIX}`).catch(() => undefined);
  } else {
    const chunks: string[] = [];
    for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
      chunks.push(value.slice(offset, offset + CHUNK_SIZE));
    }
    for (let index = 0; index < chunks.length; index += 1) {
      await SecureStore.setItemAsync(chunkKey(key, index), chunks[index], {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
    }
    await SecureStore.setItemAsync(`${key}${CHUNK_SUFFIX}`, String(chunks.length), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
  }

  await addToIndex(key);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }

  assertValidKey(key);
  await deleteChunks(key);
  await SecureStore.deleteItemAsync(key);
  await removeFromIndex(key);
}

/**
 * Remove every item this app has written to SecureStore, including a Supabase
 * session that was stored through `secureAuthStorage`. Used by account deletion
 * so deleting an account cannot leave session material behind.
 */
export async function clearKnownSecureItems(): Promise<void> {
  if (Platform.OS === 'web') {
    await Promise.all(
      Object.values(SECURE_STORAGE_KEYS).map((key) => AsyncStorage.removeItem(key))
    );
    return;
  }

  const indexed = await readIndex();
  const keys = Array.from(new Set([...indexed, ...Object.values(SECURE_STORAGE_KEYS)]));
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      assertValidKey(key);
      await deleteChunks(key);
      await SecureStore.deleteItemAsync(key);
    })
  );
  const failed = results.some((result) => result.status === 'rejected');
  await SecureStore.deleteItemAsync(INDEX_KEY).catch(() => undefined);
  if (failed) {
    throw new Error('Some secure-storage entries could not be removed.');
  }
}

/** Supabase auth storage adapter. Chunked on native, plain AsyncStorage on web. */
export const secureAuthStorage = {
  getItem: getSecureItem,
  setItem: setSecureItem,
  removeItem: deleteSecureItem,
};
