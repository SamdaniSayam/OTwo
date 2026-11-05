/**
 * Helpers for translating Supabase auth errors into user-safe messages.
 *
 * The live Supabase project verified real rate-limit responses from the Auth
 * API (`429`, `over_email_send_rate_limit`, reset cooldown wording). The app
 * must surface those conditions clearly instead of leaking raw or generic
 * backend text, and must never pretend a rate-limited request succeeded.
 */
export interface AuthErrorLike {
  status?: number;
  code?: string;
  message?: string;
}

const EMAIL_SEND_RATE_LIMIT_MESSAGE =
  'Too many confirmation or password-reset emails were sent recently. Please wait before requesting another one.';

const RESET_COOLDOWN_MESSAGE =
  'For security, password reset requests are rate-limited. Please wait a few minutes before trying again.';

const TOO_MANY_ATTEMPTS_MESSAGE =
  'Too many attempts. Please wait a few minutes before trying again.';

function errorText(error: unknown): string {
  const err = (error ?? null) as AuthErrorLike | null;
  const code = err?.code ?? '';
  const message = err?.message ?? '';
  return `${code} ${message}`.toLowerCase();
}

export function isRateLimitError(error: unknown): boolean {
  const err = (error ?? null) as AuthErrorLike | null;
  if (err && err.status === 429) {
    return true;
  }
  const text = errorText(error);
  return (
    text.includes('rate limit') ||
    text.includes('over_email_send_rate_limit') ||
    text.includes('over_request_rate_limit') ||
    text.includes('over_sms_send_rate_limit') ||
    text.includes('over_waf_rate_limit') ||
    text.includes('too many requests')
  );
}

export function isEmailSendRateLimitError(error: unknown): boolean {
  const text = errorText(error);
  return (
    text.includes('over_email_send_rate_limit') ||
    text.includes('email_send_rate_limit') ||
    text.includes('email rate limit')
  );
}

export function isResetCooldownError(error: unknown): boolean {
  const text = errorText(error);
  return (
    text.includes('only request this after') ||
    text.includes('cooldown') ||
    text.includes('try again later')
  );
}

/**
 * Return a user-safe message for an auth error. Rate limits get explicit,
 * actionable copy; everything else passes through the original message, and a
 * final fallback is returned when no message exists.
 */
export function describeAuthError(error: unknown, fallback: string): string {
  if (isRateLimitError(error)) {
    if (isEmailSendRateLimitError(error)) {
      return EMAIL_SEND_RATE_LIMIT_MESSAGE;
    }
    if (isResetCooldownError(error)) {
      return RESET_COOLDOWN_MESSAGE;
    }
    return TOO_MANY_ATTEMPTS_MESSAGE;
  }

  const err = (error ?? null) as AuthErrorLike | null;
  const message = err?.message ?? '';
  if (message && message.trim().length > 0) {
    return message;
  }
  return fallback;
}
