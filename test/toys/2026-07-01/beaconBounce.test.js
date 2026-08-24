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
 * Run the toy with an in-memory persistence adapter.
 * @param {string} input Serialized toy input.
 * @param {{ current: Record<string, unknown> | null }} storageValue Stored state.
 * @returns {{ payload: Record<string, unknown>, storageValue: { current: Record<string, unknown> | null }, setLocalPermanentData: jest.Mock }} Toy output and persistence state.
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
    expect(storageValue.current.BEAC1.frame).toBe(1);
    expect(storageValue.current.BEAC1.status).toBe('ready');
    expect(storageValue.current.BEAC1.lives).toBe(3);
    expect(storageValue.current.BEAC1.initialLives).toBe(3);
    expect(storageValue.current.BEAC1.input).toEqual({
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
      control: { paused: false, speedMultiplier: 1, stepCount: 0 },
    });
    expect(storageValue.current.BEAC1.paddle).toMatchObject({
      width: 48,
      height: 6,
      speed: 4,
    });
    expect(storageValue.current.BEAC1.orb).toMatchObject({
      radius: 4,
      stuckToPaddle: true,
    });
    expect(storageValue.current.BEAC1.beacons).toEqual([
      expect.objectContaining({ id: 'beacon-1-1', x: 74, y: 44, radius: 9 }),
      expect.objectContaining({ id: 'beacon-1-2', x: 142, y: 33, radius: 8 }),
      expect.objectContaining({ id: 'beacon-1-3', x: 216, y: 46, radius: 8 }),
      expect.objectContaining({ id: 'beacon-1-4', x: 106, y: 99, radius: 8 }),
      expect.objectContaining({ id: 'beacon-1-5', x: 182, y: 102, radius: 8 }),
      expect.objectContaining({ id: 'beacon-1-6', x: 220, y: 85, radius: 8 }),
    ]);

    const fallback = runToy(JSON.stringify({ width: 0, height: -1, lives: 0 }));
    expect(fallback.storageValue.current.BEAC1.width).toBeGreaterThan(0);
    expect(fallback.storageValue.current.BEAC1.height).toBeGreaterThan(0);
    expect(fallback.storageValue.current.BEAC1.lives).toBeGreaterThan(0);

    const compact = runToy(JSON.stringify({ width: 100, height: 60, layoutSeed: 2 }));
    expect(compact.storageValue.current.BEAC1.paddle).toMatchObject({
      x: 26,
      y: 36,
      width: 48,
      height: 6,
    });
    expect(compact.storageValue.current.BEAC1.orb).toMatchObject({
      x: 50,
      y: 37,
      vx: 1.6,
      vy: -2.4,
    });
    expect(compact.storageValue.current.BEAC1.beacons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'beacon-2-1', x: 76, y: 20 }),
      expect.objectContaining({ id: 'beacon-2-2', x: 80, y: 20 }),
      expect.objectContaining({ id: 'beacon-2-6', x: 80, y: 20 }),
    ]));
  });

  it('launches on space and keeps launch edge-triggered', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: ' ' }), storageValue);
    const second = runToy('{}', storageValue);
    expect(second.storageValue.current.BEAC1.status).toBe('running');
    expect(second.storageValue.current.BEAC1.orb.stuckToPaddle).toBe(false);

    const frameBeforeStepping = second.storageValue.current.BEAC1.frame;
    const stepped = runToy(
      JSON.stringify({ speedMultiplier: 2, stepCount: 2 }),
      storageValue
    );
    expect(stepped.storageValue.current.BEAC1.simulationSpeed).toBe(2);
    expect(stepped.storageValue.current.BEAC1.frame).toBeGreaterThan(frameBeforeStepping);
  });

  it('does not relaunch a game that is already running', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: ' ' }), storageValue);
    const before = storageValue.current.BEAC1;
    runToy(JSON.stringify({ type: 'keydown', key: ' ' }), storageValue);
    expect(storageValue.current.BEAC1.status).toBe('running');
    expect(storageValue.current.BEAC1.frame).toBe(before.frame + 1);
  });

  it('ignores a launch edge while the game is running', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: ' ' }), storageValue);
    const running = storageValue.current.BEAC1;
    applyGameplayInput(running, {
      actions: {
        moveLeft: false,
        moveRight: false,
        launchPressed: true,
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
    });
    expect(running.status).toBe('running');
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

  it('preserves persisted dimensions and increments the layout seed on reset', () => {
    const initial = buildNextState(null, {
      width: 240,
      height: 160,
      layoutSeed: 7,
      lives: 5,
    });
    initial.layoutSeed = 7;
    const reset = buildNextState(initial, { type: 'keydown', key: 'r' });
    expect(reset.width).toBe(240);
    expect(reset.height).toBe(160);
    expect(reset.lives).toBe(5);
    expect(reset.beacons[0].id).toBe('beacon-8-1');
    expect(reset.status).toBe('ready');
    expect(reset.frame).toBe(0);
  });

  it('honors an explicit reset payload and fallback life precedence', () => {
    const persisted = buildNextState(null, {
      width: 240,
      height: 160,
      lives: 5,
    });
    persisted.initialLives = 7;
    const reset = buildNextState(persisted, {
      reset: true,
      width: 120,
      height: 90,
      lives: 2,
    });
    expect(reset.width).toBe(120);
    expect(reset.height).toBe(90);
    expect(reset.lives).toBe(2);
    expect(reset.frame).toBe(persisted.frame + 1);
    expect(reset.beacons[0].id).toBe('beacon-1-1');
    expect(buildResetFallback({ lives: 3, initialLives: 6 }).lives).toBe(6);
    expect(buildResetFallback({ lives: 3 }).lives).toBe(3);
  });
});

describe('beaconBounce gameplay transitions', () => {
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
});

describe('beaconBounce pause and reset transitions', () => {
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
      { type: 'keydown', key: 'p' }
    );
    expect(paused.paused).toBe(true);

    const released = buildNextState(paused, { type: 'keyup', key: 'p' });
    const resumed = buildNextState(released, { type: 'keydown', key: 'p' });
    expect(resumed.paused).toBe(false);

    const reset = buildNextState(resumed, { type: 'keydown', key: 'r' });
    expect(reset.status).toBe('ready');
    expect(reset.score).toBe(0);
  });
});

describe('beaconBounce collision outcomes', () => {
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

    const survivedLifeLoss = {
      status: 'running',
      lives: 2,
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
    stepSimulation(survivedLifeLoss);
    expect(survivedLifeLoss.lives).toBe(1);
    expect(survivedLifeLoss.status).toBe('ready');

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
});

describe('beaconBounce loss and input handling', () => {
  it('marks the game lost when the final life drops below zero', () => {
    const state = {
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

    stepSimulation(state);

    expect(state.lives).toBe(0);
    expect(state.status).toBe('lost');
    expect(state.orb.stuckToPaddle).toBe(true);
  });
});

describe('beaconBounce input and state fallbacks', () => {
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
});

describe('beaconBounce wall and reset behavior', () => {
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
});

describe('beaconBounce reset rendering', () => {
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

    const rightWall = {
      orb: { x: 119, y: 40, vx: 2, vy: 2, radius: 4 },
      width: 120,
      height: 80,
    };
    resolveWalls(rightWall);
    expect(rightWall.orb.x).toBe(116);
    expect(rightWall.orb.vx).toBe(-2);

    const clearWalls = {
      orb: { x: 40, y: 40, vx: 2, vy: 2, radius: 4 },
      width: 120,
      height: 80,
    };
    resolveWalls(clearWalls);
    expect(clearWalls.orb).toEqual({ x: 40, y: 40, vx: 2, vy: 2, radius: 4 });

    const exactWalls = {
      orb: { x: 4, y: 22, vx: -2, vy: -2, radius: 4 },
      width: 120,
      height: 80,
    };
    resolveWalls(exactWalls);
    expect(exactWalls.orb).toMatchObject({ x: 4, y: 22, vx: 2, vy: 2 });

    const alreadyActive = {
      orb: { x: 20, y: 20, vx: -1, vy: -1, radius: 4, stuckToPaddle: false },
      score: 10,
      lastActivatedBeaconId: 'beacon-1',
      beacons: [{
        id: 'beacon-1', x: 20, y: 20, radius: 8, active: true, required: true, hitCount: 1,
      }],
      links: [],
    };
    resolveBeacons(alreadyActive);
    expect(alreadyActive.score).toBe(10);
    expect(alreadyActive.beacons[0].hitCount).toBe(2);
    expect(alreadyActive.links).toEqual([]);

    const upperLeftBeacon = {
      orb: { x: 20, y: 20, vx: 2, vy: 3, radius: 4, stuckToPaddle: false },
      score: 0,
      lastActivatedBeaconId: null,
      beacons: [{
        id: 'upper-left', x: 24, y: 24, radius: 8, active: false, required: true, hitCount: 0,
      }],
      links: [],
    };
    resolveBeacons(upperLeftBeacon);
    expect(upperLeftBeacon.orb).toMatchObject({ vx: -2, vy: -3 });
    expect(upperLeftBeacon.beacons[0]).toMatchObject({ active: true, hitCount: 1 });

    const missedPaddle = {
      paddle: { x: 10, y: 30, width: 40, height: 6, speed: 4 },
      orb: { x: 80, y: 34, vx: 1, vy: 3, radius: 4, stuckToPaddle: false },
    };
    resolvePaddle(missedPaddle);
    expect(missedPaddle.orb).toEqual({
      x: 80,
      y: 34,
      vx: 1,
      vy: 3,
      radius: 4,
      stuckToPaddle: false,
    });
  });
});

describe('beaconBounce stuck orb and helpers', () => {
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
    expect(normalizeGamepad(undefined)).toEqual({ buttons: [], axes: [] });

    const previousInput = {
      keyboard: { p: true },
      actions: {
        moveLeft: false,
        moveRight: false,
        launchPressed: false,
        pausePressed: false,
        resetPressed: false,
      },
      control: { paused: false, speedMultiplier: 2, stepCount: 0 },
    };
    const pausedControl = updateInputState(previousInput, {
      pause: true,
      speedMultiplier: 3,
      stepCount: 2,
    });
    expect(pausedControl.control).toEqual({
      paused: true,
      speedMultiplier: 3,
      stepCount: 2,
    });

    const resumedControl = updateInputState(previousInput, {
      resume: true,
      speed: 4,
      steps: 5,
    });
    expect(resumedControl.control).toEqual({
      paused: false,
      speedMultiplier: 4,
      stepCount: 5,
    });
    expect(updateInputState(undefined, { speed: -4, step: -2 }).control).toEqual({
      paused: false,
      speedMultiplier: 1,
      stepCount: 0,
    });
    expect(updateInputState(undefined, { speedMultiplier: 0.4, stepCount: 1.6 }).control).toEqual({
      paused: false,
      speedMultiplier: 1,
      stepCount: 2,
    });

    const derivedActions = updateInputState(undefined, {
      buttons: [
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ],
      axes: [-1],
    });
    expect(derivedActions.actions).toEqual({
      moveLeft: true,
      moveRight: false,
      launchPressed: true,
      pausePressed: false,
      resetPressed: false,
    });

    expect(
      updateInputState(undefined, {
        type: 'keydown',
        key: 'd',
        buttons: Array.from({ length: 16 }, (_, index) => index === 15),
        axes: [1],
      }).actions
    ).toMatchObject({ moveRight: true });
    expect(
      updateInputState(undefined, {
        type: 'keydown',
        key: 'p',
        buttons: Array.from({ length: 10 }, (_, index) => index === 9),
        axes: [0],
      }).actions.pausePressed
    ).toBe(true);
    expect(
      updateInputState(undefined, {
        type: 'keydown',
        key: 'r',
        buttons: [false, true],
        axes: [0],
      }).actions.resetPressed
    ).toBe(true);

    const heldPause = {
      status: 'running',
      paused: false,
      width: 120,
      paddle: { x: 20, y: 30, width: 40, height: 6, speed: 4 },
      beacons: [],
      links: [],
      orb: { x: 0, y: 0, vx: 0, vy: 0, radius: 4, stuckToPaddle: true },
      initialLives: 3,
    };
    applyGameplayInput(heldPause, {
      actions: {
        pausePressed: true,
        moveLeft: false,
        moveRight: false,
        launchPressed: false,
        resetPressed: false,
      },
      previousActions: {
        pausePressed: true,
        moveLeft: false,
        moveRight: false,
        launchPressed: false,
        resetPressed: false,
      },
    });
    expect(heldPause.paused).toBe(false);

    const wonLocked = {
      status: 'won',
      paused: false,
      width: 120,
      paddle: { x: 20, y: 30, width: 40, height: 6, speed: 4 },
      beacons: [],
      links: [],
      orb: { x: 0, y: 0, vx: 0, vy: 0, radius: 4, stuckToPaddle: true },
      initialLives: 3,
    };
    applyGameplayInput(wonLocked, {
      actions: {
        pausePressed: false,
        moveLeft: true,
        moveRight: false,
        launchPressed: false,
        resetPressed: false,
      },
      previousActions: createActionFlags(),
    });
    expect(wonLocked.paddle.x).toBe(20);

    const clamped = {
      status: 'running',
      paused: false,
      width: 100,
      paddle: { x: 90, y: 30, width: 40, height: 6, speed: 20 },
      beacons: [],
      links: [],
      orb: { x: 0, y: 0, vx: 0, vy: 0, radius: 4, stuckToPaddle: true },
      initialLives: 3,
    };
    applyGameplayInput(clamped, {
      actions: { ...createActionFlags(), moveRight: true },
      previousActions: createActionFlags(),
    });
    expect(clamped.paddle.x).toBe(60);

    const relaunchFromLost = {
      status: 'lost',
      paused: false,
      width: 120,
      paddle: { x: 20, y: 30, width: 40, height: 6, speed: 4 },
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
      orb: { x: 0, y: 0, vx: 0, vy: 0, radius: 4, stuckToPaddle: true },
      initialLives: 3,
      lives: 0,
    };
    applyGameplayInput(relaunchFromLost, {
      actions: {
        pausePressed: false,
        moveLeft: false,
        moveRight: false,
        launchPressed: true,
        resetPressed: false,
      },
      previousActions: createActionFlags(),
    });
    expect(relaunchFromLost.lives).toBe(1);
    expect(relaunchFromLost.status).toBe('running');

    const resetState = {
      status: 'running',
      paused: true,
      score: 25,
      lives: 1,
      initialLives: 4,
      simulationSpeed: 3,
      lastActivatedBeaconId: 'beacon-1',
      width: 120,
      paddle: { x: 20, y: 30, width: 40, height: 6, speed: 4 },
      beacons: [{ active: true, hitCount: 2 }],
      links: [{ from: 'beacon-1', to: 'beacon-2', active: true }],
      orb: { stuckToPaddle: false },
    };
    applyGameplayInput(resetState, {
      actions: { ...createActionFlags(), resetPressed: true },
      previousActions: createActionFlags(),
    });
    expect(resetState).toMatchObject({
      status: 'ready',
      paused: false,
      score: 0,
      lives: 4,
      simulationSpeed: 1,
      lastActivatedBeaconId: null,
    });
    expect(resetState.beacons[0]).toEqual({ active: false, hitCount: 0 });
    expect(resetState.links).toEqual([]);
    expect(resetState.orb.stuckToPaddle).toBe(true);
  });
});

describe('beaconBounce physics and rendering', () => {
  it('covers paddle bounce and beacon render branches', () => {
    const paddleState = {
      paddle: { x: 10, y: 30, width: 40, height: 6, speed: 4 },
      orb: { x: 16, y: 34, vx: -1, vy: 3, radius: 4, stuckToPaddle: false },
    };
    resolvePaddle(paddleState);
    expect(paddleState.orb.vy).toBeLessThan(0);
    expect(paddleState.orb.y).toBe(25);
    expect(paddleState.orb.vx).toBeGreaterThanOrEqual(-3);
    expect(paddleState.orb.vx).toBeLessThanOrEqual(3);

    const centeredPaddle = {
      paddle: { x: 10, y: 30, width: 40, height: 6, speed: 4 },
      orb: { x: 30, y: 34, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
    };
    resolvePaddle(centeredPaddle);
    expect(centeredPaddle.orb.vx).toBe(1);

    const rightPaddle = {
      paddle: { x: 10, y: 30, width: 20, height: 6, speed: 4 },
      orb: { x: 34, y: 34, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
    };
    resolvePaddle(rightPaddle);
    expect(rightPaddle.orb.vx).toBe(3);

    const upwardOrb = {
      paddle: { x: 10, y: 30, width: 40, height: 6, speed: 4 },
      orb: { x: 30, y: 34, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
    };
    resolvePaddle(upwardOrb);
    expect(upwardOrb.orb).toMatchObject({ vx: 0, vy: -3, y: 34 });

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
    expect(beaconState.beacons[0]).toMatchObject({
      active: true,
      hitCount: 1,
    });
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
    expect(beaconLinkedState.links[0]).toEqual({
      from: 'beacon-0',
      to: 'beacon-1',
      active: true,
    });

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
    expect(canvas.shapes).toEqual([
      expect.objectContaining({ type: 'rect', x: 0, y: 0, width: 120, height: 80, fill: '#09111d' }),
      expect.objectContaining({ type: 'line', x1: 10, y1: 10, x2: 20, y2: 20, stroke: '#49d8ff', lineWidth: 1 }),
      expect.objectContaining({ type: 'circle', x: 10, y: 10, radius: 8, fill: '#6ee7ff', stroke: '#335' }),
      expect.objectContaining({ type: 'circle', x: 20, y: 20, radius: 8, fill: '#6ee7ff', stroke: '#335' }),
      expect.objectContaining({ type: 'rect', x: 0, y: 0, width: 10, height: 4, fill: '#d7f3ff' }),
      expect.objectContaining({ type: 'circle', x: 0, y: 0, radius: 4, fill: '#f8fafc' }),
      expect.objectContaining({ type: 'text', x: 8, y: 14, text: 'Score 0 Lives 1 RUNNING', fill: '#dbeafe', font: '11px monospace', align: 'left', baseline: 'alphabetic' }),
    ]);

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
