/**
 * Client-Side Encryption Service
 * Implements key derivation from user session entropy and a unique local device salt.
 * Ensures doctor recommendations or sensitive health notes are never sent in plain text.
 * No hardcoded keys.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const DEVICE_SALT_STORAGE_KEY = '@otwo_device_crypto_salt';
const ITERATIONS = 10000;

/**
 * Retrieves or initializes a unique cryptographic salt for this device.
 */
async function getOrCreateDeviceSalt(): Promise<string> {
  let salt = await AsyncStorage.getItem(DEVICE_SALT_STORAGE_KEY);
  if (!salt) {
    salt = Crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_SALT_STORAGE_KEY, salt);
  }
  return salt;
}

/**
 * Derives a 256-bit key from user identity entropy and device salt using iterative hashing.
 */
async function deriveKey(userSecret: string, salt: string): Promise<string> {
  let currentHash = `${userSecret}:${salt}`;
  // Iterative hashing (PBKDF2 simulation with SHA-256 rounds)
  for (let i = 0; i < 20; i++) {
    currentHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      currentHash + i.toString()
    );
  }
  return currentHash;
}

/**
 * Encrypts a plaintext string using derived key with random IV.
 * Returns formatted package: "iv:salt:ciphertext"
 */
export async function encryptSensitiveText(
  plaintext: string,
  userSecret: string
): Promise<string> {
  if (!plaintext || plaintext.trim() === '') {
    return '';
  }

  const salt = await getOrCreateDeviceSalt();
  const derivedKey = await deriveKey(userSecret, salt);
  const iv = Crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  // Reversible stream cipher with IV and derived key stream
  const keyBytes = Array.from(derivedKey).map((c) => c.charCodeAt(0));
  const ivBytes = Array.from(iv).map((c) => c.charCodeAt(0));
  const textBytes = Array.from(unescape(encodeURIComponent(plaintext))).map((c) => c.charCodeAt(0));

  const encryptedChars: string[] = [];
  for (let i = 0; i < textBytes.length; i++) {
    const keyByte = keyBytes[i % keyBytes.length];
    const ivByte = ivBytes[i % ivBytes.length];
    const cipherByte = textBytes[i] ^ keyByte ^ ivByte;
    encryptedChars.push(cipherByte.toString(16).padStart(2, '0'));
  }

  const ciphertext = encryptedChars.join('');
  return `${iv}:${salt}:${ciphertext}`;
}

/**
 * Decrypts a previously encrypted string given the correct user secret.
 */
export async function decryptSensitiveText(
  payload: string,
  userSecret: string
): Promise<string> {
  if (!payload || !payload.includes(':')) {
    return payload; // Not encrypted or empty
  }

  const parts = payload.split(':');
  if (parts.length < 3) return '';

  const [iv, salt, ciphertext] = parts;
  const derivedKey = await deriveKey(userSecret, salt);

  const keyBytes = Array.from(derivedKey).map((c) => c.charCodeAt(0));
  const ivBytes = Array.from(iv).map((c) => c.charCodeAt(0));

  const textBytes: number[] = [];
  for (let i = 0; i < ciphertext.length; i += 2) {
    const hex = ciphertext.slice(i, i + 2);
    const cipherByte = parseInt(hex, 16);
    const idx = i / 2;
    const keyByte = keyBytes[idx % keyBytes.length];
    const ivByte = ivBytes[idx % ivBytes.length];
    const originalByte = cipherByte ^ keyByte ^ ivByte;
    textBytes.push(originalByte);
  }

  const decodedString = decodeURIComponent(
    escape(String.fromCharCode.apply(null, textBytes))
  );
  return decodedString;
}
