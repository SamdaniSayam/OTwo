/**
 * Account deletion Edge Function.
 *
 * The authenticated user is resolved from the caller's JWT. A service-role
 * client is used only inside this function to delete the auth user, which
 * cascades to profiles and onboarding rows. Audit rows are removed first so no
 * account-linked metadata survives.
 *
 * The client treats any non-success response as a failed deletion and keeps
 * local data intact, allowing a safe retry.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Supabase now injects publishable/secret keys as JSON dictionaries while
 * still injecting the legacy anon/service_role keys. Read the new keys first
 * so this function keeps working after the legacy keys are retired.
 */
function readInjectedKey(jsonName: string, legacyName: string): string | undefined {
  const raw = Deno.env.get(jsonName);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const keys = parsed as Record<string, unknown>;
        if (typeof keys.default === 'string' && keys.default.length > 0) {
          return keys.default;
        }
        const first = Object.values(keys).find(
          (value): value is string => typeof value === 'string' && value.length > 0
        );
        if (first) return first;
      }
    } catch {
      // Fall through to the legacy key below.
    }
  }

  const legacy = Deno.env.get(legacyName);
  return legacy && legacy.length > 0 ? legacy : undefined;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed.' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ success: false, error: 'Missing authorization header.' }, 401);
  }

  let payload: { confirm?: boolean };
  try {
    payload = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  if (payload?.confirm !== true) {
    return json(
      { success: false, error: 'Explicit confirmation is required.' },
      400
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = readInjectedKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
  const serviceRoleKey = readInjectedKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(
      { success: false, error: 'The deletion service is not configured.' },
      500
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json({ success: false, error: 'Invalid or expired session.' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: auditError } = await admin
    .from('audit_logs')
    .delete()
    .eq('user_id', user.id);

  if (auditError) {
    return json(
      { success: false, error: 'Could not remove account audit records.' },
      500
    );
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return json(
      { success: false, error: 'Could not delete the account. Please retry.' },
      500
    );
  }

  return json({ success: true });
});
