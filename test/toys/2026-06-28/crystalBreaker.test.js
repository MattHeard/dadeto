import { describe, expect, it, jest } from '@jest/globals';
import {
  crystalBreaker,
  crystalBreakerTestOnly,
  getCrystalFill,
  resetOrbAfterLoss,
} from '../../../src/core/browser/toys/2026-06-28/crystalBreaker.js';

const h = crystalBreakerTestOnly;

/**
 * Runs the crystal breaker toy with a mocked storage accessor.
 * @param {string} input Raw toy input.
 * @param {{ current: Record<string, unknown> | null }} storageValue Storage wrapper.
 * @returns {{ payload: Record<string, unknown>, storageValue: { current: Record<string, unknown> | null }, setLocalPermanentData: ReturnType<typeof jest.fn> }} Render result.
 */
function runToy(input, storageValue = { current: null }) {
  const setLocalPermanentData = jest.fn(next => {
    storageValue.current = { ...(storageValue.current || {}), ...next };
    return storageValue.current;
  });
  const env = new Map([['setLocalPermanentData', setLocalPermanentData]]);
  const payload = JSON.parse(crystalBreaker(input, env));
  return { payload, storageValue, setLocalPermanentData };
}

describe('crystalBreaker', () => {
  it('renders an initial scene with HUD text and persists state under CRYS1', () => {
    const { payload, storageValue } = runToy(
      JSON.stringify({ width: 240, height: 160 })
    );
    expect(payload.width).toBe(240);
    expect(payload.height).toBe(160);
    expect(payload.shapes.some(shape => shape.type === 'text')).toBe(true);
    expect(storageValue.current.CRYS1.version).toBe(1);
  });

  it('launches on space and keeps launch edge-triggered', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: ' ' }), storageValue);
    const second = runToy('{}', storageValue);
    expect(second.storageValue.current.CRYS1.status).toBe('running');
    expect(second.storageValue.current.CRYS1.orb.stuckToPaddle).toBe(false);
  });

  it('moves paddle with held input', () => {
    const storageValue = { current: null };
    runToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowRight' }),
      storageValue
    );
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.CRYS1.paddle.x).toBeGreaterThan(100);
  });

  it('keeps held left input active across frames without snapping back to center', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'ArrowLeft' }), storageValue);
    const first = runToy('{}', storageValue);
    const firstX = first.storageValue.current.CRYS1.paddle.x;
    const second = runToy('{}', storageValue);
    const secondX = second.storageValue.current.CRYS1.paddle.x;

    expect(firstX).toBeLessThan(156);
    expect(secondX).toBeLessThan(firstX);
  });

  it('places HUD text within the canvas width', () => {
    const { payload } = runToy(JSON.stringify({ width: 360, height: 240 }));
    const hudTexts = payload.shapes.filter(shape => shape.type === 'text');

    expect(hudTexts).toHaveLength(4);
    expect(Math.max(...hudTexts.map(shape => shape.x))).toBeLessThan(360);
  });
});

describe('crystalBreaker helper contracts', () => {
  it('covers normalization, input, geometry, and terminal helper boundaries', () => {
    expect(h.getCrystalBackdropFill(true)).toBe('#0f172a');
    expect(h.getCrystalBackdropFill(false)).toBe('#08111f');
    expect(h.normalizeSeedWidth({}, null)).toBe(360);
    expect(h.normalizeSeedHeight({ height: 160 }, null)).toBe(160);
    expect(h.normalizeSeedLives({ lives: 2 }, null)).toBe(2);
    expect(h.normalizeSeedLayoutSeed({ layoutSeed: 3 })).toBe(3);
    expect(h.normalizeStatus('running')).toBe('running');
    expect(h.normalizeStatus('invalid')).toBe('ready');
    expect(h.normalizeBooleanRecord(null)).toEqual({});
    expect(h.normalizeBooleanRecord({ left: true, right: 1 })).toEqual({
      left: true,
      right: false,
    });
    expect(h.normalizeGamepadButtons([true, 0])).toEqual([true, false]);
    expect(h.normalizeGamepadAxes([1, 'bad'])).toEqual([1, 0]);
    expect(h.normalizeActions(null)).toMatchObject({
      moveLeft: false,
      resetPressed: false,
    });
    expect(h.normalizeKeyName('ArrowLeft')).toBe('arrowleft');
    expect(h.normalizeKeyName('')).toBe('');
    expect(h.getCrystalHp(0)).toBeGreaterThan(0);
    expect(h.getCrystalRowOffset(0)).toBe(0);
    expect(h.getCrystalRowOffset(1)).toBe(10);
    expect(h.normalizeCrystalState('fractured')).toBe('fractured');
    expect(h.normalizeCrystalState('bad')).toBe('whole');
    expect(h.getCrystalFill('shattered')).toBe('#4f46e5');
    expect(h.getLossStatus(0)).toBe('lost');
    expect(h.getLossStatus(1)).toBe('ready');
  });

  it('covers crystal state, collision, and input boundaries', () => {
    const h = crystalBreakerTestOnly;
    const state = h.createSeedState({ width: 180, height: 140 }, null);
    expect(
      h.createSeedState(
        {
          width: 200,
          height: 100,
          paddleWidth: 60,
          paddleHeight: 8,
          paddleSpeed: 5,
          orbRadius: 6,
          lives: 2,
          layoutSeed: 4,
        },
        null
      )
    ).toMatchObject({
      width: 200,
      height: 100,
      lives: 2,
      paddle: { width: 60, height: 8, speed: 5 },
      orb: { radius: 6 },
    });
    expect(h.buildNextState(state, {})).toMatchObject({
      frame: 1,
      width: 180,
      height: 140,
    });
    expect(
      h.buildNextState(state, { reset: true, width: 200, height: 100 })
    ).toMatchObject({ width: 200, height: 100, status: 'ready' });
    expect(h.buildResetFallback(state)).toEqual({
      width: 180,
      height: 140,
      lives: 3,
    });
    expect(h.buildResetFallback(null)).toBeUndefined();
    expect(
      h.mergeSeedAndState(
        state,
        h.createSeedState({ width: 200, height: 100 }, null)
      )
    ).toMatchObject({ width: 200, height: 100 });
    expect(state.crystals.length).toBeGreaterThan(0);
    const payload = h.toCanvasPayload(state);
    expect(payload).toMatchObject({ width: 180, height: 140 });
    expect(payload.shapes.slice(0, 6)).toEqual([
      { type: 'rect', x: 0, y: 0, width: 180, height: 140, fill: '#08111f' },
      { type: 'rect', x: 0, y: 0, width: 180, height: 24, fill: '#0f172a' },
      expect.objectContaining({ type: 'text', x: 8, text: 'Score 0' }),
      expect.objectContaining({ type: 'text', x: 88, text: 'Lives 3' }),
      expect.objectContaining({ type: 'text', x: 160, text: 'Crystals 15' }),
      expect.objectContaining({ type: 'text', x: 250, text: 'Status READY' }),
    ]);
    expect(payload.shapes.filter(shape => shape.type === 'rect')).toHaveLength(18);
    expect(payload.shapes.at(-2)).toEqual({
      type: 'rect', x: 66, y: 116, width: 48, height: 6, fill: '#f59e0b',
    });
    expect(payload.shapes.at(-1)).toEqual({
      type: 'circle', x: 90, y: 117, radius: 4, fill: '#f8fafc',
    });
    expect(h.orbHitsPaddle(state.orb, state.paddle)).toBe(false);
    expect(h.orbHitsCrystal(state.orb, state.crystals[0])).toBe(false);
    expect(h.normalizePaddle(null)).toMatchObject({
      width: 48,
      height: 6,
      speed: 4,
    });
    expect(h.normalizeOrb(null)).toMatchObject({
      radius: 4,
      stuckToPaddle: true,
    });
    expect(h.normalizeCrystals(180, 140, 2)).toHaveLength(15);
    expect(h.normalizeCrystalsFromState([])).toEqual([]);
    expect(h.normalizeCrystalFromState({}, 0)).toMatchObject({
      id: 'crystal-1',
      state: 'whole',
    });
    expect(
      h.normalizeCrystalPositionAndSize(
        { x: 4, y: 5, width: 20, height: 10 },
        2
      )
    ).toMatchObject({ x: 4, y: 5, width: 20, height: 10 });
    expect(h.normalizeCrystalStats({ hp: 2, maxHp: 3, fracture: 1 })).toEqual({
      hp: 2,
      maxHp: 3,
      fracture: 1,
    });
    expect(h.getCrystalId('custom', 2)).toBe('custom');
    expect(h.getCrystalId({}, 2)).toBe('crystal-3');
    expect(
      h.parseActions({ type: 'keydown', key: ' ' }, h.createInitialInputState())
        .actions.launchPressed
    ).toBe(true);
    expect(
      h.buildNextKeyboardState({ type: 'keydown', key: 'a' }, {}, 'a')
    ).toEqual({ a: true });
    expect(h.isMoveLeftPressed({ arrowleft: true })).toBe(true);
    expect(h.isMoveRightPressed({ arrowright: true })).toBe(true);
    expect(
      h.resetPressed({
        actions: { resetPressed: true },
        previousActions: { resetPressed: false },
      })
    ).toBe(true);
    const inputState = h.createInitialInputState();
    inputState.actions.pausePressed = true;
    const paused = { ...state, status: 'running' };
    h.applyPauseInput(paused, inputState);
    expect(paused.status).toBe('paused');
    const launched = { ...state, status: 'ready' };
    inputState.actions.launchPressed = true;
    h.applyLaunchInput(launched, inputState);
    expect(launched.status).toBe('running');
    const moved = {
      ...state,
      paddle: { ...state.paddle },
      orb: { ...state.orb },
    };
    inputState.actions.moveRight = true;
    h.applyPaddleMotion(moved, inputState);
    expect(moved.paddle.x).toBeGreaterThan(state.paddle.x);
  });
});

describe('crystalBreaker crystal collisions', () => {
  it('reduces crystal hp and changes state on collision', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 40, y: 36, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'crystal-1',
              x: 32,
              y: 32,
              width: 24,
              height: 14,
              hp: 2,
              maxHp: 2,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.CRYS1.score).toBeGreaterThan(0);
    expect(next.storageValue.current.CRYS1.crystals[0].state).toBe('fractured');
  });

  it('keeps a whole crystal whole when it is hit before any fracture', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 40, y: 36, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'crystal-1',
              x: 32,
              y: 32,
              width: 24,
              height: 14,
              hp: 4,
              maxHp: 3,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.crystals[0].state).toBe('whole');
    expect(storageValue.current.CRYS1.score).toBe(1);
  });
});

describe('crystalBreaker reset and wall behavior', () => {
  it('resets on a fresh reset keydown', () => {
    const storageValue = { current: null };

    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);

    expect(storageValue.current.CRYS1.status).toBe('ready');
    expect(storageValue.current.CRYS1.input.actions.resetPressed).toBe(true);
  });

  it('bounces from the top edge and the paddle in one run', () => {
    const topEdgeStorage = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 4,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 80, y: 3, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
          crystals: [],
        },
      },
    };
    const paddleStorage = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 4,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 84, y: 112, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          crystals: [],
        },
      },
    };

    runToy('{}', topEdgeStorage);
    runToy('{}', paddleStorage);

    expect(topEdgeStorage.current.CRYS1.orb.vy).toBeGreaterThan(0);
    expect(paddleStorage.current.CRYS1.orb.vy).toBeLessThan(0);
  });

  it('bounces off the left wall', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 4,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 3, y: 70, vx: -3, vy: 0, radius: 4, stuckToPaddle: false },
          crystals: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.orb.vx).toBeGreaterThan(0);
  });

  it('renders a fractured crystal with the fractured fill', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 1,
          status: 'ready',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 80, y: 70, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'fractured',
              x: 32,
              y: 32,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 2,
              fracture: 1,
              state: 'fractured',
            },
          ],
        },
      },
    };
    const { payload } = runToy('{}', storageValue);

    expect(payload.shapes.some(shape => shape.fill === '#8dd3ff')).toBe(true);
  });
});

describe('crystalBreaker lifecycle states', () => {
  it('toggles pause from a running state', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 4,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 80, y: 70, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
          crystals: [],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'p' }), storageValue);

    expect(storageValue.current.CRYS1.status).toBe('paused');
  });

  it('marks the game lost after the last life is spent', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 4,
          status: 'running',
          score: 0,
          lives: 1,
          combo: 0,
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
          orb: { x: 80, y: 150, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'crystal-1',
              x: 300,
              y: 300,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.status).toBe('lost');
    expect(storageValue.current.CRYS1.lives).toBe(0);
  });

  it('falls back to the default fill color for an unknown crystal state', () => {
    expect(getCrystalFill('unexpected')).toBe('#5eead4');
  });

  it('sets the state to ready when a life remains after a loss', () => {
    const state = {
      lives: 2,
      combo: 7,
      status: 'running',
      paddle: { x: 10, width: 20, y: 50 },
      orb: { stuckToPaddle: false, vx: 0, vy: 0, x: 0, y: 0, radius: 4 },
    };

    resetOrbAfterLoss(state);

    expect(state.lives).toBe(1);
    expect(state.status).toBe('ready');
    expect(state.orb.stuckToPaddle).toBe(true);
  });

  it('bounces from the top edge and the paddle in one run', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 84, y: 8, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'crystal-1',
              x: 300,
              y: 300,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.orb.vy).toBeGreaterThan(0);
    expect(storageValue.current.CRYS1.combo).toBe(0);
  });
});

describe('crystalBreaker persisted state normalization', () => {
  it('handles malformed persisted state by falling back to a valid scene', () => {
    const storageValue = { current: { CRYS1: { version: 999 } } };
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.CRYS1.version).toBe(1);
    expect(next.payload.shapes.some(shape => shape.type === 'text')).toBe(true);
  });

  it('normalizes malformed persisted crystals and status fields', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 2,
          status: 'bad',
          score: 5,
          lives: 2,
          combo: 1,
          input: {
            keyboard: null,
            gamepad: { buttons: [1, false], axes: ['bad'] },
            actions: null,
            previousActions: { moveLeft: true, resetPressed: false },
          },
          paddle: null,
          orb: null,
          crystals: [
            null,
            {
              id: 123,
              x: 'bad',
              y: 'bad',
              width: -1,
              height: 0,
              hp: 'bad',
              maxHp: 'bad',
              fracture: 'bad',
              state: 'invalid',
            },
            {
              id: 'crystal-x',
              x: 12,
              y: 34,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 2,
              fracture: 0,
              state: 'fractured',
            },
            {
              id: 'crystal-y',
              x: 20,
              y: 40,
              width: 24,
              height: 14,
              hp: 0,
              maxHp: 1,
              fracture: 1,
              state: 'shattered',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.status).toBe('ready');
    expect(storageValue.current.CRYS1.input.keyboard).toEqual({});
    expect(storageValue.current.CRYS1.input.gamepad.buttons).toEqual([
      false,
      false,
    ]);
    expect(storageValue.current.CRYS1.input.gamepad.axes).toEqual([0]);
    expect(storageValue.current.CRYS1.crystals).toHaveLength(3);
    expect(storageValue.current.CRYS1.crystals[0].state).toBe('whole');
    expect(storageValue.current.CRYS1.crystals[1].state).toBe('whole');
    expect(storageValue.current.CRYS1.crystals[2].state).toBe('fractured');
  });

  it('normalizes missing crystal state and keyboard input paths', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 2,
          status: 'ready',
          score: 0,
          lives: 3,
          combo: 0,
          input: {
            keyboard: null,
            gamepad: null,
            actions: null,
            previousActions: null,
          },
          paddle: null,
          orb: null,
          crystals: [
            {
              id: 'crystal-a',
              x: 10,
              y: 10,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 2,
              fracture: 0,
              state: 'bad',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'a' }), storageValue);

    expect(storageValue.current.CRYS1.input.keyboard).toEqual({ a: true });
    expect(storageValue.current.CRYS1.crystals[0].state).toBe('whole');
  });

  it('normalizes a partial orb back to the default position and speed', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 2,
          status: 'ready',
          score: 0,
          lives: 3,
          combo: 0,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: null,
            previousActions: null,
          },
          paddle: null,
          orb: {
            x: 'bad',
            y: null,
            vx: 0,
            vy: 0,
            radius: 'bad',
            stuckToPaddle: false,
          },
          crystals: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.orb.x).toBe(180);
    expect(storageValue.current.CRYS1.orb.y).toBe(200);
  });

  it('falls back to default crystals when the persisted list is empty', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          combo: 0,
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
          paddle: { x: 40, y: 114, width: 48, height: 6, speed: 4 },
          orb: {
            x: 60,
            y: 103,
            vx: 0,
            vy: -2,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: null,
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.crystals).toHaveLength(15);
  });
});

describe('crystalBreaker branch coverage', () => {
  it('covers reset, keyup, top-edge, paddle, and whole-crystal branches', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 2,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 40, y: 36, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'crystal-1',
              x: 32,
              y: 32,
              width: 24,
              height: 14,
              hp: 2,
              maxHp: 2,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keyup', key: 'r' }), storageValue);
    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);
    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.CRYS1.status).toBe('ready');
    expect(next.storageValue.current.CRYS1.lives).toBe(3);
    expect(next.storageValue.current.CRYS1.orb.vy).toBe(-2.4);
    expect(next.storageValue.current.CRYS1.crystals[0].state).toBe('whole');
  });

  it('bounces from the top edge and keeps the orb in play', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 2,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          paddle: { x: 40, y: 114, width: 48, height: 6, speed: 4 },
          orb: { x: 60, y: 1, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'crystal-1',
              x: 100,
              y: 100,
              width: 24,
              height: 14,
              hp: 2,
              maxHp: 2,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.CRYS1.orb.vy).toBeGreaterThan(0);
    expect(next.storageValue.current.CRYS1.status).toBe('running');
  });

  it('resets on a fresh reset keydown and rebuilds the seed state', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 8,
          status: 'running',
          score: 12,
          lives: 1,
          combo: 3,
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
          paddle: { x: 40, y: 114, width: 48, height: 6, speed: 4 },
          orb: {
            x: 60,
            y: 103,
            vx: 0,
            vy: -2,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: [
            {
              id: 'shattered',
              x: 0,
              y: 0,
              width: 24,
              height: 14,
              hp: 0,
              maxHp: 1,
              fracture: 1,
              state: 'shattered',
            },
            {
              id: 'whole',
              x: 20,
              y: 20,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);

    expect(storageValue.current.CRYS1.frame).toBe(0);
    expect(storageValue.current.CRYS1.status).toBe('ready');
    expect(storageValue.current.CRYS1.score).toBe(0);
    expect(storageValue.current.CRYS1.lives).toBe(1);
    expect(
      storageValue.current.CRYS1.crystals.every(
        crystal => crystal.state !== 'shattered'
      )
    ).toBe(true);
    expect(storageValue.current.CRYS1.input.actions.resetPressed).toBe(true);
  });
});

describe('crystalBreaker replay behavior', () => {
  it('toggles pause and resumes from ready and running states', () => {
    const readyStorage = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 1,
          status: 'ready',
          score: 0,
          lives: 3,
          combo: 0,
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
          paddle: { x: 40, y: 114, width: 48, height: 6, speed: 4 },
          orb: {
            x: 60,
            y: 103,
            vx: 0,
            vy: -2,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: [
            {
              id: 'crystal-1',
              x: 20,
              y: 20,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };
    runToy(JSON.stringify({ type: 'keydown', key: 'p' }), readyStorage);
    expect(readyStorage.current.CRYS1.status).toBe('running');

    const runningStorage = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 1,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          paddle: { x: 40, y: 114, width: 48, height: 6, speed: 4 },
          orb: {
            x: 60,
            y: 103,
            vx: 0,
            vy: -2,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: [
            {
              id: 'crystal-1',
              x: 20,
              y: 20,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };
    runToy(JSON.stringify({ type: 'keydown', key: 'p' }), runningStorage);
    expect(runningStorage.current.CRYS1.status).toBe('paused');

    const lostStorage = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 1,
          status: 'lost',
          score: 0,
          lives: 0,
          combo: 0,
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
          paddle: { x: 40, y: 114, width: 48, height: 6, speed: 4 },
          orb: {
            x: 60,
            y: 103,
            vx: 0,
            vy: -2,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: [
            {
              id: 'crystal-1',
              x: 20,
              y: 20,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };
    runToy(JSON.stringify({ type: 'keydown', key: 'p' }), lostStorage);
    expect(lostStorage.current.CRYS1.status).toBe('lost');
  });
});

describe('crystalBreaker life loss', () => {
  it('loses the last life and keeps a lost state after the orb falls below the board', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 1,
          combo: 2,
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
          orb: {
            x: 60,
            y: 146,
            vx: 0,
            vy: 10,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: [
            {
              id: 'crystal-1',
              x: 32,
              y: 32,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.status).toBe('lost');
    expect(storageValue.current.CRYS1.lives).toBe(0);
    expect(storageValue.current.CRYS1.orb.stuckToPaddle).toBe(true);
  });
});

describe('crystalBreaker final outcomes', () => {
  it('wins after the last crystal shatters', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 40, y: 36, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'crystal-1',
              x: 32,
              y: 32,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.status).toBe('won');
    expect(storageValue.current.CRYS1.score).toBe(10);
  });
});

describe('crystalBreaker remaining branches', () => {
  it('covers the remaining crystal input and collision branches', () => {
    const resetStorage = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 8,
          status: 'running',
          score: 12,
          lives: 1,
          combo: 3,
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
          paddle: { x: 40, y: 114, width: 48, height: 6, speed: 4 },
          orb: {
            x: 60,
            y: 103,
            vx: 0,
            vy: -2,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: [
            {
              id: 'shattered',
              x: 0,
              y: 0,
              width: 24,
              height: 14,
              hp: 0,
              maxHp: 1,
              fracture: 1,
              state: 'shattered',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), resetStorage);

    expect(resetStorage.current.CRYS1.status).toBe('ready');
    expect(resetStorage.current.CRYS1.input.actions.resetPressed).toBe(true);

    const pauseResumeStorage = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 1,
          status: 'paused',
          score: 0,
          lives: 3,
          combo: 0,
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
          paddle: { x: 40, y: 114, width: 48, height: 6, speed: 4 },
          orb: {
            x: 60,
            y: 10,
            vx: 0,
            vy: 2,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: [
            {
              id: 'crystal-1',
              x: 20,
              y: 20,
              width: 24,
              height: 14,
              hp: 2,
              maxHp: 2,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'p' }), pauseResumeStorage);
    expect(pauseResumeStorage.current.CRYS1.status).toBe('running');

    const collisionStorage = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          orb: { x: 40, y: 3, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'crystal-1',
              x: 32,
              y: 32,
              width: 24,
              height: 14,
              hp: 2,
              maxHp: 2,
              fracture: 0,
              state: 'whole',
            },
            {
              id: 'crystal-2',
              x: 20,
              y: 20,
              width: 24,
              height: 14,
              hp: 2,
              maxHp: 2,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    const collisionNext = runToy('{}', collisionStorage);

    expect(collisionNext.storageValue.current.CRYS1.orb.vy).toBeGreaterThan(0);
    expect(collisionNext.storageValue.current.CRYS1.crystals[0].state).toBe(
      'whole'
    );
  });
});
