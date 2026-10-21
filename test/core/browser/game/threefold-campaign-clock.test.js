import {
  advanceThreefoldCampaignClock,
  createThreefoldCampaignClock,
  getThreefoldActionDurationSeconds,
  restoreThreefoldCampaignClock,
  serializeThreefoldCampaignClock,
  THREEFOLD_ACTION_GAME_SECONDS,
} from '../../../../src/core/browser/game/threefold/campaign-clock.js';
import { createThreefoldCampaignClockSaveStore } from '../../../../src/core/browser/game/threefold/save.js';

describe('THREEFOLD campaign clock', () => {
  test('uses authored action costs and rejects non-world commands', () => {
    expect(getThreefoldActionDurationSeconds(null, 'broken-gate')).toBeNull();
    expect(getThreefoldActionDurationSeconds('move', 'broken-gate')).toBeNull();
    expect(
      getThreefoldActionDurationSeconds(
        { type: 'wait', elapsedGameMinutes: 2 },
        'weftways'
      )
    ).toBe(120);
    expect(
      getThreefoldActionDurationSeconds(
        { type: 'wait', elapsedGameMinutes: 0 },
        'weftways'
      )
    ).toBeNull();
    expect(
      getThreefoldActionDurationSeconds(
        { type: 'wait', elapsedGameMinutes: Number.NaN },
        'weftways'
      )
    ).toBeNull();
    expect(
      getThreefoldActionDurationSeconds(
        { type: 'wait', elapsedGameMinutes: '2' },
        'weftways'
      )
    ).toBeNull();
    expect(
      getThreefoldActionDurationSeconds({ type: 'move' }, 'weftways')
    ).toBe(THREEFOLD_ACTION_GAME_SECONDS);
    expect(
      getThreefoldActionDurationSeconds({ type: 'fight' }, 'broken-gate')
    ).toBe(THREEFOLD_ACTION_GAME_SECONDS);
    expect(
      getThreefoldActionDurationSeconds({ type: 'bypass' }, 'belltops')
    ).toBeNull();
    expect(
      getThreefoldActionDurationSeconds({ type: 'pause' }, 'broken-gate')
    ).toBeNull();
  });

  test('advances and validates deterministic elapsed game seconds', () => {
    const initial = createThreefoldCampaignClock();
    expect(initial).toEqual({ elapsedGameSeconds: 0 });
    expect(advanceThreefoldCampaignClock(initial, 15)).toEqual({
      elapsedGameSeconds: 15,
    });
    expect(advanceThreefoldCampaignClock(initial, 0)).toBe(initial);
    expect(advanceThreefoldCampaignClock(initial, '15')).toBe(initial);
    expect(advanceThreefoldCampaignClock(initial, Number.NaN)).toBe(initial);
    expect(() => createThreefoldCampaignClock(-1)).toThrow(RangeError);
    expect(() => createThreefoldCampaignClock('15')).toThrow(RangeError);
    expect(() => createThreefoldCampaignClock(Number.NaN)).toThrow(RangeError);
  });

  test('roundtrips the dedicated campaign clock envelope and rejects invalid data', () => {
    const serialized = serializeThreefoldCampaignClock(
      createThreefoldCampaignClock(90)
    );
    expect(restoreThreefoldCampaignClock(serialized)).toEqual({
      elapsedGameSeconds: 90,
    });
    expect(restoreThreefoldCampaignClock(null)).toBeNull();
    expect(restoreThreefoldCampaignClock('{bad json')).toBeNull();
    expect(
      restoreThreefoldCampaignClock(JSON.stringify({ game: 'other' }))
    ).toBeNull();
    expect(
      restoreThreefoldCampaignClock(
        JSON.stringify({
          game: 'threefold-campaign-clock',
          schemaVersion: 2,
          state: { elapsedGameSeconds: 90 },
        })
      )
    ).toBeNull();
    expect(
      restoreThreefoldCampaignClock(
        JSON.stringify({
          game: 'threefold-campaign-clock',
          schemaVersion: 1,
          state: { elapsedGameSeconds: -1 },
        })
      )
    ).toBeNull();
  });

  test('stores campaign time independently through the injected storage boundary', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };
    const store = createThreefoldCampaignClockSaveStore(storage);
    expect(store.load()).toBeNull();
    expect(store.save(createThreefoldCampaignClock(45))).toBe(true);
    expect(store.load()).toEqual({ elapsedGameSeconds: 45 });
    expect(store.clear()).toBe(true);
    expect(store.load()).toBeNull();
  });
});
