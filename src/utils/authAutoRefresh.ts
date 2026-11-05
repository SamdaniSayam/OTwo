/**
 * Pure decision helper for Supabase token auto-refresh.
 *
 * Supabase recommends pausing the refresh timer while a native app is in the
 * background and resuming it when the app becomes active again. Web keeps the
 * SDK's default timer, and unconfigured builds must never start a timer against
 * placeholder credentials.
 */
export function shouldRunAuthAutoRefresh(input: {
  platform: string;
  supabaseConfigured: boolean;
  appState: string | null | undefined;
}): boolean {
  return (
    input.platform !== 'web' &&
    input.supabaseConfigured &&
    input.appState === 'active'
  );
}
