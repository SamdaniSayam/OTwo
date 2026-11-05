import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { performLocalWipe } from '../src/services/localWipe';

test('runs every wipe step in order and clears the active account', async () => {
  const calls: string[] = [];
  await performLocalWipe({
    closeDatabase: async () => {
      calls.push('close');
    },
    deleteDatabase: async () => {
      calls.push('delete');
    },
    clearAppStorage: async () => {
      calls.push('app');
    },
    clearSecureItems: async () => {
      calls.push('secure');
    },
    clearActiveAccount: () => {
      calls.push('active');
    },
  });

  assert.deepEqual(calls, ['close', 'delete', 'app', 'secure', 'active']);
});

test('reports a failure instead of claiming success when storage remains', async () => {
  const calls: string[] = [];

  await assert.rejects(
    performLocalWipe({
      clearAppStorage: async () => {
        calls.push('app');
        throw new Error('quota');
      },
      clearSecureItems: async () => {
        calls.push('secure');
      },
      clearActiveAccount: () => {
        calls.push('active');
      },
    }),
    /Could not fully delete local app storage/
  );

  // Remaining stores are still attempted, and the account fails closed.
  assert.deepEqual(calls, ['app', 'secure', 'active']);
});

test('reports database and secure-store failures together', async () => {
  await assert.rejects(
    performLocalWipe({
      closeDatabase: async () => {
        throw new Error('open');
      },
      deleteDatabase: async () => {
        throw new Error('locked');
      },
      clearAppStorage: async () => undefined,
      clearSecureItems: async () => {
        throw new Error('keychain');
      },
      clearActiveAccount: () => undefined,
    }),
    (error: Error) => {
      assert.match(error.message, /local database/);
      assert.match(error.message, /secure storage/);
      assert.equal(error.message.match(/local database/g)?.length, 1);
      return true;
    }
  );
});
