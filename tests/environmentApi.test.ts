import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { fetchEnvironmentData } from '../src/services/environmentApi';

test('returns a categorized reading for valid live data', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({ current: { european_aqi: 62 } }),
    }) as Response) as typeof fetch;

  try {
    const data = await fetchEnvironmentData(40.7128, -74.006);
    assert.ok(data);
    assert.equal(data.aqi, 62);
    assert.equal(data.aqiCategory, 'Sensitive');
    assert.equal(data.isStale, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('returns null instead of inventing an all-clear when data is missing', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({ current: {} }),
    }) as Response) as typeof fetch;

  try {
    assert.equal(await fetchEnvironmentData(40.7128, -74.006), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects missing or out-of-range coordinates without a network request', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return { ok: true, json: async () => ({}) } as Response;
  }) as typeof fetch;

  try {
    assert.equal(await fetchEnvironmentData(Number.NaN, 10), null);
    assert.equal(await fetchEnvironmentData(91, 10), null);
    assert.equal(await fetchEnvironmentData(10, -181), null);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('returns null when the network request fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('offline');
  }) as typeof fetch;

  try {
    assert.equal(await fetchEnvironmentData(40.7128, -74.006), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
