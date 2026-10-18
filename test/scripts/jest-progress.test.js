import { jest } from '@jest/globals';
import {
  createJestProgressReporter,
  resolveJestProgressIntervalMs,
} from '../../scripts/jest-progress.js';

describe('Jest progress reporting', () => {
  it('uses the default cadence for absent or invalid overrides', () => {
    expect(resolveJestProgressIntervalMs(undefined)).toBe(3000);
    expect(resolveJestProgressIntervalMs('0')).toBe(3000);
    expect(resolveJestProgressIntervalMs('invalid')).toBe(3000);
    expect(resolveJestProgressIntervalMs('5000')).toBe(5000);
  });

  it('prints elapsed status and stops when the runner finishes', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    const messages = [];
    const stop = createJestProgressReporter({
      intervalMs: 3000,
      write: message => messages.push(message),
    });

    try {
      await jest.advanceTimersByTimeAsync(6000);
      expect(messages).toEqual([
        '[check-progress] Jest still running; elapsed 3s.\n',
        '[check-progress] Jest still running; elapsed 6s.\n',
      ]);

      stop();
      await jest.advanceTimersByTimeAsync(3000);
      expect(messages).toHaveLength(2);
    } finally {
      stop();
      jest.useRealTimers();
    }
  });
});
