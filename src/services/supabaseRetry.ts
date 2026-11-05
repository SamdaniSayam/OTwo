/**
 * Supabase retry service with exponential backoff for transient failures.
 *
 * The live verification tested rate-limit responses from the Auth API (`429`).
 * This retry service retries transient errors (network, rate limit, 5xx) with
 * exponential backoff (1s, 2s, 4s), but fails closed for non-transient errors.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    // Non-Error throws (thrown) are always transient
    return true;
  }

  const err = error as { code?: string; message?: string; status?: number };
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : '';

  // Status 429 — rate limit, always retry
  if (err.status === 429) return true;

  // HTTP 5xx — server error, retry
  if (typeof err.status === 'number' && err.status >= 500 && err.status < 600) return true;

  // HTTP 4xx client errors (other than 429) — permanent, do not retry
  if (typeof err.status === 'number' && err.status >= 400 && err.status < 500) return false;

  // Common transient error codes
  const transientCodes = new Set([
    'rate_limit',
    'over_email_send_rate_limit',
    'over_request_rate_limit',
    'over_sms_send_rate_limit',
    'over_waf_rate_limit',
    'network_error',
    'timeout',
    'fetch_failed',
    'token_refresh',
  ]);
  if (typeof err.code === 'string' && transientCodes.has(err.code.toLowerCase())) return true;

  // Rate-limiting messages
  if (msg.includes('rate limit') || msg.includes('rate limiting') || msg.includes('network error') || msg.includes('timeout') || msg.includes('fetch')) {
    return true;
  }

  // Non-transient client-side validation errors stay permanent
  const permanentMarkers = [
    'password should be at least',
    'passwords do not match',
    'please complete all fields',
  ];
  if (msg && permanentMarkers.some((m) => msg.includes(m))) {
    return false;
  }

  // Unknown Error instances are treated as transient
  return true;
}

/** Wrap a Supabase auth call with retry on transient errors. */
export function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let attempt = 0;

  async function attemptOnce() {
    try {
      return await operation();
    } catch (error) {
      // Non-transient errors fail immediately
      if (!isTransientError(error)) {
        throw error;
      }

      attempt += 1;
      if (attempt >= MAX_RETRIES) {
        // Last attempt; still transient, but no more retries
        throw error;
      }

      // Calculate exponential backoff delay (1s, 2s, 4s)
      const delayTime = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await delay(delayTime);
      return attemptOnce();
    }
  }

  return attemptOnce();
}

export { isTransientError };
export default withRetry;
