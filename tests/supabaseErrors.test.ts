import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  describeAuthError,
  isEmailSendRateLimitError,
  isRateLimitError,
  isResetCooldownError,
} from '../src/services/supabaseErrors';

test('detects rate limit errors reported with HTTP status 429', () => {
  assert.equal(isRateLimitError({ status: 429, message: 'Too Many Requests' }), true);
});

test('detects GoTrue rate limit error codes and messages', () => {
  assert.equal(
    isRateLimitError({
      status: 429,
      code: 'over_email_send_rate_limit',
      message: 'email rate limit exceeded',
    }),
    true
  );
  assert.equal(
    isRateLimitError({ status: 429, code: 'over_request_rate_limit', message: 'Too many requests' }),
    true
  );
});

test('describes an email send rate limit with actionable copy', () => {
  const message = describeAuthError(
    { status: 429, code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' },
    'fallback'
  );
  assert.equal(isEmailSendRateLimitError({ status: 429, code: 'over_email_send_rate_limit', message: 'x' }), true);
  assert.ok(message.toLowerCase().includes('email'));
  assert.ok(!message.includes('fallback'));
});

test('describes a password reset cooldown with actionable copy', () => {
  const resetError = {
    status: 429,
    code: 'over_request_rate_limit',
    message: 'For security purposes, you can only request this after 60 seconds',
  };
  const message = describeAuthError(resetError, 'fallback');
  assert.equal(isResetCooldownError(resetError), true);
  assert.ok(message.toLowerCase().includes('security'));
});

test('uses the too-many-attempts copy for generic rate limits', () => {
  const message = describeAuthError({ status: 429, message: 'rate limit exceeded' }, 'fallback');
  assert.ok(message.toLowerCase().includes('wait'));
});

test('passes through non-rate-limit auth error messages', () => {
  assert.equal(
    describeAuthError({ status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' }, 'fallback'),
    'Invalid login credentials'
  );
});

test('returns the fallback when the error carries no message', () => {
  assert.equal(describeAuthError(null, 'Login failed'), 'Login failed');
  assert.equal(describeAuthError(undefined, 'Login failed'), 'Login failed');
});
