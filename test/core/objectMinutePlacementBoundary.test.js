import { expect, test } from '@jest/globals';
import {
  withPlacementRunner,
  parseDurationMilliseconds,
  latestPlacement,
} from '../../src/core/object-minute-rental-search/request/index.js';

test('finite duration overflow retains no-placement rather than invalid-duration', () => {
  expect(parseDurationMilliseconds(Number.MAX_VALUE)).toBe(Infinity);
  expect(
    latestPlacement(Number.MAX_VALUE, '2026-01-01T00:00Z', '2026-01-01T01:00Z')
  ).toEqual({ feasible: false, reason: 'no-placement' });
});

test.each([undefined, null, '1', NaN, Infinity, -1])(
  'duration parsing rejects %p without coercion',
  value => expect(parseDurationMilliseconds(value)).toBeNull()
);

test.each([
  [0, 0],
  [0.5, 500],
  [60, 60000],
])('duration parsing converts %p seconds', (value, expected) => {
  expect(parseDurationMilliseconds(value)).toBe(expected);
});

test('placement failure outranks supplier constraints without probing runner state', () => {
  const request = Object.defineProperty({}, 'runnerSchedule', {
    get() {
      throw new Error('runner probe should not run');
    },
  });
  const failed = { feasible: false, reason: 'no-placement' };
  expect(withPlacementRunner(failed, request, 'outside-supplier-window')).toBe(
    failed
  );
  expect(
    withPlacementRunner({ feasible: true }, request, 'outside-supplier-window')
  ).toEqual({
    feasible: false,
    reason: 'outside-supplier-window',
  });
});
