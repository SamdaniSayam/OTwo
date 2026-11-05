import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from '../db/supabase';
import { shouldRunAuthAutoRefresh } from '../utils/authAutoRefresh';

/**
 * Keep Supabase session refresh aligned with the native app lifecycle.
 *
 * A backgrounded app should not keep a refresh timer alive, and a returning app
 * should refresh promptly instead of waiting for the next timer tick. On web the
 * SDK's built-in timer is used as-is.
 */
export function useAuthAutoRefresh(): void {
  useEffect(() => {
    if (Platform.OS === 'web' || !isSupabaseConfigured) return;

    const sync = (nextState: string | null | undefined) => {
      if (
        shouldRunAuthAutoRefresh({
          platform: Platform.OS,
          supabaseConfigured: isSupabaseConfigured,
          appState: nextState,
        })
      ) {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    sync(AppState.currentState);
    const subscription = AppState.addEventListener('change', sync);
    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);
}
