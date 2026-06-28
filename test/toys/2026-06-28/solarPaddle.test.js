import { describe, expect, it, jest } from '@jest/globals';
import { solarPaddle } from '../../../src/core/browser/toys/2026-06-28/solarPaddle.js';

function runToy(input, storageValue = { current: null }) {
  const setLocalPermanentData = jest.fn(next => {
    storageValue.current = {
      ...(storageValue.current || {}),
      ...next,
    };
    return storageValue.current;
  });
  const env = new Map([['setLocalPermanentData', setLocalPermanentData]]);
  const payload = JSON.parse(solarPaddle(input, env));
  return { payload, storageValue, setLocalPermanentData };
}

describe('solarPaddle', () => {
  it('renders an initial scene and persists state', () => {
    const { payload, storageValue, setLocalPermanentData } = runToy(
      JSON.stringify({ width: 240, height: 160 })
    );

    expect(payload.width).toBe(240);
    expect(payload.height).toBe(160);
    expect(payload.shapes[0].fill).toBe('#0b1220');
    expect(payload.shapes.some(shape => shape.type === 'circle')).toBe(true);
    expect(storageValue.current.SOLA1.version).toBe(1);
    expect(setLocalPermanentData).toHaveBeenCalledTimes(2);
  });

  it('keeps launch edge-triggered across repeated frames', () => {
    const storageValue = { current: null };
    const first = runToy(JSON.stringify({ type: 'keydown', key: 'Space' }), storageValue);
    const firstState = structuredClone(first.storageValue.current.SOLA1);
    const second = runToy('{}', storageValue);
    const secondState = structuredClone(second.storageValue.current.SOLA1);

    expect(firstState.status).toBe('running');
    expect(firstState.orb.stuckToPaddle).toBe(false);
    expect(secondState.frame).toBe(2);
    expect(secondState.status).toBe('running');
  });

  it('moves the paddle with held keyboard input', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'ArrowRight' }), storageValue);
    const { storageValue: nextStorage } = runToy('{}', storageValue);

    expect(nextStorage.current.SOLA1.paddle.x).toBeGreaterThan(104);
  });

  it('pauses and resumes on repeated pause presses without duplicating the edge', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'Space' }), storageValue);
    const paused = runToy(JSON.stringify({ type: 'keydown', key: 'P' }), storageValue);
    const pausedState = structuredClone(paused.storageValue.current.SOLA1);
    const repeated = runToy('{}', storageValue);
    const repeatedState = structuredClone(repeated.storageValue.current.SOLA1);
    runToy(JSON.stringify({ type: 'keyup', key: 'P' }), storageValue);
    const resumed = runToy(JSON.stringify({ type: 'keydown', key: 'P' }), storageValue);
    const resumedState = structuredClone(resumed.storageValue.current.SOLA1);

    expect(pausedState.status).toBe('paused');
    expect(repeatedState.status).toBe('paused');
    expect(resumedState.status).toBe('running');
  });

  it('charges a panel and increments score on collision', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: { left: false, right: false, launch: false, pause: false, reset: false },
            edgeActions: { left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false },
            previousActions: { left: false, right: false, launch: false, pause: false, reset: false },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 40, y: 36, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    const { storageValue: nextStorage } = runToy('{}', storageValue);

    expect(nextStorage.current.SOLA1.score).toBe(1);
    expect(nextStorage.current.SOLA1.panels[0].charge).toBe(true);
  });

  it('separates the orb from a panel cluster instead of trapping it in place', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: { left: false, right: false, launch: false, pause: false, reset: false },
            edgeActions: { left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false },
            previousActions: { left: false, right: false, launch: false, pause: false, reset: false },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 61, y: 35, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 52, y: 32, width: 24, height: 10, charge: false },
            { id: 'p2', x: 82, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    const { storageValue: nextStorage } = runToy('{}', storageValue);
    const nextState = nextStorage.current.SOLA1;

    expect(nextState.score).toBe(1);
    expect(nextState.panels.filter(panel => panel.charge)).toHaveLength(1);
    expect(nextState.orb.y).not.toBe(35);
    expect(nextState.orb.vy === 0).toBe(false);
  });

  it('bounces the orb off a panel instead of letting it pass through after separation', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: { left: false, right: false, launch: false, pause: false, reset: false },
            edgeActions: { left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false },
            previousActions: { left: false, right: false, launch: false, pause: false, reset: false },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 40, y: 44, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    const { storageValue: nextStorage } = runToy('{}', storageValue);
    const nextState = nextStorage.current.SOLA1;

    expect(nextState.score).toBe(1);
    expect(nextState.orb.vy).toBeLessThan(0);
    expect(nextState.orb.y).toBeLessThan(44);
  });

  it('snaps the paddle to whole pixels while moving', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'ArrowRight' }), storageValue);
    const { storageValue: nextStorage } = runToy('{}', storageValue);

    expect(Number.isInteger(nextStorage.current.SOLA1.paddle.x)).toBe(true);
  });

  it('preserves a left-edge paddle position when state is rehydrated', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: { left: false, right: false, launch: false, pause: false, reset: false },
            edgeActions: { left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false },
            previousActions: { left: false, right: false, launch: false, pause: false, reset: false },
          },
          paddle: { x: 0, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 80, y: 70, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
          panels: [],
        },
      },
    };

    const { storageValue: nextStorage } = runToy('{}', storageValue);

    expect(nextStorage.current.SOLA1.paddle.x).toBe(0);
  });

  it('loses a life when the orb exits below the canvas', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 2,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: { left: false, right: false, launch: false, pause: false, reset: false },
            edgeActions: { left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false },
            previousActions: { left: false, right: false, launch: false, pause: false, reset: false },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 80, y: 150, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [],
        },
      },
    };

    const { storageValue: nextStorage } = runToy('{}', storageValue);

    expect(nextStorage.current.SOLA1.lives).toBe(1);
    expect(nextStorage.current.SOLA1.status).toBe('ready');
    expect(nextStorage.current.SOLA1.orb.stuckToPaddle).toBe(true);
  });

  it('can relaunch after a missed orb and life loss', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 2,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: { left: false, right: false, launch: false, pause: false, reset: false },
            edgeActions: { left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false },
            previousActions: { left: false, right: false, launch: false, pause: false, reset: false },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 80, y: 150, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [],
        },
      },
    };

    runToy('{}', storageValue);
    runToy(JSON.stringify({ type: 'keyup', key: 'Space' }), storageValue);
    const relaunched = runToy(JSON.stringify({ type: 'keydown', key: 'Space' }), storageValue);

    expect(relaunched.storageValue.current.SOLA1.status).toBe('running');
    expect(relaunched.storageValue.current.SOLA1.orb.stuckToPaddle).toBe(false);
  });

  it('resets cleanly from a paused state and can launch again', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'Space' }), storageValue);
    runToy(JSON.stringify({ type: 'keydown', key: 'P' }), storageValue);
    const reset = runToy(JSON.stringify({ type: 'keydown', key: 'R' }), storageValue);
    const resetState = structuredClone(reset.storageValue.current.SOLA1);
    runToy(JSON.stringify({ type: 'keyup', key: 'R' }), storageValue);
    const relaunched = runToy(JSON.stringify({ type: 'keydown', key: 'Space' }), storageValue);

    expect(resetState.status).toBe('ready');
    expect(resetState.orb.stuckToPaddle).toBe(true);
    expect(relaunched.storageValue.current.SOLA1.status).toBe('running');
    expect(relaunched.storageValue.current.SOLA1.orb.stuckToPaddle).toBe(false);
  });
});
