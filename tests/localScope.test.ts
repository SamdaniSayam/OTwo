import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  getActiveLocalUserId,
  isRecordForActiveUser,
  scopedStorageKey,
  setActiveLocalUserId,
  requireActiveLocalUserId,
} from '../src/utils/localScope';

test('storage keys are isolated per account', () => {
  const a = scopedStorageKey('@otwo_companion_chat_history', 'account-a');
  const b = scopedStorageKey('@otwo_companion_chat_history', 'account-b');
  assert.notEqual(a, b);
  assert.equal(a, '@otwo_companion_chat_history::account-a');
  assert.equal(
    scopedStorageKey('@key', 'user/with/slashes'),
    '@key::user%2Fwith%2Fslashes'
  );
});

test('fails closed when no account is active', () => {
  setActiveLocalUserId(null);
  assert.equal(getActiveLocalUserId(), null);
  assert.throws(() => requireActiveLocalUserId());
  assert.throws(() => scopedStorageKey('@key'));
  assert.equal(isRecordForActiveUser({ user_id: 'someone' }), false);
});

test('only accepts records for the active account', () => {
  setActiveLocalUserId('account-a');
  assert.equal(getActiveLocalUserId(), 'account-a');
  assert.equal(requireActiveLocalUserId(), 'account-a');
  assert.equal(isRecordForActiveUser({ user_id: 'account-a' }), true);
  assert.equal(isRecordForActiveUser({ user_id: 'account-b' }), false);
  assert.equal(isRecordForActiveUser(null), false);

  setActiveLocalUserId(null);
});
