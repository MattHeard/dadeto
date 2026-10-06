import { describe, expect, it } from '@jest/globals';
import {
  createChronoflowGame,
  openSluice,
  setChronoflowRoute,
  startTimedRun,
  toggleChronoflowChannel,
  advanceChronoflow,
} from '../../../../src/core/browser/game/chronoflow/runtime.js';
import {
  createChronoflowSaveStore,
  restoreChronoflowSave,
  serializeChronoflowSave,
} from '../../../../src/core/browser/game/chronoflow/save.js';

describe('Chronoflow versioned saves', () => {
  it('round-trips puzzle progress but restores only as untimed practice', () => {
    let game = createChronoflowGame();
    game = toggleChronoflowChannel(game, 7);
    game = setChronoflowRoute(game, 'archive');
    game = openSluice(game);
    game = advanceChronoflow(game, 1);
    game = startTimedRun(game, {
      status: 'synchronized',
      epochMs: 45000,
      uncertaintyMs: 1000,
    });

    const serialized = serializeChronoflowSave(game);
    const envelope = JSON.parse(serialized);
    const restored = restoreChronoflowSave(serialized);

    expect(envelope).toMatchObject({
      schemaVersion: 1,
      rulesVersion: 1,
      solverVersion: 1,
      level: 'archive-entry',
      route: 'archive',
      gateOpen: true,
      editsUsed: 1,
    });
    expect(serialized).not.toMatch(/epoch|clock|timedCredit|mode/);
    expect(restored).toMatchObject({
      route: 'archive',
      gateOpen: true,
      mode: 'practice',
      timedCredit: false,
      editsUsed: 1,
    });
    expect(restored.fluid).toEqual(game.fluid);
  });

  it('restores a completed practice objective without creating timed credit', () => {
    let game = toggleChronoflowChannel(createChronoflowGame(), 7);
    game = openSluice(setChronoflowRoute(game, 'archive'));
    for (let batch = 0; batch < 30 && !game.completed; batch += 1) {
      game = advanceChronoflow(game, 60);
    }
    expect(game.completed).toBe(true);
    const restored = restoreChronoflowSave(serializeChronoflowSave(game));
    expect(restored).toMatchObject({
      completed: true,
      timedCredit: false,
      mode: 'practice',
    });
  });

  it('rejects malformed, unsupported, and inconsistent save payloads', () => {
    expect(restoreChronoflowSave(null)).toBeNull();
    expect(restoreChronoflowSave('{')).toBeNull();
    expect(restoreChronoflowSave(JSON.stringify(null))).toBeNull();
    const valid = JSON.parse(serializeChronoflowSave(createChronoflowGame()));
    for (const versionKey of [
      'schemaVersion',
      'rulesVersion',
      'solverVersion',
    ]) {
      expect(
        restoreChronoflowSave(JSON.stringify({ ...valid, [versionKey]: 99 }))
      ).toBeNull();
    }
    expect(
      restoreChronoflowSave(JSON.stringify({ ...valid, level: 'unknown' }))
    ).toBeNull();
    expect(
      restoreChronoflowSave(JSON.stringify({ ...valid, route: 'unknown' }))
    ).toBeNull();
    expect(
      restoreChronoflowSave(JSON.stringify({ ...valid, gateOpen: 1 }))
    ).toBeNull();
    expect(
      restoreChronoflowSave(JSON.stringify({ ...valid, editsUsed: 4 }))
    ).toBeNull();
    expect(
      restoreChronoflowSave(
        JSON.stringify({ ...valid, fluid: { ...valid.fluid, volume: [] } })
      )
    ).toBeNull();
    expect(
      restoreChronoflowSave(
        JSON.stringify({
          ...valid,
          fluid: { ...valid.fluid, width: 4 },
        })
      )
    ).toBeNull();
    expect(
      restoreChronoflowSave(
        JSON.stringify({
          ...valid,
          fluid: { ...valid.fluid, tick: -1 },
        })
      )
    ).toBeNull();
    const waterInWall = structuredClone(valid);
    waterInWall.fluid.volume[0] = 0.1;
    expect(restoreChronoflowSave(JSON.stringify(waterInWall))).toBeNull();
    const invalidTerrain = structuredClone(valid);
    invalidTerrain.fluid.solids[0] = false;
    expect(restoreChronoflowSave(JSON.stringify(invalidTerrain))).toBeNull();
    const uncountedEdit = structuredClone(valid);
    uncountedEdit.fluid.solids[7] = false;
    expect(restoreChronoflowSave(JSON.stringify(uncountedEdit))).toBeNull();
    expect(
      restoreChronoflowSave(JSON.stringify({ ...valid, completed: true }))
    ).toBeNull();
  });

  it('loads, saves, and clears through the injected storage adapter', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };
    const store = createChronoflowSaveStore(storage);
    expect(store.load()).toBeNull();
    expect(store.save(createChronoflowGame())).toBe(true);
    expect(store.load()).toMatchObject({ mode: 'practice' });
    expect(store.load().fluid.tick).toBe(0);
    expect(store.clear()).toBe(true);
    expect(store.load()).toBeNull();
  });

  it('keeps storage failures and unavailable storage from blocking practice', () => {
    const unavailable = createChronoflowSaveStore(null);
    expect(unavailable.load()).toBeNull();
    expect(unavailable.save(createChronoflowGame())).toBe(false);
    expect(unavailable.clear()).toBe(false);

    const throwing = createChronoflowSaveStore({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(throwing.load()).toBeNull();
    expect(throwing.save(createChronoflowGame())).toBe(false);
    expect(throwing.clear()).toBe(false);
    expect(
      createChronoflowSaveStore({ getItem: () => null, setItem() {} }).clear()
    ).toBe(false);
  });
});
