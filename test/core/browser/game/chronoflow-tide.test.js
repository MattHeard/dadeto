import { describe, expect, it } from '@jest/globals';
import {
  getTidePhase,
  isTideWindowOpen,
} from '../../../../src/core/browser/game/chronoflow/tide.js';

describe('Chronoflow trusted tide phase', () => {
  it('uses explicit Internet epoch input and cycles through four stable phases', () => {
    expect(getTidePhase(0, 120000)).toBe('rising');
    expect(getTidePhase(30000, 120000)).toBe('high');
    expect(getTidePhase(60000, 120000)).toBe('falling');
    expect(getTidePhase(90000, 120000)).toBe('low');
    expect(getTidePhase(120000, 120000)).toBe('rising');
  });

  it('rejects invalid time and tide cycle inputs', () => {
    expect(() => getTidePhase(-1)).toThrow(RangeError);
    expect(() => getTidePhase(Number.NaN)).toThrow(RangeError);
    expect(() => getTidePhase(0, 3)).toThrow(RangeError);
    expect(() => getTidePhase(0, 120000.5)).toThrow(RangeError);
  });

  it('opens a timed phase only for a synchronized trusted epoch', () => {
    expect(
      isTideWindowOpen({ clockStatus: 'synchronized', epochMs: 30000 })
    ).toBe(true);
    expect(isTideWindowOpen({ clockStatus: 'synchronized', epochMs: 0 })).toBe(
      false
    );
    expect(isTideWindowOpen({ clockStatus: 'stale', epochMs: 30000 })).toBe(
      false
    );
    expect(isTideWindowOpen({ clockStatus: 'offline', epochMs: null })).toBe(
      false
    );
    expect(
      isTideWindowOpen({
        clockStatus: 'synchronized',
        epochMs: 30000,
        requiredPhase: 'low',
      })
    ).toBe(false);
  });
});
