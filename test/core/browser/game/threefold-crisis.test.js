import {
  advanceCrisisClock,
  createCrisisClock,
} from '../../../../src/core/browser/game/threefold/crisis.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

describe('THREEFOLD deterministic crisis clock', () => {
  test('moves through authored stages at exact game-minute boundaries', () => {
    const initial = createCrisisClock(THRESHOLDS);
    const urgent = advanceCrisisClock(initial, {
      type: 'travel',
      elapsedGameMinutes: 4,
    });
    const surge = advanceCrisisClock(urgent, {
      type: 'interaction',
      elapsedGameMinutes: 5,
    });
    const aftermath = advanceCrisisClock(surge, {
      type: 'wait',
      elapsedGameMinutes: 6,
    });

    expect(initial).toEqual({
      elapsedMinutes: 0,
      stage: 'rising',
      thresholds: THRESHOLDS,
    });
    expect(urgent).toMatchObject({ elapsedMinutes: 4, stage: 'urgent' });
    expect(surge).toMatchObject({ elapsedMinutes: 9, stage: 'surge' });
    expect(aftermath).toMatchObject({ elapsedMinutes: 15, stage: 'aftermath' });
    expect(
      advanceCrisisClock(aftermath, { type: 'wait', elapsedGameMinutes: 1 })
    ).toBe(aftermath);
  });

  test.each(['travel', 'combat', 'interaction', 'wait', 'failed-action'])(
    'advances for the world action %s',
    type => {
      expect(
        advanceCrisisClock(createCrisisClock(THRESHOLDS), {
          type,
          elapsedGameMinutes: 0.5,
        }).elapsedMinutes
      ).toBe(0.5);
    }
  );

  test.each(['menu', 'pause', 'accessibility', 'render', 'unknown'])(
    'does not advance for the non-world event %s',
    type => {
      const clock = createCrisisClock(THRESHOLDS);
      expect(advanceCrisisClock(clock, { type, elapsedGameMinutes: 10 })).toBe(
        clock
      );
    }
  );

  test.each([
    null,
    undefined,
    5,
    { type: 'travel' },
    { type: 'travel', elapsedGameMinutes: 0 },
    { type: 'travel', elapsedGameMinutes: -1 },
    { type: 'travel', elapsedGameMinutes: Number.NaN },
    { type: 'travel', elapsedGameMinutes: Number.POSITIVE_INFINITY },
  ])('ignores malformed or zero-duration event %p', event => {
    const clock = createCrisisClock(THRESHOLDS);
    expect(advanceCrisisClock(clock, event)).toBe(clock);
  });

  test('clones threshold values and clock state when time advances', () => {
    const thresholds = { ...THRESHOLDS };
    const clock = createCrisisClock(thresholds);
    thresholds.urgentAtMinutes = 100;
    const advanced = advanceCrisisClock(clock, {
      type: 'combat',
      elapsedGameMinutes: 1,
    });

    expect(clock.thresholds).toEqual(THRESHOLDS);
    expect(advanced).not.toBe(clock);
    expect(advanced.thresholds).not.toBe(clock.thresholds);
    expect(clock.elapsedMinutes).toBe(0);
  });

  test.each([
    null,
    undefined,
    {},
    { urgentAtMinutes: 0, surgeAtMinutes: 9, aftermathAtMinutes: 15 },
    { urgentAtMinutes: 4, surgeAtMinutes: 4, aftermathAtMinutes: 15 },
    { urgentAtMinutes: 4, surgeAtMinutes: 9, aftermathAtMinutes: 9 },
    { urgentAtMinutes: 4, surgeAtMinutes: Number.NaN, aftermathAtMinutes: 15 },
  ])('rejects malformed or unordered thresholds %p', thresholds => {
    expect(() => createCrisisClock(thresholds)).toThrow();
  });

  test.each([
    null,
    { ...createCrisisClock(THRESHOLDS), elapsedMinutes: -1 },
    { ...createCrisisClock(THRESHOLDS), elapsedMinutes: 16 },
    { ...createCrisisClock(THRESHOLDS), elapsedMinutes: 5 },
    { ...createCrisisClock(THRESHOLDS), stage: 'urgent' },
  ])('rejects inconsistent clock state %p', clock => {
    expect(() =>
      advanceCrisisClock(clock, { type: 'wait', elapsedGameMinutes: 1 })
    ).toThrow();
  });
});
