import {
  createScaleState,
  heightAtScale,
} from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';

const RESCUE_THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/**
 * Applies the same world action a fixed number of times.
 * @param {object} state - The simulation state before the repeated actions.
 * @param {object} action - The world action to apply on each step.
 * @param {number} count - The number of simulation steps to apply.
 * @returns {object} The state after all repeated actions.
 */
function repeatAction(state, action, count) {
  for (let index = 0; index < count; index += 1)
    state = stepThreefoldSimulation(state, action);
  return state;
}

describe('THREEFOLD post-storm closure simulation', () => {
  test('files an aftermath report through the intact signal station and closes the episode', () => {
    const initial = createThreefoldSimulation(RESCUE_THRESHOLDS);
    const console = initial.scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    const atConsole = {
      ...initial,
      player: createScaleState(console.position, { scale: -2 }),
    };
    const aftermath = stepThreefoldSimulation(atConsole, {
      type: 'wait',
      elapsedGameMinutes: RESCUE_THRESHOLDS.aftermathAtMinutes,
    });

    const reported = stepThreefoldSimulation(aftermath, {
      type: 'interact',
    });

    expect(reported.episode).toMatchObject({
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'lost',
      closedBy: 'reported',
    });
    expect(reported.crisis.stage).toBe('aftermath');
    expect(
      stepThreefoldSimulation(reported, {
        type: 'move',
        direction: 'right',
      })
    ).toBe(reported);
  });

  test('cannot report before aftermath or from outside the station range', () => {
    const initial = createThreefoldSimulation(RESCUE_THRESHOLDS);
    const console = initial.scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    const atConsole = {
      ...initial,
      player: createScaleState(console.position),
    };
    const early = stepThreefoldSimulation(atConsole, { type: 'interact' });
    expect(early.episode.closedBy).toBeUndefined();

    const aftermath = stepThreefoldSimulation(initial, {
      type: 'wait',
      elapsedGameMinutes: RESCUE_THRESHOLDS.aftermathAtMinutes,
    });
    const outOfRange = stepThreefoldSimulation(aftermath, {
      type: 'interact',
    });
    expect(outOfRange.episode.closedBy).toBeUndefined();
    expect(outOfRange.crisis.stage).toBe('aftermath');
  });

  test('the console cannot file a report while proxied at a coarse scale', () => {
    const initial = createThreefoldSimulation(RESCUE_THRESHOLDS);
    const console = initial.scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    const coarse = {
      ...initial,
      player: createScaleState(console.position, { scale: -1 }),
    };
    const aftermath = stepThreefoldSimulation(coarse, {
      type: 'wait',
      elapsedGameMinutes: RESCUE_THRESHOLDS.aftermathAtMinutes,
    });
    const coarseAttempt = stepThreefoldSimulation(aftermath, {
      type: 'interact',
    });
    expect(coarseAttempt.episode.closedBy).toBeUndefined();

    const fine = {
      ...aftermath,
      player: createScaleState(console.position, { scale: -2 }),
    };
    expect(
      stepThreefoldSimulation(fine, { type: 'interact' }).episode.closedBy
    ).toBe('reported');
  });

  test('station destruction blocks reporting but leaves a reachable departure closure', () => {
    const thresholds = {
      urgentAtMinutes: 8,
      surgeAtMinutes: 20,
      aftermathAtMinutes: 30,
    };
    let state = createThreefoldSimulation(thresholds);
    state = repeatAction(state, { type: 'move', direction: 'up' }, 9);
    state = repeatAction(state, { type: 'move', direction: 'right' }, 26);
    state = repeatAction(state, { type: 'move', direction: 'down' }, 1);
    state = stepThreefoldSimulation(state, { type: 'grow' });
    expect(state.player.destroyedGeometryIds).toContain('signal-station');

    state = stepThreefoldSimulation(state, {
      type: 'wait',
      elapsedGameMinutes: 40,
    });
    const reportAttempt = stepThreefoldSimulation(state, {
      type: 'interact',
    });
    expect(reportAttempt.episode.closedBy).toBeUndefined();
    expect(reportAttempt.episode.passengers).toBe('lost');

    state = stepThreefoldSimulation(reportAttempt, { type: 'shrink' });
    state = repeatAction(state, { type: 'move', direction: 'up' }, 5);
    state = repeatAction(state, { type: 'move', direction: 'left' }, 38);
    const road = state.scene.interactables.find(
      item => item.id === 'upland-road-exit'
    );
    expect(
      Math.hypot(
        state.player.position.x - road.position.x,
        state.player.position.y - road.position.y
      )
    ).toBeLessThanOrEqual(heightAtScale(state.player.scale) * 0.55);

    const departed = stepThreefoldSimulation(state, { type: 'interact' });
    expect(departed.episode).toMatchObject({
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'lost',
      withdrawn: true,
      closedBy: 'departed',
    });
    expect(departed.player.destroyedGeometryIds).toContain('signal-station');
  });
});
