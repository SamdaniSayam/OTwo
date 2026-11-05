import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { withRetry, isTransientError } from '../src/services/supabaseRetry';

test('retries a transient error then succeeds', async () => {
  let attempts = 0;
  const result = await withRetry(async () => {
    attempts += 1;
    if (attempts < 3) {
      throw new Error('network error');
    }
    return 'success';
  });
  assert.equal(result, 'success');
  assert.equal(attempts, 3);
});

test('retries rate limit errors with backoff', async () => {
  let attempts = 0;
  const result = await withRetry(async () => {
    attempts += 1;
    if (attempts < 2) {
      throw Object.assign(new Error('rate limit exceeded'), { status: 429 });
    }
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.equal(attempts, 2);
});

test('does not retry non-transient errors', async () => {
  let attempts = 0;
  await assert.rejects(
    withRetry(async () => {
      attempts += 1;
      throw Object.assign(new Error('Some permanent auth error'), { status: 400 });
    }),
    (err: Error) => err.message === 'Some permanent auth error'
  );
  assert.equal(attempts, 1);
});

test('isTransientError detects status 429 and network-like messages', () => {
  assert.equal(isTransientError(Object.assign(new Error('x'), { status: 429 })), true);
  assert.equal(isTransientError(new Error('network error')), true);
});
