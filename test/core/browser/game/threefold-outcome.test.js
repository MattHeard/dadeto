import {
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { getThreefoldGateOutcome } from '../../../../src/core/browser/game/threefold/outcome.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';

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
