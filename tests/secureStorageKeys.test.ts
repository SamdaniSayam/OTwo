import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  isValidSecureStorageKey,
  SECURE_STORAGE_KEYS,
} from '../src/utils/secureStorageKeys';

test('every built-in SecureStore key is accepted by the native key format', () => {
  for (const [name, key] of Object.entries(SECURE_STORAGE_KEYS)) {
    assert.equal(
      isValidSecureStorageKey(key),
      true,
      `${name} must be a valid SecureStore key`
    );
  }
});

test('the database key does not use expo-secure-store-unsafe characters', () => {
  // Regression: the key previously started with "@", which made secure storage
  // reject it before the encrypted database could be initialized.
  assert.equal(isValidSecureStorageKey(SECURE_STORAGE_KEYS.databaseKey), true);
  assert.equal(SECURE_STORAGE_KEYS.databaseKey.startsWith('@'), false);
});

test('rejects keys with separators or characters SecureStore cannot handle', () => {
  assert.equal(isValidSecureStorageKey(''), false);
  assert.equal(isValidSecureStorageKey('@otwo_db_key'), false);
  assert.equal(isValidSecureStorageKey('otwo/db/key'), false);
  assert.equal(isValidSecureStorageKey('otwo db key'), false);
  assert.equal(isValidSecureStorageKey('otwo:db:key'), false);
});

test('accepts dotted, dashed, and underscored keys', () => {
  assert.equal(isValidSecureStorageKey('otwo.db_key-test.1'), true);
});
