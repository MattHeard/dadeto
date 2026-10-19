import {
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { getThreefoldGateOutcome } from '../../../../src/core/browser/game/threefold/outcome.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

describe('THREEFOLD gate outcome', () => {
  test('keeps the lower channel dry when the gate holds through the surge', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const atSurge = stepThreefoldSimulation(initial, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });

    expect(getThreefoldGateOutcome(atSurge)).toEqual({
      gateState: 'held',
      drainageState: 'dry',
    });
  });

  test('forces the gate through growth, warns before surge, and floods at surge', () => {
    const forcedOpen = forceReliefGateOpen();

    expect(forcedOpen.player.destroyedGeometryIds).toEqual(
      expect.arrayContaining(['gatehouse-west-wall', 'relief-gate'])
    );
    expect(getThreefoldGateOutcome(forcedOpen)).toEqual({
      gateState: 'forced-open',
      drainageState: 'at-risk',
    });

    const flooded = stepThreefoldSimulation(forcedOpen, {
      type: 'wait',
      elapsedGameMinutes: 9 - forcedOpen.crisis.elapsedMinutes,
    });
    expect(getThreefoldGateOutcome(flooded)).toEqual({
      gateState: 'forced-open',
      drainageState: 'flooded',
    });

    const aftermath = stepThreefoldSimulation(flooded, {
      type: 'wait',
      elapsedGameMinutes: 15 - flooded.crisis.elapsedMinutes,
    });
    expect(getThreefoldGateOutcome(aftermath)).toEqual({
      gateState: 'forced-open',
      drainageState: 'flooded',
    });
  });

  test('treats a damaged counterweight as a forced-open gate', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const damagedCounterweight = {
      ...initial,
      player: {
        ...initial.player,
        destroyedGeometryIds: ['gate-counterweight'],
      },
    };

    expect(getThreefoldGateOutcome(damagedCounterweight)).toEqual({
      gateState: 'forced-open',
      drainageState: 'at-risk',
    });
  });

  test('reconstructs the flood consequence from the complete-run save', () => {
    const forcedOpen = forceReliefGateOpen();
    const flooded = stepThreefoldSimulation(forcedOpen, {
      type: 'wait',
      elapsedGameMinutes: 9 - forcedOpen.crisis.elapsedMinutes,
    });
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(flooded)
    );

    expect(restored).not.toBeNull();
    expect(getThreefoldGateOutcome(restored)).toEqual({
      gateState: 'forced-open',
      drainageState: 'flooded',
    });
  });

  test('repairs the forced-open gate after the ferry is lost and preserves casualties', () => {
    let state = forceReliefGateOpen();
    state = stepThreefoldSimulation(state, {
      type: 'wait',
      elapsedGameMinutes: 9 - state.crisis.elapsedMinutes,
    });
    state = moveToLockingPawl(state);
    const repaired = stepThreefoldSimulation(state, { type: 'interact' });

    expect(repaired.episode).toEqual({
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'lost',
      gateRepaired: true,
    });
    expect(repaired.player.destroyedGeometryIds).toEqual([
      'gatehouse-west-wall',
    ]);
    expect(getThreefoldGateOutcome(repaired)).toEqual({
      gateState: 'repaired',
      drainageState: 'flooded',
    });

    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(repaired)
    );
    expect(restored).toEqual(repaired);

    const aftermath = stepThreefoldSimulation(repaired, {
      type: 'wait',
      elapsedGameMinutes:
        THRESHOLDS.aftermathAtMinutes - repaired.crisis.elapsedMinutes,
    });
    expect(aftermath.episode).toEqual(repaired.episode);
    expect(getThreefoldGateOutcome(aftermath)).toEqual({
      gateState: 'repaired',
      drainageState: 'receded',
    });
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(aftermath))
    ).toEqual(aftermath);
    const repeatedAttempt = stepThreefoldSimulation(aftermath, {
      type: 'interact',
    });
    expect(repeatedAttempt.episode).toBe(aftermath.episode);
  });

  test('does not repair before surge, out of range, or when the gate is intact', () => {
    const forcedOpen = forceReliefGateOpen();
    const atPawlBeforeSurge = moveToLockingPawl(forcedOpen);
    const earlyAttempt = stepThreefoldSimulation(atPawlBeforeSurge, {
      type: 'interact',
    });
    expect(earlyAttempt.episode.gateRepaired).toBeUndefined();

    const inconsistentPreSurgeLoss = {
      ...atPawlBeforeSurge,
      episode: { ...atPawlBeforeSurge.episode, ferry: 'lost' },
    };
    expect(
      stepThreefoldSimulation(inconsistentPreSurgeLoss, { type: 'interact' })
        .episode.gateRepaired
    ).toBeUndefined();

    const atSurge = stepThreefoldSimulation(forcedOpen, {
      type: 'wait',
      elapsedGameMinutes: 9 - forcedOpen.crisis.elapsedMinutes,
    });
    expect(
      stepThreefoldSimulation(atSurge, { type: 'interact' }).episode
        .gateRepaired
    ).toBeUndefined();
    const outOfRange = {
      ...atSurge,
      player: createScaleState(
        { x: 3, y: 4 },
        {
          scale: -2,
          destroyedGeometryIds: atSurge.player.destroyedGeometryIds,
          maximumUnlockedScale: 1,
        }
      ),
    };
    expect(
      stepThreefoldSimulation(outOfRange, { type: 'interact' }).episode
        .gateRepaired
    ).toBeUndefined();

    const missingPawl = {
      ...outOfRange,
      scene: {
        ...outOfRange.scene,
        interactables: outOfRange.scene.interactables.filter(
          item => item.id !== 'relief-gate-locking-pawl'
        ),
      },
    };
    expect(
      stepThreefoldSimulation(missingPawl, { type: 'interact' }).episode
        .gateRepaired
    ).toBeUndefined();

    const ferryStillAfloat = {
      ...atSurge,
      episode: { ...atSurge.episode, ferry: 'afloat' },
    };
    expect(
      stepThreefoldSimulation(ferryStillAfloat, { type: 'interact' }).episode
        .gateRepaired
    ).toBeUndefined();

    const scene = createBrokenGateScene();
    const pawl = scene.interactables.find(
      item => item.id === 'relief-gate-locking-pawl'
    );
    scene.spawn = createScaleState(pawl.position, {
      scale: -2,
      maximumUnlockedScale: 1,
    });
    const intactGateAtSurge = stepThreefoldSimulation(
      stepThreefoldSimulation(createThreefoldSimulation(THRESHOLDS, scene), {
        type: 'wait',
        elapsedGameMinutes: 9,
      }),
      { type: 'interact' }
    );
    expect(intactGateAtSurge.episode.gateRepaired).toBeUndefined();
  });

  test('can make the late repair after the crisis reaches aftermath', () => {
    let state = forceReliefGateOpen();
    state = stepThreefoldSimulation(state, {
      type: 'wait',
      elapsedGameMinutes:
        THRESHOLDS.aftermathAtMinutes - state.crisis.elapsedMinutes,
    });
    state = moveToLockingPawl(state);
    const repaired = stepThreefoldSimulation(state, { type: 'interact' });

    expect(repaired.episode.gateRepaired).toBe(true);
    expect(getThreefoldGateOutcome(repaired)).toEqual({
      gateState: 'repaired',
      drainageState: 'receded',
    });
  });
});

/**
 * Follow the reachable route that breaks the west wall, then forces the relief gate.
 * @returns {ReturnType<typeof createThreefoldSimulation>} State after the final growth action.
 */
function forceReliefGateOpen() {
  const actions = [
    { type: 'grow' },
    { type: 'move', direction: 'up' },
    { type: 'shrink' },
    ...Array.from({ length: 3 }, () => ({ type: 'move', direction: 'up' })),
    ...Array.from({ length: 8 }, () => ({ type: 'move', direction: 'right' })),
    { type: 'grow' },
  ];
  return actions.reduce(
    (state, action) => stepThreefoldSimulation(state, action),
    createThreefoldSimulation(THRESHOLDS)
  );
}

/**
 * Shrink and reach the locking pawl beside the relief gate.
 * @param {ReturnType<typeof createThreefoldSimulation>} state State beside the gate.
 * @returns {ReturnType<typeof createThreefoldSimulation>} State within pawl interaction range.
 */
function moveToLockingPawl(state) {
  const actions = [
    ...Array.from({ length: 3 }, () => ({ type: 'shrink' })),
    ...Array.from({ length: 7 }, () => ({ type: 'move', direction: 'down' })),
  ];
  return actions.reduce(
    (current, action) => stepThreefoldSimulation(current, action),
    state
  );
}
