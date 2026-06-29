import { describe, expect, it, jest } from '@jest/globals';
import {
  advanceCellCooldowns,
  applyGameplayInput,
  batteryBreakout,
  buildNextState,
  reflectOrb,
  resolveCells,
  resolvePaddle,
  shufflePositions,
  updateInputState,
} from '../../../src/core/browser/toys/2026-06-28/batteryBreakout.js';

/**
 * Runs the battery breakout toy with a mocked storage accessor.
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
  const payload = JSON.parse(batteryBreakout(input, env));
  return { payload, storageValue, setLocalPermanentData };
}

describe('batteryBreakout', () => {
  it('renders an initial scene and persists state under BATT4', () => {
    const { payload, storageValue } = runToy(
      JSON.stringify({ width: 240, height: 160 })
    );
    expect(payload.width).toBe(240);
    expect(payload.height).toBe(160);
    expect(payload.shapes.some(shape => shape.type === 'circle')).toBe(true);
    expect(
      payload.shapes.some(
        shape => shape.type === 'rect' && shape.x === 186 && shape.y === 18
      )
    ).toBe(false);
    expect(storageValue.current.BATT4.version).toBe(1);
  });

  it('uses the fallback seed when shuffling with a falsey seed', () => {
    expect(shufflePositions(['a', 'b', 'c'], 0)).toEqual(['c', 'b', 'a']);
  });

  it('merges reset state when persisted data is missing', () => {
    const next = buildNextState(null, { reset: true });

    expect(next.status).toBe('ready');
    expect(next.lives).toBeGreaterThan(0);
  });

  it('merges reset state when persisted data exists', () => {
    const next = buildNextState(
      {
        version: 1,
        width: 120,
        height: 100,
        frame: 3,
        status: 'running',
        score: 4,
        lives: 2,
        faults: 1,
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
        paddle: { x: 10, y: 20, width: 30, height: 6, speed: 4 },
        orb: { x: 20, y: 20, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
        cells: [],
      },
      { reset: true }
    );

    expect(next.width).toBe(120);
    expect(next.height).toBe(100);
  });

  it('creates a reset state when no persisted state exists', () => {
    const next = buildNextState(null, { type: 'keydown', key: 'r' });

    expect(next.status).toBe('ready');
    expect(next.lives).toBeGreaterThan(0);
  });

  it('uses the reset layout seed fallback when persisted layout seed is missing', () => {
    const next = buildNextState(
      {
        version: 1,
        width: 120,
        height: 100,
        frame: 3,
        status: 'running',
        score: 4,
        lives: 2,
        faults: 1,
        // layoutSeed intentionally omitted to exercise the fallback path.
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
        paddle: { x: 10, y: 20, width: 30, height: 6, speed: 4 },
        orb: { x: 20, y: 20, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
        cells: [],
      },
      { type: 'keydown', key: 'r' }
    );

    expect(next.width).toBe(120);
  });

  it('uses keyboard fallback state when previous input is missing', () => {
    const next = updateInputState(undefined, { type: 'keydown', key: 'a' });

    expect(next.keyboard.a).toBe(true);
  });

  it('switches from paused back to running on a pause press', () => {
    const state = { status: 'paused', orb: { stuckToPaddle: false }, paddle: { x: 0, y: 0, width: 0, height: 0, speed: 0 } };
    applyGameplayInput(state, {
      actions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: true, resetPressed: false },
      previousActions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false },
    });

    expect(state.status).toBe('running');
  });

  it('pauses from a running state on a pause press', () => {
    const state = {
      status: 'running',
      orb: { stuckToPaddle: false },
      paddle: { x: 0, y: 0, width: 0, height: 0, speed: 0 },
    };
    applyGameplayInput(state, {
      actions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: true, resetPressed: false },
      previousActions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false },
    });

    expect(state.status).toBe('paused');
  });

  it('ignores pause presses from non-running states', () => {
    const state = {
      status: 'won',
      orb: { stuckToPaddle: false },
      paddle: { x: 0, y: 0, width: 0, height: 0, speed: 0 },
    };
    applyGameplayInput(state, {
      actions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: true, resetPressed: false },
      previousActions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false },
    });

    expect(state.status).toBe('won');
  });

  it('uses the fallback paddle width when the paddle is zero-width', () => {
    const state = {
      paddle: { x: 10, y: 20, width: 0, height: 6, speed: 4 },
      orb: { x: 10, y: 24, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
    };

    resolvePaddle(state);

    expect(state.orb.vx).toBe(1);
  });

  it('falls back to the default paddle bounce speed when the centered hit clamps to zero', () => {
    const state = {
      paddle: { x: 10, y: 20, width: 20, height: 6, speed: 4 },
      orb: { x: 20, y: 24, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
    };

    resolvePaddle(state);

    expect(state.orb.vx).toBe(1);
  });

  it('continues when a cell is already overcharged', () => {
    const state = {
      orb: { x: 10, y: 10, vx: 1, vy: 1, radius: 4 },
      cells: [
        {
          id: 'cell-1',
          x: 6,
          y: 6,
          width: 8,
          height: 8,
          charge: 4,
          targetCharge: 2,
          maxCharge: 3,
          overchargeCooldown: 0,
          state: 'overcharged',
        },
      ],
      score: 0,
      faults: 0,
    };

    resolveCells(state, new Set());

    expect(state.cells[0].charge).toBeGreaterThanOrEqual(4);
  });

  it('marks an overcharged hit as overcharged and increments faults', () => {
    const state = {
      orb: { x: 10, y: 10, vx: 1, vy: 1, radius: 4 },
      cells: [
        {
          id: 'cell-1',
          x: 6,
          y: 6,
          width: 8,
          height: 8,
          charge: 3,
          targetCharge: 2,
          maxCharge: 3,
          overchargeCooldown: 0,
          state: 'charging',
        },
      ],
      score: 0,
      faults: 0,
    };

    resolveCells(state, new Set());

    expect(state.cells[0].state).toBe('overcharged');
    expect(state.faults).toBe(1);
  });

  it('reflects from the center of a cell on the x axis', () => {
    const orb = { x: 10, y: 10, vx: 1, vy: 1, radius: 4 };
    const cell = { x: 8, y: 0, width: 4, height: 20 };

    reflectOrb({ orb }, cell);

    expect(orb.x).toBeGreaterThan(cell.x + cell.width / 2);
  });

  it('advances cooldowns for overcharged cells', () => {
    const state = {
      cells: [
        { state: 'overcharged', overchargeCooldown: 1, charge: 5, targetCharge: 2 },
      ],
    };

    advanceCellCooldowns(state);

    expect(state.cells[0].state).toBe('charging');
  });

  it('falls back when no storage accessor is available', () => {
    const payload = JSON.parse(
      batteryBreakout(JSON.stringify({ width: 240, height: 160 }), {})
    );

    expect(payload.width).toBe(240);
    expect(payload.shapes.some(shape => shape.type === 'circle')).toBe(true);
  });

  it('keeps the seeded layout stable when the layout seed is zero', () => {
    const { storageValue } = runToy(
      JSON.stringify({ width: 240, height: 160, layoutSeed: 0 })
    );

    expect(storageValue.current.BATT4.cells).toHaveLength(9);
  });

  it('falls back when storage access is unavailable', () => {
    const payload = JSON.parse(batteryBreakout('{}', new Map()));

    expect(payload.width).toBeGreaterThan(0);
    expect(payload.shapes.some(shape => shape.type === 'circle')).toBe(true);
  });

  it('parses invalid input as null and keeps the seed state', () => {
    const { storageValue } = runToy('   ');

    expect(storageValue.current.BATT4.width).toBe(360);
    expect(storageValue.current.BATT4.status).toBe('ready');
  });

  it('launches on space and keeps launch edge-triggered', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'Space' }), storageValue);
    const second = runToy('{}', storageValue);
    expect(second.storageValue.current.BATT4.status).toBe('running');
    expect(second.storageValue.current.BATT4.orb.stuckToPaddle).toBe(false);
  });

  it('moves paddle with held input', () => {
    const storageValue = { current: null };
    runToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowRight' }),
      storageValue
    );
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.BATT4.paddle.x).toBeGreaterThan(100);
  });

  it('derives movement from axes in both directions', () => {
    const leftStorage = { current: null };
    runToy(JSON.stringify({ axes: [-1] }), leftStorage);
    const left = runToy('{}', leftStorage);

    const rightStorage = { current: null };
    runToy(JSON.stringify({ axes: [1] }), rightStorage);
    const right = runToy('{}', rightStorage);

    expect(left.storageValue.current.BATT4.paddle.x).toBeLessThan(160);
    expect(right.storageValue.current.BATT4.paddle.x).toBeGreaterThan(160);
  });

  it('handles key releases and capture snapshots', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'ArrowLeft' }), storageValue);
    runToy(JSON.stringify({ type: 'keyup', key: 'ArrowLeft' }), storageValue);
    const capture = runToy(
      JSON.stringify({
        type: 'capture',
        capturing: false,
      }),
      storageValue
    );
    const snapshot = runToy(
      JSON.stringify({
        buttons: [true, false, 'x'],
        axes: [1, 'bad'],
        buttonIndex: 1,
        pressed: true,
      }),
      storageValue
    );

    expect(capture.storageValue.current.BATT4.input.keyboard.ArrowLeft).toBe(
      false
    );
    expect(snapshot.storageValue.current.BATT4.input.gamepad.buttons).toEqual([
      true,
      true,
      false,
    ]);
    expect(snapshot.storageValue.current.BATT4.input.gamepad.axes).toEqual([
      1, 0,
    ]);
  });

  it('accepts custom orb speeds from input', () => {
    const { storageValue } = runToy(
      JSON.stringify({ orbSpeedX: 2, orbSpeedY: -1 })
    );

    expect(storageValue.current.BATT4.orb.vx).toBe(2);
    expect(storageValue.current.BATT4.orb.vy).toBe(-1);
  });

  it('updates the captured gamepad buttons by index', () => {
    const storageValue = { current: null };
    runToy(
      JSON.stringify({
        buttons: [false, false, true],
        buttonIndex: 1,
        pressed: true,
      }),
      storageValue
    );

    expect(storageValue.current.BATT4.input.gamepad.buttons).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('resets from persisted state on the first reset press', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 5,
          status: 'running',
          score: 7,
          lives: 2,
          faults: 1,
          layoutSeed: 4,
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
          orb: { x: 80, y: 70, vx: 1, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-a',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'charging',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);

    expect(storageValue.current.BATT4.status).toBe('ready');
  });

  it('returns early from simulation when the orb is stuck to the paddle', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 5,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 90, y: 90, vx: 0, vy: 3, radius: 4, stuckToPaddle: true },
          cells: [
            {
              id: 'cell-a',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'charging',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.frame).toBe(6);
    expect(storageValue.current.BATT4.orb.y).toBeGreaterThan(90);
  });

  it('reflects from the side of a cell when the horizontal overlap is smaller', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 53, y: 37, vx: -3, vy: 1, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-a',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'charging',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.orb.vx).toBeGreaterThan(0);
    expect(storageValue.current.BATT4.cells[0].charge).toBe(1);
  });

  it('reflects from the top of a cell when the vertical overlap is smaller', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 44, y: 36, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-a',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'charging',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.orb.vy).toBeLessThan(0);
  });

  it('falls back through the normalization branches for malformed state', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 'x',
          height: null,
          frame: -1,
          status: 'broken',
          score: 'x',
          lives: 'x',
          faults: 'x',
          input: {
            keyboard: null,
            gamepad: null,
            actions: null,
            previousActions: null,
          },
          paddle: null,
          orb: null,
          cells: [
            {
              id: 'cell-a',
              x: 1,
              y: 1,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'invalid',
            },
            {
              id: 'cell-b',
              x: 2,
              y: 2,
              width: 24,
              height: 10,
              charge: 1,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'invalid',
            },
            {
              id: 'cell-c',
              x: 3,
              y: 3,
              width: 24,
              height: 10,
              charge: 2,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'invalid',
            },
            {
              id: 'cell-d',
              x: 4,
              y: 4,
              width: 24,
              height: 10,
              charge: 4,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'invalid',
            },
            {
              id: 'cell-e',
              x: 5,
              y: 5,
              width: 24,
              height: 10,
              charge: 1,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 1,
              state: 'invalid',
            },
          ],
        },
      },
    };

    runToy('not json', storageValue);

    expect(storageValue.current.BATT4.width).toBe(360);
    expect(storageValue.current.BATT4.height).toBe(240);
    expect(storageValue.current.BATT4.status).toBe('ready');
    expect(storageValue.current.BATT4.input.keyboard).toEqual({});
    expect(storageValue.current.BATT4.input.gamepad.buttons).toEqual([]);
    expect(storageValue.current.BATT4.input.actions.moveLeft).toBe(false);
    expect(storageValue.current.BATT4.paddle.width).toBe(48);
    expect(storageValue.current.BATT4.orb.radius).toBe(4);
    expect(storageValue.current.BATT4.cells).toHaveLength(5);
  });

  it('falls back to the default cell layout when persisted cells are empty', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 90, y: 90, vx: 0, vy: 0, radius: 4, stuckToPaddle: true },
          cells: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.cells).toHaveLength(9);
  });

  it('toggles pause on successive pause presses', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 90, y: 90, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'p' }), storageValue);
    const paused = runToy('{}', storageValue);

    expect(paused.storageValue.current.BATT4.status).toBe('paused');

    runToy(JSON.stringify({ type: 'keyup', key: 'p' }), storageValue);
    runToy(JSON.stringify({ type: 'keydown', key: 'p' }), storageValue);
    const resumed = runToy('{}', storageValue);

    expect(resumed.storageValue.current.BATT4.status).toBe('running');
  });

  it('bounces from the right wall and from the paddle face', () => {
    const wallStorage = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 177, y: 40, vx: 3, vy: -1, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    const paddleStorage = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 78, y: 110, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    const wallNext = runToy('{}', wallStorage);
    const paddleNext = runToy('{}', paddleStorage);

    expect(wallNext.storageValue.current.BATT4.orb.x).toBeLessThan(180);
    expect(wallNext.storageValue.current.BATT4.orb.vx).toBeLessThan(0);
    expect(paddleNext.storageValue.current.BATT4.orb.vy).toBeLessThan(0);
    expect(paddleNext.storageValue.current.BATT4.orb.vx).not.toBe(0);
  });

  it('covers the remaining battery collision and reset branches', () => {
    const chargingStorage = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 3,
              maxCharge: 5,
              state: 'empty',
            },
          ],
        },
      },
    };

    const overchargedStorage = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 1,
              targetCharge: 3,
              maxCharge: 3,
              overchargeCooldown: 2,
              state: 'overcharged',
            },
          ],
        },
      },
    };

    const horizontalCellStorage = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 54, y: 36, vx: 3, vy: 0, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 3,
              maxCharge: 5,
              state: 'empty',
            },
          ],
        },
      },
    };

    const resetStorage = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 2,
          faults: 0,
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
          orb: { x: 60, y: 139, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    runToy('{}', chargingStorage);
    runToy('{}', overchargedStorage);
    runToy('{}', horizontalCellStorage);
    runToy('{}', resetStorage);

    expect(chargingStorage.current.BATT4.cells[0].state).toBe('charging');
    expect(overchargedStorage.current.BATT4.cells[0].charge).toBe(4);
    expect(overchargedStorage.current.BATT4.cells[0].overchargeCooldown).toBe(
      120
    );
    expect(horizontalCellStorage.current.BATT4.cells[0].state).toBe('charging');
    expect(horizontalCellStorage.current.BATT4.orb.vx).toBeLessThan(0);
    expect(resetStorage.current.BATT4.status).toBe('ready');
    expect(resetStorage.current.BATT4.orb.stuckToPaddle).toBe(true);
  });

  it('uses a staggered default cell layout', () => {
    const { storageValue } = runToy(
      JSON.stringify({ width: 240, height: 160 })
    );
    const cells = storageValue.current.BATT4.cells;
    expect(cells).toHaveLength(9);
    expect(new Set(cells.map(cell => `${cell.x},${cell.y}`)).size).toBe(9);
    expect(new Set(cells.map(cell => cell.y)).size).toBeGreaterThan(1);
  });

  it('repeats the same layout for the same seed and changes after reset', () => {
    const storageValue = { current: null };
    const first = runToy(
      JSON.stringify({ width: 240, height: 160, layoutSeed: 7 }),
      storageValue
    );
    const firstLayout = first.storageValue.current.BATT4.cells.map(
      cell => `${cell.x},${cell.y}`
    );
    const second = runToy(
      JSON.stringify({ width: 240, height: 160, layoutSeed: 7 }),
      storageValue
    );
    const secondLayout = second.storageValue.current.BATT4.cells.map(
      cell => `${cell.x},${cell.y}`
    );
    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);
    const resetLayout = storageValue.current.BATT4.cells.map(
      cell => `${cell.x},${cell.y}`
    );

    expect(firstLayout).toEqual(secondLayout);
    expect(resetLayout).not.toEqual(firstLayout);
  });

  it('resets to a fresh state on r', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 8,
          status: 'running',
          score: 2,
          lives: 1,
          faults: 2,
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
          paddle: { x: 10, y: 114, width: 48, height: 6, speed: 4 },
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 3,
              targetCharge: 2,
              maxCharge: 3,
              state: 'overcharged',
            },
          ],
        },
      },
    };

    const next = runToy(
      JSON.stringify({ type: 'keydown', key: 'r' }),
      storageValue
    );

    expect(next.storageValue.current.BATT4.status).toBe('ready');
    expect(next.storageValue.current.BATT4.score).toBe(0);
    expect(next.storageValue.current.BATT4.lives).toBe(3);
    expect(next.storageValue.current.BATT4.faults).toBe(0);
    expect(next.storageValue.current.BATT4.orb.stuckToPaddle).toBe(true);
  });

  it('charges a cell and eventually stabilizes it', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 1,
              targetCharge: 2,
              maxCharge: 3,
              state: 'charging',
            },
          ],
        },
      },
    };
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.BATT4.cells[0].charge).toBe(2);
    expect(next.storageValue.current.BATT4.cells[0].state).toBe('stable');
  });

  it('keeps stable cells solid after they reach target charge', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 1,
          lives: 3,
          faults: 0,
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
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 2,
              targetCharge: 2,
              maxCharge: 3,
              state: 'stable',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.BATT4.cells[0].state).toBe('stable');
    expect(next.storageValue.current.BATT4.orb.x).not.toBe(44);
  });

  it('normalizes missing gamepad buttons and zeroed orb coordinates', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          faults: 0,
          layoutSeed: 0,
          input: {
            keyboard: {},
            gamepad: { axes: [0.5] },
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
          paddle: { x: -1, y: 120, width: 48, height: 6, speed: 4 },
          orb: { x: 0, y: 0, vx: 0, vy: 3, radius: 4, stuckToPaddle: true },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'empty',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.input.gamepad.buttons).toEqual([]);
    expect(storageValue.current.BATT4.paddle.x).toBe(132);
    expect(storageValue.current.BATT4.orb.x).toBe(156);
    expect(storageValue.current.BATT4.orb.y).toBe(111);
  });

  it('normalizes missing gamepad axes back to an empty list', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          faults: 0,
          input: {
            keyboard: {},
            gamepad: { buttons: [true, false] },
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
          paddle: { x: 60, y: 120, width: 48, height: 6, speed: 4 },
          orb: { x: 90, y: 90, vx: 0, vy: 0, radius: 4, stuckToPaddle: true },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'empty',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.input.gamepad.axes).toEqual([]);
  });

  it('normalizes empty actions and previous actions back to false flags', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          faults: 0,
          layoutSeed: 2,
          input: {
            keyboard: {},
            gamepad: { buttons: [true], axes: [] },
            actions: null,
            previousActions: null,
          },
          paddle: { x: 90, y: 114, width: 48, height: 6, speed: 4 },
          orb: { x: 90, y: 90, vx: 0, vy: 0, radius: 4, stuckToPaddle: true },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'empty',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.input.actions.moveLeft).toBe(false);
    expect(storageValue.current.BATT4.input.previousActions.moveRight).toBe(
      false
    );
  });

  it('resets to a new seeded layout on r', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
          layoutSeed: 4,
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
          orb: { x: 90, y: 90, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);

    expect(storageValue.current.BATT4.status).toBe('ready');
    expect(storageValue.current.BATT4.orb.stuckToPaddle).toBe(true);
  });

  it('resets from persisted state and increments the layout seed', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 8,
          status: 'running',
          score: 3,
          lives: 2,
          faults: 1,
          layoutSeed: 7,
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
          orb: { x: 60, y: 103, vx: 0, vy: -2, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'empty',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);

    expect(storageValue.current.BATT4.status).toBe('ready');
    expect(storageValue.current.BATT4.cells).toHaveLength(9);
    expect(storageValue.current.BATT4.orb.stuckToPaddle).toBe(true);
  });

  it('can push a stable cell into overcharged on a later hit', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 1,
          lives: 3,
          faults: 0,
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
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 3,
              targetCharge: 2,
              maxCharge: 3,
              state: 'stable',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.BATT4.cells[0].state).toBe('overcharged');
    expect(next.storageValue.current.BATT4.faults).toBe(1);
  });

  it('cools down an overcharged cell back to charging', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 1,
          lives: 3,
          faults: 1,
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
          orb: { x: 120, y: 90, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 4,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 1,
              state: 'overcharged',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.BATT4.cells[0].state).toBe('charging');
    expect(next.storageValue.current.BATT4.cells[0].charge).toBe(2);
  });

  it('overcharges and can lose after too many faults', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 4,
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
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 3,
              targetCharge: 4,
              maxCharge: 3,
              state: 'charging',
            },
          ],
        },
      },
    };
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.BATT4.status).toBe('lost');
  });

  it('bounces off walls and the paddle', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
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
          orb: { x: 4, y: 4, vx: -3, vy: -3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.BATT4.orb.vx).toBeGreaterThan(0);
    expect(next.storageValue.current.BATT4.orb.vy).toBeGreaterThan(0);
  });

  it('normalizes malformed stored values back to defaults', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 'bad',
          height: null,
          frame: 'bad',
          status: 'bad',
          score: 'bad',
          lives: 'bad',
          faults: 'bad',
          input: {
            keyboard: null,
            gamepad: null,
            actions: null,
            previousActions: null,
          },
          paddle: null,
          orb: null,
          cells: [
            null,
            {},
            {
              id: 12,
              x: 'bad',
              y: 'bad',
              width: -1,
              height: 0,
              charge: 'bad',
              targetCharge: 'bad',
              maxCharge: 'bad',
              overchargeCooldown: 'bad',
              state: 'bad',
            },
            {
              x: 30,
              y: 20,
              width: 24,
              height: 12,
              charge: 1,
              targetCharge: 3,
              maxCharge: 4,
              overchargeCooldown: 0,
              state: 'bad',
            },
            {
              x: 40,
              y: 30,
              width: 24,
              height: 12,
              charge: 3,
              targetCharge: 2,
              maxCharge: 5,
              overchargeCooldown: 0,
              state: 'bad',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.width).toBe(360);
    expect(storageValue.current.BATT4.height).toBe(240);
    expect(storageValue.current.BATT4.frame).toBeGreaterThan(0);
    expect(storageValue.current.BATT4.status).toBe('ready');
    expect(storageValue.current.BATT4.score).toBe(0);
    expect(storageValue.current.BATT4.lives).toBe(3);
    expect(storageValue.current.BATT4.faults).toBe(0);
    expect(storageValue.current.BATT4.cells.map(cell => cell.state)).toEqual([
      'empty',
      'empty',
      'charging',
      'stable',
    ]);
  });

  it('normalizes structured persisted gamepad and paddle data', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          faults: 0,
          layoutSeed: 2,
          input: {
            keyboard: { ArrowLeft: true, ArrowRight: false },
            gamepad: { buttons: [true, false], axes: [1, '0'] },
            actions: {
              moveLeft: true,
              moveRight: false,
              launchPressed: true,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              moveLeft: false,
              moveRight: true,
              launchPressed: false,
              pausePressed: true,
              resetPressed: false,
            },
          },
          paddle: { x: 15, y: 120, width: 50, height: 7, speed: 5 },
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: true },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'empty',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.input.gamepad.buttons).toEqual([
      true,
      false,
    ]);
    expect(storageValue.current.BATT4.input.gamepad.axes).toEqual([1, 0]);
    expect(storageValue.current.BATT4.input.actions.moveLeft).toBe(true);
    expect(storageValue.current.BATT4.paddle.width).toBe(50);
    expect(storageValue.current.BATT4.orb.radius).toBe(4);
    expect(storageValue.current.BATT4.cells).toHaveLength(1);
  });

  it('loses a life when the orb falls below the paddle lane', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 1,
          faults: 0,
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
          orb: { x: 60, y: 139, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.BATT4.status).toBe('lost');
    expect(next.storageValue.current.BATT4.lives).toBeLessThanOrEqual(0);
  });
});
