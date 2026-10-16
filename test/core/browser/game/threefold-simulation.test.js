import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import {
  createScaleState,
  heightAtScale,
} from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';

const THRESHOLDS = {
  urgentAtMinutes: 0.25,
  surgeAtMinutes: 0.5,
  aftermathAtMinutes: 0.75,
};

describe('THREEFOLD gatehouse simulation', () => {
  test('moves in canonical space and a blocked step still advances the crisis', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const moved = stepThreefoldSimulation(initial, {
      type: 'move',
      direction: 'right',
    });
    const blocked = stepThreefoldSimulation(moved, {
      type: 'move',
      direction: 'right',
    });

    expect(moved.player.position.x).toBeGreaterThan(initial.player.position.x);
    expect(blocked.player).toBe(moved.player);
    expect(blocked.crisis).toMatchObject({
      elapsedMinutes: 0.5,
      stage: 'surge',
    });
    expect(initial.crisis.elapsedMinutes).toBe(0);
  });

  test('grows through the gatehouse wall, shrinks at the same physical position', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const grown = stepThreefoldSimulation(initial, { type: 'grow' });
    const shrunk = stepThreefoldSimulation(grown, { type: 'shrink' });

    expect(grown.player.scale).toBe(1);
    expect(grown.player.anchor).toBe(7);
    expect(grown.player.destroyedGeometryIds).toContain('gatehouse-west-wall');
    expect(grown.crisis.elapsedMinutes).toBe(0.25);
    expect(shrunk.player.scale).toBe(0);
    expect(shrunk.player.position).toEqual(grown.player.position);
    expect(shrunk.player.anchor).toBe(6);
    expect(shrunk.crisis.elapsedMinutes).toBe(0.5);
  });

  test('movement after growth traverses the destroyed wall at the larger scale', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const grown = stepThreefoldSimulation(initial, { type: 'grow' });
    const moved = stepThreefoldSimulation(grown, {
      type: 'move',
      direction: 'right',
    });

    expect(moved.player.position.x - grown.player.position.x).toBeCloseTo(
      (heightAtScale(0) / 9) * 3
    );
    expect(moved.player.destroyedGeometryIds).toEqual(
      grown.player.destroyedGeometryIds
    );
  });

  test('an invalid direction and unavailable scale still cost world-action time', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(scene.spawn.position, {
      scale: 1,
      anchor: 0,
      maximumAnchor: 8,
      minimumUnlockedScale: -2,
      maximumUnlockedScale: 1,
    });
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const missingDirection = stepThreefoldSimulation(initial, {
      type: 'move',
    });
    const invalidMove = stepThreefoldSimulation(initial, {
      type: 'move',
      direction: 'teleport',
    });
    const unavailableGrowth = stepThreefoldSimulation(invalidMove, {
      type: 'grow',
    });

    expect(missingDirection.player).toMatchObject({
      position: initial.player.position,
      scale: 1,
      anchor: 0,
      recoveryProgressMinutes: 0.25,
    });
    expect(missingDirection.crisis.elapsedMinutes).toBe(0.25);
    expect(invalidMove.player).toMatchObject({
      position: initial.player.position,
      scale: 1,
      anchor: 0,
      recoveryProgressMinutes: 0.25,
    });
    expect(unavailableGrowth.player).toMatchObject({
      position: initial.player.position,
      scale: 1,
      anchor: 0,
      recoveryProgressMinutes: 0.5,
    });
    expect(unavailableGrowth.crisis.elapsedMinutes).toBe(0.5);
  });

  test('wait advances explicit game time and clamps at the aftermath stage', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(scene.spawn.position, {
      anchor: 0,
      maximumAnchor: 8,
      minimumUnlockedScale: -2,
      maximumUnlockedScale: 1,
      recoveryProgressMinutes: 14.5,
    });
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const surge = stepThreefoldSimulation(initial, {
      type: 'wait',
      elapsedGameMinutes: 0.5,
    });
    const aftermath = stepThreefoldSimulation(surge, {
      type: 'wait',
      elapsedGameMinutes: 20,
    });

    expect(surge.crisis).toMatchObject({ elapsedMinutes: 0.5, stage: 'surge' });
    expect(aftermath.crisis).toMatchObject({
      elapsedMinutes: 0.75,
      stage: 'aftermath',
    });
    expect(aftermath.player).toMatchObject({
      anchor: 2,
      recoveryProgressMinutes: 5,
    });

    const recoveredAftermath = stepThreefoldSimulation(aftermath, {
      type: 'wait',
      elapsedGameMinutes: 10,
    });
    expect(recoveredAftermath.crisis).toBe(aftermath.crisis);
    expect(recoveredAftermath.player).toMatchObject({
      anchor: 3,
      recoveryProgressMinutes: 0,
    });
  });

  test('world actions accumulate partial Anchor recovery progress', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(scene.spawn.position, {
      anchor: 0,
      maximumAnchor: 8,
      minimumUnlockedScale: -2,
      maximumUnlockedScale: 1,
      recoveryProgressMinutes: 14.75,
    });
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const moved = stepThreefoldSimulation(initial, {
      type: 'move',
      direction: 'left',
    });

    expect(moved.player).toMatchObject({
      anchor: 1,
      recoveryProgressMinutes: 0,
    });
  });

  test('a completed aftermath wait is inert when Anchor is full', () => {
    const aftermath = stepThreefoldSimulation(
      createThreefoldSimulation(THRESHOLDS),
      { type: 'wait', elapsedGameMinutes: 1 }
    );
    const unchanged = stepThreefoldSimulation(aftermath, {
      type: 'wait',
      elapsedGameMinutes: 1,
    });

    expect(aftermath.crisis.stage).toBe('aftermath');
    expect(aftermath.player.anchor).toBe(aftermath.player.maximumAnchor);
    expect(unchanged).toBe(aftermath);
  });

  test.each([
    { type: 'wait', elapsedGameMinutes: 0 },
    { type: 'wait', elapsedGameMinutes: -1 },
    { type: 'wait', elapsedGameMinutes: Number.NaN },
    { type: 'wait', elapsedGameMinutes: Number.POSITIVE_INFINITY },
    { type: 'wait' },
  ])('ignores invalid wait duration %p', action => {
    const state = createThreefoldSimulation(THRESHOLDS);
    expect(stepThreefoldSimulation(state, action)).toBe(state);
  });

  test.each(['menu', 'pause', 'unknown'])(
    'ignores non-world command %s',
    type => {
      const state = createThreefoldSimulation(THRESHOLDS);
      expect(stepThreefoldSimulation(state, { type })).toBe(state);
    }
  );

  test.each([null, undefined, 'move'])(
    'ignores malformed command %p',
    action => {
      const state = createThreefoldSimulation(THRESHOLDS);
      expect(stepThreefoldSimulation(state, action)).toBe(state);
    }
  );
});
