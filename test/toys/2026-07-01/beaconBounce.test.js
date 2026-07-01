/* eslint-disable jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns */
import { describe, expect, it, jest } from '@jest/globals';
import {
  beaconBounce,
  applyGameplayInput,
  buildNextState,
  createActionFlags,
  resolveBeacons,
  resolvePaddle,
  resolveWalls,
  normalizeGamepad,
  normalizeKeyboard,
  buildResetFallback,
  stepSimulation,
  toCanvasPayload,
  updateInputState,
} from '../../../src/core/browser/toys/2026-07-01/beaconBounce.js';

/**
 *
 * @param input
 * @param storageValue
 */
function runToy(input, storageValue = { current: null }) {
  const setLocalPermanentData = jest.fn(next => {
    storageValue.current = { ...(storageValue.current || {}), ...next };
    return storageValue.current;
  });
  const env = new Map([['setLocalPermanentData', setLocalPermanentData]]);
  const payload = JSON.parse(beaconBounce(input, env));
  return { payload, storageValue, setLocalPermanentData };
}

describe('beaconBounce', () => {
  it('renders an initial scene and persists state under BEAC1', () => {
    const { payload, storageValue } = runToy(
      JSON.stringify({ width: 240, height: 160 })
    );
    expect(payload.width).toBe(240);
    expect(payload.height).toBe(160);
    expect(payload.shapes.some(shape => shape.type === 'circle')).toBe(true);
    expect(storageValue.current.BEAC1.version).toBe(1);
  });

  it('launches on space and keeps launch edge-triggered', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: ' ' }), storageValue);
    const second = runToy('{}', storageValue);
    expect(second.storageValue.current.BEAC1.status).toBe('running');
    expect(second.storageValue.current.BEAC1.orb.stuckToPaddle).toBe(false);
  });

  it('moves the paddle with held input', () => {
    const storageValue = { current: null };
    runToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowRight' }),
      storageValue
    );
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.BEAC1.paddle.x).toBeGreaterThan(100);
  });

  it('activates beacons and creates links on collision', () => {
    const state = buildNextState(
      {
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
          actions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
          previousActions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
        },
        paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
        orb: { x: 72, y: 44, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
        beacons: [
          {
            id: 'beacon-1',
            x: 72,
            y: 44,
            radius: 8,
            active: false,
            required: true,
            hitCount: 0,
          },
          {
            id: 'beacon-2',
            x: 110,
            y: 52,
            radius: 8,
            active: false,
            required: true,
            hitCount: 0,
          },
        ],
        links: [],
        lastActivatedBeaconId: null,
      },
      {}
    );

    expect(state.beacons[0].active).toBe(true);
    expect(state.links).toHaveLength(0);
  });

  it('pauses, resumes, and resets from edge-triggered input', () => {
    const paused = buildNextState(
      {
        version: 1,
        width: 180,
        height: 140,
        frame: 2,
        status: 'running',
        score: 12,
        lives: 3,
        input: {
          keyboard: {},
          gamepad: { buttons: [], axes: [] },
          actions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
          previousActions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
        },
        paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
        orb: { x: 90, y: 80, vx: 1, vy: 2, radius: 4, stuckToPaddle: false },
        beacons: [],
        links: [],
        lastActivatedBeaconId: null,
      },
      { type: 'keydown', key: 'p' }
    );
    expect(paused.status).toBe('paused');

    const released = buildNextState(paused, { type: 'keyup', key: 'p' });
    const resumed = buildNextState(released, { type: 'keydown', key: 'p' });
    expect(resumed.status).not.toBe('paused');

    const reset = buildNextState(resumed, { type: 'keydown', key: 'r' });
    expect(reset.status).toBe('ready');
    expect(reset.score).toBe(0);
  });

  it('handles walls, paddle bounces, bottom loss, and win state', () => {
    const wallState = buildNextState(
      {
        version: 1,
        width: 180,
        height: 140,
        frame: 2,
        status: 'running',
        score: 0,
        lives: 3,
        input: {
          keyboard: {},
          gamepad: { buttons: [], axes: [] },
          actions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
          previousActions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
        },
        paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
        orb: { x: 4, y: 20, vx: -2, vy: -2, radius: 4, stuckToPaddle: false },
        beacons: [
          {
            id: 'beacon-1',
            x: 20,
            y: 20,
            radius: 8,
            active: true,
            required: true,
            hitCount: 1,
          },
        ],
        links: [],
        lastActivatedBeaconId: 'beacon-1',
      },
      {}
    );
    expect(wallState.orb.vx).toBeGreaterThan(0);

    const paddleState = buildNextState(
      {
        version: 1,
        width: 180,
        height: 140,
        frame: 2,
        status: 'running',
        score: 0,
        lives: 3,
        input: {
          keyboard: {},
          gamepad: { buttons: [], axes: [] },
          actions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
          previousActions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
        },
        paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
        orb: { x: 84, y: 110, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
        beacons: [
          {
            id: 'beacon-1',
            x: 16,
            y: 16,
            radius: 8,
            active: false,
            required: true,
            hitCount: 0,
          },
        ],
        links: [],
        lastActivatedBeaconId: null,
      },
      {}
    );
    expect(paddleState.orb.vy).toBeLessThan(0);

    const lostState = buildNextState(
      {
        version: 1,
        width: 180,
        height: 140,
        frame: 2,
        status: 'running',
        score: 0,
        lives: 1,
        input: {
          keyboard: {},
          gamepad: { buttons: [], axes: [] },
          actions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
          previousActions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
        },
        paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
        orb: { x: 84, y: 170, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
        beacons: [],
        links: [],
        lastActivatedBeaconId: null,
      },
      {}
    );
    expect(lostState.lives).toBe(0);
    expect(lostState.orb.stuckToPaddle).toBe(true);

    const explicitLost = {
      status: 'running',
      lives: 1,
      width: 120,
      height: 80,
      orb: { x: 20, y: 100, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
      paddle: { x: 0, y: 0, width: 10, height: 4, speed: 2 },
      beacons: [
        {
          id: 'beacon-1',
          x: 10,
          y: 10,
          radius: 8,
          active: false,
          required: true,
          hitCount: 0,
        },
      ],
    };
    stepSimulation(explicitLost);
    expect(explicitLost.status).toBe('lost');

    const wonState = buildNextState(
      {
        version: 1,
        width: 180,
        height: 140,
        frame: 2,
        status: 'running',
        score: 0,
        lives: 3,
        input: {
          keyboard: {},
          gamepad: { buttons: [], axes: [] },
          actions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
          previousActions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
        },
        paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
        orb: { x: 40, y: 40, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
        beacons: [
          {
            id: 'beacon-1',
            x: 40,
            y: 40,
            radius: 8,
            active: true,
            required: true,
            hitCount: 1,
          },
        ],
        links: [],
        lastActivatedBeaconId: 'beacon-1',
      },
      {}
    );
    expect(wonState.status).toBe('won');
  });

  it('parses gamepad input and supports malformed storage defensively', () => {
    const gamepadStorage = { current: null };
    runToy(JSON.stringify({ buttons: [true], axes: [1] }), gamepadStorage);
    expect(gamepadStorage.current.BEAC1.input.actions.moveRight).toBe(true);

    const normalized = buildNextState(null, {});
    expect(normalized.status).toBe('ready');
  });

  it('covers input state fallbacks and both movement directions', () => {
    const emptyInput = updateInputState(undefined, {
      type: 'keydown',
      key: 'a',
    });
    expect(emptyInput.previousActions).toEqual({
      moveLeft: false,
      moveRight: false,
      launchPressed: false,
      pausePressed: false,
      resetPressed: false,
    });

    const leftState = buildNextState(
      {
        version: 1,
        width: 120,
        height: 80,
        frame: 1,
        status: 'running',
        score: 0,
        lives: 3,
        input: {
          keyboard: { arrowleft: true },
          gamepad: { buttons: [], axes: [] },
          actions: createActionFlags(),
          previousActions: createActionFlags(),
        },
        paddle: { x: 20, y: 30, width: 40, height: 6, speed: 4 },
        orb: { x: 60, y: 20, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
        beacons: [],
        links: [],
        lastActivatedBeaconId: null,
      },
      {}
    );
    expect(leftState.paddle.x).toBe(16);

    const rightState = buildNextState(
      {
        version: 1,
        width: 120,
        height: 80,
        frame: 1,
        status: 'running',
        score: 0,
        lives: 3,
        input: {
          keyboard: { arrowright: true },
          gamepad: { buttons: [], axes: [] },
          actions: createActionFlags(),
          previousActions: createActionFlags(),
        },
        paddle: { x: 20, y: 30, width: 40, height: 6, speed: 4 },
        orb: { x: 60, y: 20, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
        beacons: [],
        links: [],
        lastActivatedBeaconId: null,
      },
      {}
    );
    expect(rightState.paddle.x).toBe(24);
  });

  it('resets from a fresh reset edge and clears activation history', () => {
    const reset = buildNextState(
      {
        version: 1,
        width: 180,
        height: 140,
        frame: 5,
        status: 'running',
        score: 17,
        lives: 2,
        input: {
          keyboard: {},
          gamepad: { buttons: [], axes: [] },
          actions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
          previousActions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
        },
        paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
        orb: { x: 84, y: 40, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
        beacons: [
          {
            id: 'beacon-1',
            x: 72,
            y: 44,
            radius: 8,
            active: true,
            required: true,
            hitCount: 1,
          },
        ],
        links: [{ from: 'beacon-0', to: 'beacon-1', active: true }],
        lastActivatedBeaconId: 'beacon-1',
      },
      { type: 'keydown', key: 'r' }
    );
    expect(reset.status).toBe('ready');
    expect(reset.score).toBe(0);
    expect(reset.beacons[0].active).toBe(false);
    expect(reset.links).toHaveLength(0);
    expect(reset.lastActivatedBeaconId).toBeNull();
  });

  it('covers explicit lost-state handling and beacon direction branches', () => {
    const lostState = {
      status: 'running',
      lives: 1,
      width: 120,
      height: 80,
      orb: { x: 20, y: 100, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
      paddle: { x: 0, y: 0, width: 10, height: 4, speed: 2 },
      beacons: [
        {
          id: 'beacon-1',
          x: 10,
          y: 10,
          radius: 8,
          active: false,
          required: true,
          hitCount: 0,
        },
      ],
      links: [],
    };
    stepSimulation(lostState);
    expect(lostState.status).toBe('lost');

    const outwardState = {
      orb: { x: 27, y: 27, vx: -2, vy: -3, radius: 4, stuckToPaddle: false },
      score: 0,
      lastActivatedBeaconId: null,
      beacons: [
        {
          id: 'beacon-1',
          x: 20,
          y: 20,
          radius: 8,
          active: false,
          required: true,
          hitCount: 0,
        },
      ],
      links: [],
    };
    resolveBeacons(outwardState);
    expect(outwardState.orb.vx).toBeGreaterThan(0);
    expect(outwardState.orb.vy).toBeGreaterThan(0);

    const inwardState = {
      orb: { x: 14, y: 14, vx: 2, vy: 3, radius: 4, stuckToPaddle: false },
      score: 0,
      lastActivatedBeaconId: null,
      beacons: [
        {
          id: 'beacon-1',
          x: 20,
          y: 20,
          radius: 8,
          active: false,
          required: true,
          hitCount: 0,
        },
      ],
      links: [],
    };
    resolveBeacons(inwardState);
    expect(inwardState.orb.vx).toBeLessThan(0);
    expect(inwardState.orb.vy).toBeLessThan(0);

    const wonState = {
      status: 'running',
      lives: 2,
      width: 120,
      height: 80,
      orb: { x: 40, y: 40, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
      paddle: { x: 0, y: 0, width: 10, height: 4, speed: 2 },
      beacons: [
        {
          id: 'beacon-1',
          x: 20,
          y: 20,
          radius: 8,
          active: true,
          required: true,
          hitCount: 1,
        },
      ],
      links: [],
    };
    stepSimulation(wonState);
    expect(wonState.status).toBe('won');

    const stillRunningState = {
      status: 'running',
      lives: 2,
      width: 120,
      height: 80,
      orb: { x: 40, y: 40, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
      paddle: { x: 0, y: 0, width: 10, height: 4, speed: 2 },
      beacons: [
        {
          id: 'beacon-1',
          x: 20,
          y: 20,
          radius: 8,
          active: false,
          required: true,
          hitCount: 0,
        },
      ],
      links: [],
    };
    stepSimulation(stillRunningState);
    expect(stillRunningState.status).toBe('running');
  });

  it('bounces from both horizontal walls and the top edge', () => {
    const leftWall = buildNextState(
      {
        version: 1,
        width: 180,
        height: 140,
        frame: 2,
        status: 'running',
        score: 0,
        lives: 3,
        input: {
          keyboard: {},
          gamepad: { buttons: [], axes: [] },
          actions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
          previousActions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
        },
        paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
        orb: { x: 3, y: 40, vx: -2, vy: 0, radius: 4, stuckToPaddle: false },
        beacons: [
          {
            id: 'beacon-1',
            x: 160,
            y: 20,
            radius: 8,
            active: false,
            required: true,
            hitCount: 0,
          },
        ],
        links: [],
        lastActivatedBeaconId: null,
      },
      {}
    );
    expect(leftWall.orb.vx).toBeGreaterThan(0);

    const rightWall = buildNextState(
      {
        version: 1,
        width: 180,
        height: 140,
        frame: 2,
        status: 'running',
        score: 0,
        lives: 3,
        input: {
          keyboard: {},
          gamepad: { buttons: [], axes: [] },
          actions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
          previousActions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
        },
        paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
        orb: { x: 177, y: 40, vx: 2, vy: 0, radius: 4, stuckToPaddle: false },
        beacons: [
          {
            id: 'beacon-1',
            x: 10,
            y: 20,
            radius: 8,
            active: false,
            required: true,
            hitCount: 0,
          },
        ],
        links: [],
        lastActivatedBeaconId: null,
      },
      {}
    );
    expect(rightWall.orb.vx).toBeLessThan(0);

    const topWall = buildNextState(
      {
        version: 1,
        width: 180,
        height: 140,
        frame: 2,
        status: 'running',
        score: 0,
        lives: 3,
        input: {
          keyboard: {},
          gamepad: { buttons: [], axes: [] },
          actions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
          previousActions: {
            moveLeft: false,
            moveRight: false,
            launchPressed: false,
            pausePressed: false,
            resetPressed: false,
          },
        },
        paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
        orb: { x: 80, y: 19, vx: 0, vy: -2, radius: 4, stuckToPaddle: false },
        beacons: [
          {
            id: 'beacon-1',
            x: 10,
            y: 20,
            radius: 8,
            active: false,
            required: true,
            hitCount: 0,
          },
        ],
        links: [],
        lastActivatedBeaconId: null,
      },
      {}
    );
    expect(topWall.orb.vy).toBeGreaterThan(0);
  });

  it('covers reset handling, beacon link rendering, and reset state cleanup', () => {
    const state = {
      status: 'running',
      score: 9,
      lives: 2,
      lastActivatedBeaconId: 'beacon-1',
      beacons: [
        {
          id: 'beacon-1',
          x: 20,
          y: 20,
          radius: 8,
          active: true,
          required: true,
          hitCount: 1,
        },
      ],
      links: [{ from: 'beacon-1', to: 'missing', active: true }],
      orb: { x: 20, y: 20, vx: 1, vy: 1, radius: 4, stuckToPaddle: false },
      paddle: { x: 0, y: 0, width: 10, height: 4, speed: 2 },
      width: 120,
      height: 80,
    };
    applyGameplayInput(state, {
      actions: {
        moveLeft: false,
        moveRight: false,
        launchPressed: false,
        pausePressed: false,
        resetPressed: true,
      },
      previousActions: {
        moveLeft: false,
        moveRight: false,
        launchPressed: false,
        pausePressed: false,
        resetPressed: false,
      },
    });
    expect(state.status).toBe('ready');
    expect(state.score).toBe(0);
    expect(state.beacons[0].active).toBe(false);
    expect(state.links).toHaveLength(0);

    state.status = 'running';
    state.orb = { x: 20, y: 20, vx: 1, vy: 1, radius: 4, stuckToPaddle: false };
    resolveBeacons(state);
    expect(state.score).toBe(10);
    expect(state.links).toHaveLength(0);

    state.lastActivatedBeaconId = 'beacon-1';
    state.beacons[0].active = true;
    state.orb = { x: 20, y: 20, vx: 1, vy: 1, radius: 4, stuckToPaddle: false };
    state.beacons.push({
      id: 'beacon-2',
      x: 24,
      y: 24,
      radius: 8,
      active: false,
      required: true,
      hitCount: 0,
    });
    state.orb.x = 24;
    state.orb.y = 24;
    resolveBeacons(state);
    expect(state.links.some(link => link.from === 'beacon-1')).toBe(true);

    const canvas = toCanvasPayload({
      width: 120,
      height: 80,
      links: [{ from: 'beacon-1', to: 'beacon-2', active: true }],
      beacons: [
        {
          id: 'beacon-1',
          x: 10,
          y: 10,
          radius: 8,
          active: true,
          required: true,
          hitCount: 1,
        },
        {
          id: 'beacon-2',
          x: 20,
          y: 20,
          radius: 8,
          active: true,
          required: true,
          hitCount: 1,
        },
      ],
      paddle: { x: 0, y: 0, width: 10, height: 4, speed: 2 },
      orb: { x: 0, y: 0, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
      score: 0,
      lives: 1,
      status: 'running',
    });
    expect(canvas.shapes.some(shape => shape.type === 'line')).toBe(true);

    const wallState = {
      orb: { x: 1, y: 1, vx: -2, vy: -2, radius: 4 },
      width: 120,
      height: 80,
    };
    resolveWalls(wallState);
    expect(wallState.orb.vx).toBeGreaterThanOrEqual(0);
    expect(wallState.orb.vy).toBeGreaterThanOrEqual(0);
  });

  it('keeps the orb pinned to the paddle while stuck', () => {
    const state = {
      paddle: { x: 10, y: 30, width: 40, height: 6, speed: 4 },
      orb: { x: 0, y: 0, vx: 1, vy: 1, radius: 4, stuckToPaddle: true },
    };
    stepSimulation(state);
    expect(state.orb.x).toBe(30);
    expect(state.orb.y).toBe(25);
  });

  it('covers helper branches for input normalization and fallback building', () => {
    expect(buildResetFallback(null)).toBeUndefined();
    expect(
      buildResetFallback({ width: 1, height: 2, lives: 3, layoutSeed: 4 })
    ).toEqual({
      width: 1,
      height: 2,
      lives: 3,
      layoutSeed: 4,
    });

    expect(normalizeKeyboard({ a: true }, { type: 'keyup', key: 'A' }).a).toBe(
      false
    );
    expect(normalizeKeyboard(undefined, { type: 'keydown', key: 'd' }).d).toBe(
      true
    );
    expect(normalizeGamepad({ buttons: [1, 0], axes: ['2', null] })).toEqual({
      buttons: [true, false],
      axes: [2, 0],
    });
    expect(createActionFlags()).toEqual({
      moveLeft: false,
      moveRight: false,
      launchPressed: false,
      pausePressed: false,
      resetPressed: false,
    });
    expect(normalizeGamepad({ buttons: [true], axes: [0] }).buttons[0]).toBe(
      true
    );
  });

  it('covers paddle bounce and beacon render branches', () => {
    const paddleState = {
      paddle: { x: 10, y: 30, width: 40, height: 6, speed: 4 },
      orb: { x: 16, y: 34, vx: -1, vy: 3, radius: 4, stuckToPaddle: false },
    };
    resolvePaddle(paddleState);
    expect(paddleState.orb.vy).toBeLessThan(0);

    const beaconState = {
      orb: { x: 20, y: 20, vx: 1, vy: 1, radius: 4, stuckToPaddle: false },
      score: 0,
      lastActivatedBeaconId: null,
      beacons: [
        {
          id: 'beacon-1',
          x: 20,
          y: 20,
          radius: 8,
          active: false,
          required: false,
          hitCount: 0,
        },
      ],
      links: [],
    };
    resolveBeacons(beaconState);
    expect(beaconState.score).toBe(10);
    expect(beaconState.links).toHaveLength(0);

    const beaconLinkedState = {
      orb: { x: 24, y: 24, vx: -1, vy: -1, radius: 4, stuckToPaddle: false },
      score: 0,
      lastActivatedBeaconId: 'beacon-0',
      beacons: [
        {
          id: 'beacon-1',
          x: 24,
          y: 24,
          radius: 8,
          active: false,
          required: true,
          hitCount: 0,
        },
      ],
      links: [],
    };
    resolveBeacons(beaconLinkedState);
    expect(beaconLinkedState.links).toHaveLength(1);

    const canvas = toCanvasPayload({
      width: 120,
      height: 80,
      links: [
        { from: 'beacon-1', to: 'beacon-2', active: true },
        { from: 'missing', to: 'missing-2', active: true },
      ],
      beacons: [
        {
          id: 'beacon-1',
          x: 10,
          y: 10,
          radius: 8,
          active: true,
          required: false,
          hitCount: 1,
        },
        {
          id: 'beacon-2',
          x: 20,
          y: 20,
          radius: 8,
          active: true,
          required: false,
          hitCount: 1,
        },
      ],
      paddle: { x: 0, y: 0, width: 10, height: 4, speed: 2 },
      orb: { x: 0, y: 0, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
      score: 0,
      lives: 1,
      status: 'running',
    });
    expect(canvas.shapes.some(shape => shape.stroke === '#335')).toBe(true);
    expect(canvas.shapes.some(shape => shape.type === 'line')).toBe(true);

    const filteredCanvas = toCanvasPayload({
      width: 120,
      height: 80,
      links: [{ from: 'missing', to: 'beacon-2', active: true }],
      beacons: [
        {
          id: 'beacon-1',
          x: 10,
          y: 10,
          radius: 8,
          active: true,
          required: false,
          hitCount: 1,
        },
      ],
      paddle: { x: 0, y: 0, width: 10, height: 4, speed: 2 },
      orb: { x: 0, y: 0, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
      score: 0,
      lives: 1,
      status: 'running',
    });
    expect(filteredCanvas.shapes.some(shape => shape.type === 'line')).toBe(
      false
    );
  });

  it('falls back cleanly on malformed input', () => {
    const { payload } = runToy('not-json');
    expect(payload.width).toBeGreaterThan(0);
    expect(payload.shapes.some(shape => shape.type === 'text')).toBe(true);
  });
});
