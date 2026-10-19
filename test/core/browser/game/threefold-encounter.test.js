import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import {
  createThreefoldEncounter,
  isGatehouseRatInReach,
  normalizeThreefoldEncounter,
  resolveGatehouseRat,
} from '../../../../src/core/browser/game/threefold/encounter.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

describe('THREEFOLD Broken Gate rat encounter', () => {
  test('creates an independent authored rat at physical scale -2', () => {
    const first = createBrokenGateScene();
    const second = createBrokenGateScene();

    expect(first.creatures).toEqual(second.creatures);
    expect(first.creatures).not.toBe(second.creatures);
    expect(first.creatures[0]).toMatchObject({
      id: 'gatehouse-rat',
      position: { x: 3.28, y: 4 },
      bounds: {
        min: { x: 3.18, y: 3.9, z: 0 },
        max: { x: 3.38, y: 4.1, z: 0.2032 },
      },
    });
    first.creatures[0].position.x = -100;
    expect(second.creatures[0].position.x).toBe(3.28);
  });

  test('offers fight and bypass at scale -2 near the rat', () => {
    const close = moveToRatScaleAndReach();

    expect(close.player.scale).toBe(-2);
    expect(isGatehouseRatInReach(close)).toBe(true);

    const fought = stepThreefoldSimulation(close, { type: 'fight' });
    expect(fought.encounter.ratFate).toBe('repelled');
    expect(fought.crisis.elapsedMinutes).toBeCloseTo(2.5);
    expect(fought.player.recoveryProgressMinutes).toBeCloseTo(2.25);

    const passed = stepThreefoldSimulation(close, { type: 'bypass' });
    expect(passed.encounter.ratFate).toBe('bypassed');
    expect(passed.player.position).toEqual(close.player.position);
    expect(passed.crisis.elapsedMinutes).toBeCloseTo(2.5);
  });

  test('a one-rung size advantage changes the fight into a lethal outcome', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(
      { x: 3.15, y: 4 },
      {
        scale: -1,
        anchor: 6,
        minimumUnlockedScale: -2,
        maximumUnlockedScale: 1,
      }
    );
    const state = createThreefoldSimulation(THRESHOLDS, scene);

    expect(isGatehouseRatInReach(state)).toBe(true);
    expect(
      stepThreefoldSimulation(state, { type: 'fight' }).encounter.ratFate
    ).toBe('killed');
  });

  test('an unreachable fight costs one failed action without changing rat fate', () => {
    const state = createThreefoldSimulation(THRESHOLDS);
    const attempted = stepThreefoldSimulation(state, { type: 'fight' });

    expect(isGatehouseRatInReach(state)).toBe(false);
    expect(attempted.encounter.ratFate).toBe('present');
    expect(attempted.crisis.elapsedMinutes).toBe(0.25);
  });

  test('requires an authored living rat, a player, and close physical position', () => {
    const simulation = createThreefoldSimulation(THRESHOLDS);
    expect(isGatehouseRatInReach(null)).toBe(false);
    expect(
      isGatehouseRatInReach({
        ...simulation,
        scene: { ...simulation.scene, creatures: [] },
      })
    ).toBe(false);
    expect(isGatehouseRatInReach({ ...simulation, player: null })).toBe(false);

    const scene = createBrokenGateScene();
    scene.spawn = createScaleState({ x: 3, y: 4 }, { scale: -2 });
    const tooFar = createThreefoldSimulation(THRESHOLDS, scene);
    expect(isGatehouseRatInReach(tooFar)).toBe(false);
    expect(
      isGatehouseRatInReach({
        ...moveToRatScaleAndReach(),
        encounter: { ratFate: 'bypassed' },
      })
    ).toBe(false);
  });

  test('validates and preserves terminal fates', () => {
    const initial = createThreefoldEncounter();
    expect(normalizeThreefoldEncounter(undefined)).toEqual(initial);
    expect(normalizeThreefoldEncounter({ ratFate: 'killed' })).toEqual({
      ratFate: 'killed',
    });
    expect(resolveGatehouseRat({ ratFate: 'killed' }, 'fight', -1)).toEqual({
      ratFate: 'killed',
    });
    expect(resolveGatehouseRat(initial, 'unknown', -2)).toBe(initial);
    expect(() => normalizeThreefoldEncounter(null)).toThrow(
      'THREEFOLD encounter state is inconsistent.'
    );
    expect(() => normalizeThreefoldEncounter({ ratFate: 'unknown' })).toThrow(
      'THREEFOLD encounter state is inconsistent.'
    );
  });
});

/**
 * Shrink to the rat's size, then take deterministic steps into reach.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Reachable encounter.
 */
function moveToRatScaleAndReach() {
  let state = createThreefoldSimulation(THRESHOLDS);
  state = stepThreefoldSimulation(state, { type: 'shrink' });
  state = stepThreefoldSimulation(state, { type: 'shrink' });
  for (let step = 0; step < 7; step += 1)
    state = stepThreefoldSimulation(state, {
      type: 'move',
      direction: 'right',
    });
  return state;
}
