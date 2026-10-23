import {
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { getThreefoldGateOutcome } from '../../../../src/core/browser/game/threefold/outcome.js';
import { attemptThreefoldGateRepair } from '../../../../src/core/browser/game/threefold/episode.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';
import { createThreefoldSluiceScene } from '../../../../src/core/browser/game/threefold/sluice-scene.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

describe('THREEFOLD gate outcome', () => {
  test('does not repair during a crisis stage outside the tide window', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const unsupportedStage = {
      ...initial,
      crisis: { ...initial.crisis, stage: 'stabilizing' },
    };

    expect(attemptThreefoldGateRepair(unsupportedStage)).toBe(initial.episode);
  });

  test('does not apply Broken Gate repair to another authored scene', () => {
    const state = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldSluiceScene()
    );

    expect(attemptThreefoldGateRepair(state)).toBe(state.episode);
  });

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

    expect(repaired.episode).toMatchObject({
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
    expect(aftermath.episode).toMatchObject({
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'lost',
      gateRepaired: true,
    });
    expect(
      aftermath.episode.witnessLedger.slice(
        0,
        repaired.episode.witnessLedger.length
      )
    ).toEqual(repaired.episode.witnessLedger);
    expect(aftermath.episode.witnessLedger.at(-1).type).toBe('observation');
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

  test('repairs before surge and holds the lower channel through water rise', () => {
    let state = moveToLockingPawl(forceReliefGateOpen());
    expect(state.crisis.stage).toBe('urgent');
    const repaired = stepThreefoldSimulation(state, { type: 'interact' });

    expect(repaired.episode).toMatchObject({
      ferry: 'afloat',
      gateRepaired: true,
      gateRepairedBeforeSurge: true,
    });
    expect(repaired.player.destroyedGeometryIds).toEqual([
      'gatehouse-west-wall',
    ]);
    expect(getThreefoldGateOutcome(repaired)).toEqual({
      gateState: 'repaired',
      drainageState: 'dry',
    });
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(repaired))
    ).toEqual(repaired);

    state = stepThreefoldSimulation(repaired, {
      type: 'wait',
      elapsedGameMinutes:
        THRESHOLDS.surgeAtMinutes - repaired.crisis.elapsedMinutes,
    });
    expect(state.episode).toMatchObject({
      ferry: 'lost',
      passengers: 'lost',
      latchfolk: 'lost',
      gateRepaired: true,
      gateRepairedBeforeSurge: true,
    });
    expect(getThreefoldGateOutcome(state)).toEqual({
      gateState: 'repaired',
      drainageState: 'dry',
    });
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(state))
    ).toEqual(state);
  });

  test('uses the locking pawl interaction scale authored in scene data', () => {
    const scene = createBrokenGateScene();
    const pawl = scene.interactables.find(
      item => item.id === 'relief-gate-locking-pawl'
    );
    pawl.interactionScale = -1;
    const forcedOpen = forceReliefGateOpen(scene);
    const atAuthoredPawl = {
      ...forcedOpen,
      player: createScaleState(pawl.position, {
        scale: -1,
        destroyedGeometryIds: forcedOpen.player.destroyedGeometryIds,
        maximumUnlockedScale: 1,
      }),
    };

    expect(
      stepThreefoldSimulation(atAuthoredPawl, { type: 'interact' }).episode
        .gateRepaired
    ).toBe(true);
  });

  test('does not repair with inconsistent ferry state, wrong scale, or out of range', () => {
    const forcedOpen = forceReliefGateOpen();
    const atPawlBeforeSurge = moveToLockingPawl(forcedOpen);
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

    const wrongScale = {
      ...atPawlBeforeSurge,
      player: { ...atPawlBeforeSurge.player, scale: -1 },
    };
    expect(
      stepThreefoldSimulation(wrongScale, { type: 'interact' }).episode
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

  test('rejects a save that marks an unrepaired gate as repaired before surge', () => {
    const valid = JSON.parse(
      serializeThreefoldSimulation(createThreefoldSimulation(THRESHOLDS))
    );
    valid.state.episode.gateRepairedBeforeSurge = true;

    expect(restoreThreefoldSimulation(JSON.stringify(valid))).toBeNull();
  });
});

/**
 * Follow the reachable route that breaks the west wall, then forces the relief gate.
 * @param {ReturnType<typeof createBrokenGateScene>} [scene] Authored scene to simulate.
 * @returns {ReturnType<typeof createThreefoldSimulation>} State after the final growth action.
 */
function forceReliefGateOpen(scene = createBrokenGateScene()) {
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
    createThreefoldSimulation(THRESHOLDS, scene)
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
