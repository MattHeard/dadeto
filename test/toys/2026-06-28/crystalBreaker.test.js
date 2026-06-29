import { describe, expect, it, jest } from '@jest/globals';
import {
  crystalBreaker,
  getCrystalFill,
  resetOrbAfterLoss,
} from '../../../src/core/browser/toys/2026-06-28/crystalBreaker.js';

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
  });

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
