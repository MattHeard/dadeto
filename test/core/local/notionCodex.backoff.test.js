import {
  getBinaryBackoffDelayMs,
  getNextIdleBackoffExponent,
  getNextPollAfterIso,
} from '../../../src/core/local/notion-codex/backoff.js';

describe('notion codex backoff helpers', () => {
  test('increments and clamps the idle exponent', () => {
    expect(
      getNextIdleBackoffExponent({
        previousExponent: 3,
        initialExponent: 1,
        maxExponent: 4,
      })
    ).toBe(4);
    expect(
      getNextIdleBackoffExponent({
        previousExponent: 9,
        initialExponent: 1,
        maxExponent: 4,
      })
    ).toBe(4);
  });

  test('falls back to the configured bounds when exponent settings are missing', () => {
    expect(
      getNextIdleBackoffExponent({
        previousExponent: null,
        initialExponent: 2,
        maxExponent: 5,
      })
    ).toBe(2);
    expect(
      getBinaryBackoffDelayMs({
        exponent: 3,
        baseDelayMs: 1000,
        initialExponent: 0,
        maxExponent: 6,
      })
    ).toBe(8000);
    expect(
      getBinaryBackoffDelayMs({
        exponent: 7,
        baseDelayMs: 1000,
        initialExponent: 'not-a-number',
        maxExponent: undefined,
      })
    ).toBe(1000);
  });

  test('schedules the next poll timestamp from a delay', () => {
    expect(
      getNextPollAfterIso({
        now: new Date('2026-04-30T07:45:00.000Z'),
        delayMs: 60000,
      })
    ).toBe('2026-04-30T07:46:00.000Z');
  });
});
