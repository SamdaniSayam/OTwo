/**
 * Optional Supabase client configuration.
 *
 * Cloud authentication is fail-closed: when the public URL and anon key are not
 * configured, sign-in and sign-up are disabled. Guest mode remains local-only.
 */
import { createClient } from '@supabase/supabase-js';
import { secureAuthStorage } from '../services/secureStorage';

// Default public sandbox or project credentials can be placed here or in .env
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured =
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureAuthStorage,
    storageKey: 'otwo-auth-session',
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
