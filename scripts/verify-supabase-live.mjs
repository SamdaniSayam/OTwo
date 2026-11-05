#!/usr/bin/env node
/**
 * Live RLS and account-deletion verification for OTwo.
 *
 * This script uses two already-confirmed test accounts and the project's
 * publishable key. It never uses a service-role/secret key and never prints
 * access tokens or passwords.
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_ANON_KEY=sb_publishable_... \
 *   TEST_A_EMAIL=... TEST_A_PASSWORD=... \
 *   TEST_B_EMAIL=... TEST_B_PASSWORD=... \
 *   node scripts/verify-supabase-live.mjs
 *
 * Add --delete-user-a only when you are ready to permanently delete account A.
 * The script tests the deletion function's failure path first, then deletes A
 * and checks that A's session is invalid while B still works.
 *
 * Use a disposable Supabase project and disposable test accounts. The script
 * writes small verification rows to A and B; account deletion removes A's.
 */

import { createClient } from '@supabase/supabase-js';

const DELETE_USER_A = process.argv.includes('--delete-user-a');

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(2);
  }
  return value.trim();
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}

function fail(message) {
  throw new Error(message);
}

function expectNoError(label, result) {
  if (result.error) {
    fail(`${label}: ${result.error.message}`);
  }
  return result.data;
}

function expectEmpty(label, result) {
  const data = expectNoError(label, result);
  if (!Array.isArray(data) || data.length !== 0) {
    fail(`${label}: expected 0 rows, received ${JSON.stringify(data)}`);
  }
  return data;
}

function expectRows(label, result, expectedCount) {
  const data = expectNoError(label, result);
  if (!Array.isArray(data) || data.length !== expectedCount) {
    fail(
      `${label}: expected ${expectedCount} row(s), received ${
        Array.isArray(data) ? JSON.stringify(data) : String(data)
      }`
    );
  }
  return data;
}

function expectDenied(label, result) {
  if (!result.error && (!Array.isArray(result.data) || result.data.length !== 0)) {
    fail(`${label}: expected an error or 0 rows, received ${JSON.stringify(result.data)}`);
  }
  return result.error ? 'denied' : '0 rows';
}

const results = [];

async function check(label, run) {
  try {
    const detail = await run();
    results.push({ label, ok: true });
    console.log(`PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ label, ok: false, error: message });
    console.error(`FAIL  ${label} — ${message}`);
  }
}

async function signIn(label, url, key, email, password) {
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    fail(`${label} sign-in failed: ${error.message}`);
  }
  if (!data.user) {
    fail(`${label} sign-in returned no user.`);
  }
  return { client, user: data.user };
}

const supabaseUrl = required('SUPABASE_URL');
const anonKey = required('SUPABASE_ANON_KEY');
const aEmail = required('TEST_A_EMAIL');
const aPassword = required('TEST_A_PASSWORD');
const bEmail = required('TEST_B_EMAIL');
const bPassword = required('TEST_B_PASSWORD');

if (aEmail.toLowerCase() === bEmail.toLowerCase()) {
  console.error('TEST_A_EMAIL and TEST_B_EMAIL must be different accounts.');
  process.exit(2);
}

console.log('OTwo live Supabase verification');
console.log(`Project: ${supabaseUrl}`);
console.log(`Account A: ${maskEmail(aEmail)}`);
console.log(`Account B: ${maskEmail(bEmail)}`);
console.log(`Delete A after checks: ${DELETE_USER_A ? 'yes' : 'no'}`);
console.log('');

try {
  const a = await signIn('A', supabaseUrl, anonKey, aEmail, aPassword);
  const b = await signIn('B', supabaseUrl, anonKey, bEmail, bPassword);
  const anon = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  console.log(`A user id: ${a.user.id}`);
  console.log(`B user id: ${b.user.id}`);
  console.log('');

  // Seed/refresh deterministic test rows through each user's own session.
  const aProfile = await a.client
    .from('profiles')
    .upsert({
      id: a.user.id,
      email: a.user.email || aEmail,
      age: 30,
      notification_enabled: true,
    })
    .select('id');
  if (aProfile.error) {
    fail(`Could not seed A profile: ${aProfile.error.message}`);
  }

  const bProfile = await b.client
    .from('profiles')
    .upsert({
      id: b.user.id,
      email: b.user.email || bEmail,
      age: 40,
      notification_enabled: true,
    })
    .select('id');
  if (bProfile.error) {
    fail(`Could not seed B profile: ${bProfile.error.message}`);
  }

  const aOnboarding = await a.client
    .from('onboarding_responses')
    .upsert(
      { user_id: a.user.id, personal_goals: ['verification-a'] },
      { onConflict: 'user_id' }
    );
  if (aOnboarding.error) {
    fail(`Could not seed A onboarding: ${aOnboarding.error.message}`);
  }

  const bOnboarding = await b.client
    .from('onboarding_responses')
    .upsert(
      { user_id: b.user.id, personal_goals: ['verification-b'] },
      { onConflict: 'user_id' }
    );
  if (bOnboarding.error) {
    fail(`Could not seed B onboarding: ${bOnboarding.error.message}`);
  }

  await check('anonymous client cannot read profiles', async () => {
    const result = await anon.from('profiles').select('id').limit(1);
    return expectDenied('anonymous profile read', result);
  });

  await check('A can read own profile', async () => {
    const data = expectRows(
      'A own profile',
      await a.client
        .from('profiles')
        .select('id,email,age')
        .eq('id', a.user.id),
      1
    );
    if (data[0].id !== a.user.id) fail('A read a different profile id.');
    return '1 row';
  });

  await check('A cannot read B profile', async () => {
    expectEmpty(
      'A read B profile',
      await a.client.from('profiles').select('id,email').eq('id', b.user.id)
    );
    return '0 rows';
  });

  await check('A cannot update B profile', async () => {
    expectEmpty(
      'A update B profile',
      await a.client
        .from('profiles')
        .update({ age: 99 })
        .eq('id', b.user.id)
        .select('id')
    );
    const bData = expectRows(
      'B profile after A update',
      await b.client.from('profiles').select('age').eq('id', b.user.id),
      1
    );
    if (Number(bData[0].age) !== 40) fail(`B age changed to ${JSON.stringify(bData[0].age)}`);
    return 'B age unchanged';
  });

  await check('A cannot delete B profile', async () => {
    expectEmpty(
      'A delete B profile',
      await a.client.from('profiles').delete().eq('id', b.user.id).select('id')
    );
    expectRows(
      'B profile after A delete',
      await b.client.from('profiles').select('id').eq('id', b.user.id),
      1
    );
    return 'B profile still present';
  });

  await check('A cannot insert audit log', async () => {
    const result = await a.client
      .from('audit_logs')
      .insert({ user_id: a.user.id, action: 'LIVE_VERIFICATION' })
      .select('id');
    return expectDenied('audit insert', result);
  });

  await check('A cannot read B audit logs', async () => {
    expectEmpty(
      'A read B audit logs',
      await a.client.from('audit_logs').select('id').eq('user_id', b.user.id)
    );
    return '0 rows';
  });

  await check('A cannot read B onboarding', async () => {
    expectEmpty(
      'A read B onboarding',
      await a.client
        .from('onboarding_responses')
        .select('user_id,personal_goals')
        .eq('user_id', b.user.id)
    );
    return '0 rows';
  });

  await check('A cannot update B onboarding', async () => {
    expectEmpty(
      'A update B onboarding',
      await a.client
        .from('onboarding_responses')
        .update({ personal_goals: ['hacked'] })
        .eq('user_id', b.user.id)
        .select('user_id')
    );
    const bData = expectRows(
      'B onboarding after A update',
      await b.client
        .from('onboarding_responses')
        .select('personal_goals')
        .eq('user_id', b.user.id),
      1
    );
    if (JSON.stringify(bData[0].personal_goals) !== JSON.stringify(['verification-b'])) {
      fail(`B onboarding changed to ${JSON.stringify(bData[0].personal_goals)}`);
    }
    return 'B onboarding unchanged';
  });

  await check('A cannot insert B onboarding', async () => {
    const result = await a.client
      .from('onboarding_responses')
      .insert({ user_id: b.user.id, personal_goals: ['hacked'] })
      .select('user_id');
    return expectDenied('B onboarding insert', result);
  });

  await check('A cannot upsert B profile', async () => {
    const result = await a.client
      .from('profiles')
      .upsert({
        id: b.user.id,
        email: a.user.email || aEmail,
        age: 99,
      })
      .select('id');
    expectDenied('A upsert B profile', result);
    const bData = expectRows(
      'B profile after A upsert',
      await b.client.from('profiles').select('age').eq('id', b.user.id),
      1
    );
    if (Number(bData[0].age) !== 40) fail(`B age changed to ${JSON.stringify(bData[0].age)}`);
    return 'B profile unchanged';
  });

  await check('A can update own profile', async () => {
    const data = expectRows(
      'A update own profile',
      await a.client
        .from('profiles')
        .update({ age: 31 })
        .eq('id', a.user.id)
        .select('id,age'),
      1
    );
    if (Number(data[0].age) !== 31) fail('A own update did not persist.');
    return '1 row';
  });

  await check('A can update own onboarding', async () => {
    const data = expectRows(
      'A update own onboarding',
      await a.client
        .from('onboarding_responses')
        .update({ personal_goals: ['verification-a-updated'] })
        .eq('user_id', a.user.id)
        .select('user_id'),
      1
    );
    if (data[0].user_id !== a.user.id) fail('A updated a different onboarding row.');
    return '1 row';
  });

  await check('A can query own audit logs', async () => {
    const result = await a.client
      .from('audit_logs')
      .select('id')
      .eq('user_id', a.user.id)
      .limit(1);
    if (result.error) fail(`A audit select failed: ${result.error.message}`);
    return `${result.data.length} row(s)`;
  });

  if (DELETE_USER_A) {
    console.log('\nAccount deletion checks (A will be permanently deleted)');

    await check('deletion function rejects missing confirmation', async () => {
      const result = await a.client.functions.invoke('delete-account', { body: {} });
      if (!result.error && result.data?.success !== false) {
        fail('The function accepted a request without confirm:true.');
      }
      const own = await a.client.from('profiles').select('id').eq('id', a.user.id);
      if (own.error || own.data.length !== 1) {
        fail('A profile was removed by a rejected deletion request.');
      }
      return 'rejected; A data intact';
    });

    await check('deletion function deletes A', async () => {
      const result = await a.client.functions.invoke('delete-account', {
        body: { confirm: true },
      });
      if (result.error) fail(`Function error: ${result.error.message}`);
      if (result.data?.success !== true) {
        fail(`Unexpected function response: ${JSON.stringify(result.data)}`);
      }
      return 'success';
    });

    await check('A session is no longer valid', async () => {
      const result = await a.client.auth.getUser();
      if (!result.error && result.data.user) {
        fail('A session still resolves to a user after deletion.');
      }
      return 'invalidated';
    });

    await check('B account still works after A deletion', async () => {
      expectRows(
        'B profile after A deletion',
        await b.client.from('profiles').select('id,age').eq('id', b.user.id),
        1
      );
      return '1 row';
    });

    console.log('');
    console.log('Verify the server-side cascade in the Supabase SQL editor with:');
    console.log(`  select count(*) from auth.users where id = '${a.user.id}';`);
    console.log(`  select count(*) from public.profiles where id = '${a.user.id}';`);
    console.log(
      `  select count(*) from public.onboarding_responses where user_id = '${a.user.id}';`
    );
    console.log(`  select count(*) from public.audit_logs where user_id = '${a.user.id}';`);
    console.log('All four counts must be 0.');
  }

  await Promise.allSettled([
    a.client.auth.signOut(),
    b.client.auth.signOut(),
    anon.auth.signOut(),
  ]);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nVerification could not run: ${message}`);
  process.exitCode = 1;
}

const failed = results.filter((result) => !result.ok);
console.log('');
console.log(`${results.length - failed.length}/${results.length} checks passed.`);

if (failed.length > 0) {
  console.error('Failed checks:');
  for (const result of failed) {
    console.error(`  - ${result.label}: ${result.error}`);
  }
  process.exitCode = 1;
} else if (!DELETE_USER_A) {
  console.log('A was not deleted. Re-run with --delete-user-a to verify server-side deletion.');
}
