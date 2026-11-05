import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { shouldRunAuthAutoRefresh } from '../src/utils/authAutoRefresh';

test('runs native auto-refresh only while the app is active', () => {
  assert.equal(
    shouldRunAuthAutoRefresh({ platform: 'ios', supabaseConfigured: true, appState: 'active' }),
    true
  );
  assert.equal(
    shouldRunAuthAutoRefresh({ platform: 'android', supabaseConfigured: true, appState: 'active' }),
    true
  );
  assert.equal(
    shouldRunAuthAutoRefresh({ platform: 'ios', supabaseConfigured: true, appState: 'background' }),
    false
  );
  assert.equal(
    shouldRunAuthAutoRefresh({ platform: 'android', supabaseConfigured: true, appState: 'inactive' }),
    false
  );
});

test('never starts auto-refresh on web or without cloud configuration', () => {
  assert.equal(
    shouldRunAuthAutoRefresh({ platform: 'web', supabaseConfigured: true, appState: 'active' }),
    false
  );
  assert.equal(
    shouldRunAuthAutoRefresh({ platform: 'ios', supabaseConfigured: false, appState: 'active' }),
    false
  );
});
