import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadingTripLanguage, rememberTripLanguage } from '../lib/trip/language-hint';
test('loading language defaults to English and remembers each trip independently', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  try {
    assert.equal(loadingTripLanguage('new-trip'), 'en');
    rememberTripLanguage('trip-a', 'zh-TW');
    rememberTripLanguage('trip-b', 'en');
    assert.equal(loadingTripLanguage('trip-a'), 'zh-TW');
    assert.equal(loadingTripLanguage('trip-b'), 'en');
    values.set('travel-language:trip-a', 'invalid');
    assert.equal(loadingTripLanguage('trip-a'), 'en');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});
test('unavailable browser storage does not prevent loading', () => {
  assert.doesNotThrow(() => rememberTripLanguage('test', 'zh-TW'));
  assert.equal(loadingTripLanguage('test'), 'en');
});
