import { describe, expect, test } from '@jest/globals';
import { runnerAvailabilityRegistry } from '../../../src/core/browser/toys/2026-08-18/runnerAvailabilityRegistry.js';

describe('runnerAvailabilityRegistry', () => {
  test('normalizes and sorts runners with availability windows', () => {
    const result = JSON.parse(
      runnerAvailabilityRegistry(
        JSON.stringify({
          runners: [
            {
              runnerId: 'RUN002',
              name: 'Jo',
              availability: [{ from: '14:00', to: '17:00' }],
            },
            {
              runnerId: 'RUN001',
              name: 'Alex',
              availability: [{ from: '09:00', to: '12:00' }],
            },
          ],
        })
      )
    );
    expect(result.runners.map(runner => runner.runnerId)).toEqual([
      'RUN001',
      'RUN002',
    ]);
    expect(result.runners[0].availability).toEqual([
      { from: '09:00', to: '12:00' },
    ]);
    expect(result.summary).toEqual({ runnerCount: 2 });
  });

  test('applies safe defaults and ignores malformed windows', () => {
    expect(
      JSON.parse(
        runnerAvailabilityRegistry(
          JSON.stringify({
            runners: [{ availability: [{ from: '09:00' }, 'bad'] }],
          })
        )
      )
    ).toEqual({
      runners: [{ runnerId: 'runner-1', name: 'runner-1', availability: [] }],
      summary: { runnerCount: 1 },
    });
  });

  test('returns an empty registry for invalid input', () => {
    expect(JSON.parse(runnerAvailabilityRegistry('{'))).toEqual({
      runners: [],
      summary: { runnerCount: 0 },
    });
  });

  test('ignores null, array, and scalar runner/window records', () => {
    const result = JSON.parse(
      runnerAvailabilityRegistry(
        JSON.stringify({
          runners: [null, [], 0, { availability: [null, [], 0] }],
        })
      )
    );
    expect(result).toEqual({
      runners: [
        { runnerId: 'runner-3', name: 'runner-3', availability: [] },
        { runnerId: 'runner-4', name: 'runner-4', availability: [] },
      ],
      summary: { runnerCount: 2 },
    });
  });
});
