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
  batteryBreakoutTestOnly,
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
});

describe('batteryBreakout reset state', () => {
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
});

describe('batteryBreakout input and lifecycle', () => {
  it('uses keyboard fallback state when previous input is missing', () => {
    const next = updateInputState(undefined, { type: 'keydown', key: 'a' });

    expect(next.keyboard.a).toBe(true);
  });

  it('switches from paused back to running on a pause press', () => {
    const state = {
      status: 'paused',
      orb: { stuckToPaddle: false },
      paddle: { x: 0, y: 0, width: 0, height: 0, speed: 0 },
    };
    applyGameplayInput(state, {
      actions: {
        moveLeft: false,
        moveRight: false,
        launchPressed: false,
        pausePressed: true,
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

    expect(state.status).toBe('running');
  });

  it('pauses from a running state on a pause press', () => {
    const state = {
      status: 'running',
      orb: { stuckToPaddle: false },
      paddle: { x: 0, y: 0, width: 0, height: 0, speed: 0 },
    };
    applyGameplayInput(state, {
      actions: {
        moveLeft: false,
        moveRight: false,
        launchPressed: false,
        pausePressed: true,
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

    expect(state.status).toBe('paused');
  });

  it('ignores pause presses from non-running states', () => {
    const state = {
      status: 'won',
      orb: { stuckToPaddle: false },
      paddle: { x: 0, y: 0, width: 0, height: 0, speed: 0 },
    };
    applyGameplayInput(state, {
      actions: {
        moveLeft: false,
        moveRight: false,
        launchPressed: false,
        pausePressed: true,
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

    expect(state.status).toBe('won');
  });
});

describe('batteryBreakout collision helpers', () => {
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
        {
          state: 'overcharged',
          overchargeCooldown: 1,
          charge: 5,
          targetCharge: 2,
        },
      ],
    };

    advanceCellCooldowns(state);

    expect(state.cells[0].state).toBe('charging');
  });
});

describe('batteryBreakout input normalization', () => {
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
});

describe('batteryBreakout simulation', () => {
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
});

describe('batteryBreakout malformed state', () => {
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
});

describe('batteryBreakout pause and wall behavior', () => {
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
          orb: {
            x: 177,
            y: 40,
            vx: 3,
            vy: -1,
            radius: 4,
            stuckToPaddle: false,
          },
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
});

describe('batteryBreakout remaining collision branches', () => {
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
});

describe('batteryBreakout seeded layouts', () => {
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
});

describe('batteryBreakout persisted input normalization', () => {
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
});

describe('batteryBreakout seeded reset behavior', () => {
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
          orb: {
            x: 60,
            y: 103,
            vx: 0,
            vy: -2,
            radius: 4,
            stuckToPaddle: false,
          },
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
});

describe('batteryBreakout fault outcomes', () => {
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
});

describe('batteryBreakout final normalization', () => {
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

describe('batteryBreakout helper coverage', () => {
  it('covers pure normalization, input, geometry, collision, and presentation helpers', () => {
    const h = batteryBreakoutTestOnly;
    const seed = h.normalizeSeedValues({}, {});
    const state = h.createState({
      ...h.createSeedOptions(),
      width: 120,
      height: 90,
      cells: [],
    });
    expect(h.getStorageAccessor({ get: () => jest.fn() })).toEqual(
      expect.any(Function)
    );
    expect(h.getStorageAccessor(null)).toBeNull();
    expect(h.getStorageAccessor({ get: () => 1 })).toBeNull();
    expect(h.readPersistedState(null)).toBeNull();
    expect(h.readPersistedState(() => ({}))).toBeNull();
    expect(h.readPersistedState(() => null)).toBeNull();
    expect(h.readPersistedState(() => ({ BATT4: { version: 0 } }))).toBeNull();
    expect(h.parseInput('')).toBeNull();
    expect(h.parseInput(42)).toBeNull();
    expect(h.parseInput('null')).toBeNull();
    expect(h.parseInput('[]')).toBeNull();
    expect(h.parseInput(' { "lives": 2 } ')).toEqual({ lives: 2 });
    expect(h.parseInput('{"lives":2}')).toEqual({ lives: 2 });
    expect(h.parseObjectRecord('[]')).toBeNull();
    expect(h.parseObjectRecord('{bad')).toBeNull();
    expect(h.parseObjectRecord('0')).toBeNull();
    expect(h.parseObjectRecord('false')).toBeNull();
    expect(h.parseObjectRecord('"text"')).toBeNull();
    expect(h.parseObjectRecord('{}')).toEqual({});
    expect(h.createInitialInputState()).toEqual({
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
    });
    expect(h.buildResetSeedFallback(null)).toBeUndefined();
    expect(h.buildResetSeedFallback(state)).toMatchObject({
      width: state.width,
      height: state.height,
    });
    expect(h.buildMergedState(true, state, { marker: 'seed' })).toEqual({
      marker: 'seed',
    });
    expect(h.buildMergedState(false, state, state)).toMatchObject({
      width: state.width,
      cells: state.cells,
    });
    const resetCandidate = h.maybeBuildResetState(
      { ...state, layoutSeed: 4 },
      { width: 120, height: 80 },
      {
        actions: { resetPressed: true },
        previousActions: { resetPressed: false },
      }
    );
    expect(resetCandidate).toMatchObject({
      width: 120,
      height: 80,
      status: 'ready',
    });
    expect(resetCandidate.cells).not.toEqual(state.cells);
    const alternateReset = h.maybeBuildResetState(
      { ...state, layoutSeed: 5 },
      { width: 120, height: 80 },
      {
        actions: { resetPressed: true },
        previousActions: { resetPressed: false },
      }
    );
    expect(resetCandidate.cells).not.toEqual(alternateReset.cells);
    const seedThreeReset = h.maybeBuildResetState(
      { ...state, layoutSeed: 2 },
      { width: 120, height: 80 },
      {
        actions: { resetPressed: true },
        previousActions: { resetPressed: false },
      }
    );
    expect(resetCandidate.cells).not.toEqual(seedThreeReset.cells);
    expect(resetCandidate.cells.map(cell => cell.x)).toEqual([
      34, 58, 58, 58, 58, 58, 34, 44, 58,
    ]);
    expect(h.buildNextState(state, { reset: true })).toMatchObject({
      status: 'ready',
      frame: 1,
    });
    expect(
      h.buildNextState(state, { reset: true, width: 200, height: 100 })
    ).toMatchObject({ width: 200, height: 100 });
    expect(
      h.buildNextState(state, { reset: true, width: 200, height: 100 }).cells
        .length
    ).toBeGreaterThan(0);
    expect(h.buildNextState(null, { reset: true })).toMatchObject({
      status: 'ready',
    });
    const moving = {
      ...state,
      status: 'running',
      frame: 4,
      orb: { ...state.orb, stuckToPaddle: false, vx: 1, vy: 1 },
    };
    const movingX = moving.orb.x;
    expect(h.buildNextState(moving, {}).orb.x).toBeGreaterThan(movingX);
    const paused = {
      ...state,
      status: 'paused',
      orb: { ...state.orb, stuckToPaddle: false, vx: 1, vy: 1 },
    };
    const pausedX = paused.orb.x;
    expect(h.buildNextState(paused, {}).orb.x).toBe(pausedX);
    const advanced = h.buildNextState(
      { ...state, status: 'running', frame: 4 },
      {}
    );
    expect(advanced).toMatchObject({ status: 'running', frame: 5 });
    expect(advanced.cells).toEqual(state.cells);
    expect(h.mergeSeedAndState(state, state)).toMatchObject({
      width: state.width,
    });
    expect(h.createSeedState({}, null)).toMatchObject({ status: 'ready' });
    expect(seed.width).toBeGreaterThan(0);
    expect(h.normalizeStatus('paused')).toBe('paused');
    for (const status of ['ready', 'running', 'paused', 'won', 'lost']) {
      expect(h.normalizeStatus(status)).toBe(status);
    }
    expect(h.normalizeStatus('invalid')).toBe('ready');
    expect(h.normalizeState({ version: 0 })).toBeNull();
    expect(h.normalizeState(null)).toBeNull();
    expect(h.normalizeState([])).toBeNull();
    const stateArray = [];
    stateArray.version = 1;
    expect(h.normalizeState(stateArray)).toBeNull();
    expect(h.normalizeSeedLayoutSeed({}, { layoutSeed: 9 })).toBe(9);
    expect(
      h.normalizeSeedLayoutSeed({ layoutSeed: 4 }, { layoutSeed: 9 })
    ).toBe(4);
    expect(h.normalizeState({ version: 1 })).toMatchObject({
      version: 1,
      width: 360,
      height: 240,
      frame: 0,
      status: 'ready',
      score: 0,
      lives: 3,
      faults: 0,
    });
    expect(h.normalizeBooleanRecord({ x: true, y: 0 })).toEqual({
      x: true,
      y: false,
    });
    expect(h.normalizeBooleanRecord(null)).toEqual({});
    expect(h.normalizeBooleanRecord([])).toEqual({});
    const booleanArray = [];
    booleanArray.x = true;
    expect(h.normalizeBooleanRecord(booleanArray)).toEqual({});
    expect(h.normalizeActions([])).toMatchObject({
      moveLeft: false,
      resetPressed: false,
    });
    const actionsArray = [];
    actionsArray.moveLeft = true;
    expect(h.normalizeActions(actionsArray)).toMatchObject({
      moveLeft: false,
      resetPressed: false,
    });
    expect(h.normalizePaddle([])).toEqual(
      expect.objectContaining({ width: 48, height: 6 })
    );
    const paddleArray = [];
    paddleArray.x = 4;
    expect(h.normalizePaddle(paddleArray)).toEqual(
      expect.objectContaining({ width: 48, height: 6 })
    );
    expect(h.normalizeNonNegativeInteger(-1, 7)).toBe(7);
    expect(h.normalizeNonNegativeInteger(0, 7)).toBe(0);
    expect(h.normalizeGamepadButtons([true, 0])).toEqual([true, false]);
    expect(h.normalizeGamepadAxes([1, 'bad'])).toEqual([1, 0]);
    expect(
      h.normalizeActions({
        moveLeft: true,
        moveRight: true,
        launchPressed: true,
        pausePressed: true,
        resetPressed: true,
      })
    ).toEqual({
      moveLeft: true,
      moveRight: true,
      launchPressed: true,
      pausePressed: true,
      resetPressed: true,
    });
    expect(h.normalizeActions([])).toEqual({
      moveLeft: false,
      moveRight: false,
      launchPressed: false,
      pausePressed: false,
      resetPressed: false,
    });
    expect(
      h.normalizeInputState({
        keyboard: { a: true },
        gamepad: { buttons: [true], axes: [0.5] },
        actions: { moveLeft: true },
        previousActions: { resetPressed: true },
      })
    ).toEqual({
      keyboard: { a: true },
      gamepad: { buttons: [true], axes: [0.5] },
      actions: {
        moveLeft: true,
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
        resetPressed: true,
      },
    });
    expect(h.normalizeInputState(null)).toEqual({
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
    });
    expect(h.normalizeGamepadState([])).toEqual({ buttons: [], axes: [] });
    const gamepadArray = [];
    gamepadArray.buttons = [true];
    gamepadArray.axes = [1];
    expect(h.normalizeGamepadState(gamepadArray)).toEqual({
      buttons: [],
      axes: [],
    });
    expect(h.normalizeGamepadState([{ buttons: [true] }])).toEqual({
      buttons: [],
      axes: [],
    });
    expect(
      h.normalizeGamepadState({ buttons: [true, 0], axes: ['2', 'bad'] })
    ).toEqual({ buttons: [true, false], axes: [2, 0] });
    expect(
      h.normalizePaddle({ x: 4.4, y: -2, width: 20, height: 5, speed: 3 }, 90)
    ).toEqual({ x: 4, y: 72, width: 20, height: 5, speed: 3 });
    expect(h.normalizePaddle([], 90)).toEqual(
      h.createState(h.createSeedOptions()).paddle
    );
    expect(h.normalizePaddle([{ x: 4 }], 90)).toEqual(
      h.createState(h.createSeedOptions()).paddle
    );
    expect(h.normalizePaddle({ x: 'bad' }, 90).x).toBe(180);
    expect(
      h.normalizeOrb({
        x: 0,
        y: 0,
        vx: 2,
        vy: -3,
        radius: 5,
        stuckToPaddle: true,
      })
    ).toEqual({ x: 180, y: 0, vx: 2, vy: -3, radius: 5, stuckToPaddle: true });
    expect(h.normalizeOrb([])).toEqual(
      h.createState(h.createSeedOptions()).orb
    );
    const orbArray = [];
    orbArray.x = 4;
    expect(h.normalizeOrb(orbArray)).toEqual(
      h.createState(h.createSeedOptions()).orb
    );
    expect(h.normalizeOrb([{ x: 4 }])).toEqual(
      h.createState(h.createSeedOptions()).orb
    );
    expect(h.normalizeNumber('bad', 7)).toBe(7);
    expect(h.normalizeCellsFromState(null).length).toBeGreaterThan(0);
    expect(
      h.normalizeCellsFromState([
        {
          id: 'cell-x',
          x: 3,
          y: 4,
          width: 20,
          height: 8,
          charge: 1,
          targetCharge: 2,
          maxCharge: 3,
          overchargeCooldown: 0,
          state: 'charging',
        },
      ])
    ).toEqual([
      {
        id: 'cell-x',
        x: 3,
        y: 4,
        width: 20,
        height: 8,
        charge: 1,
        targetCharge: 2,
        maxCharge: 3,
        overchargeCooldown: 0,
        state: 'charging',
      },
    ]);
    expect(h.normalizeCellsFromState([null, 1, 'bad'])).toEqual([]);
    expect(h.getCellId({ id: 'x' }, 2)).toBe('cell-3');
    expect(h.getCellId({}, 2)).toBe('cell-3');
    expect(h.normalizeCellState({ id: 'x' }, 0)).toBe('empty');
    expect(
      h.normalizeCellState({
        value: 'stable',
        charge: 0,
        targetCharge: 2,
        maxCharge: 3,
        overchargeCooldown: 0,
      })
    ).toBe('stable');
    expect(
      h.normalizeCellState({
        value: 'empty',
        charge: 3,
        targetCharge: 2,
        maxCharge: 3,
        overchargeCooldown: 0,
      })
    ).toBe('empty');
    expect(
      h.normalizeCellState({
        value: 'charging',
        charge: 3,
        targetCharge: 2,
        maxCharge: 3,
        overchargeCooldown: 0,
      })
    ).toBe('charging');
    expect(
      h.normalizeCellState({
        value: 'overcharged',
        charge: 0,
        targetCharge: 2,
        maxCharge: 3,
        overchargeCooldown: 0,
      })
    ).toBe('overcharged');
    expect(
      h.normalizeCellState({
        value: 'bad',
        charge: 3,
        targetCharge: 2,
        maxCharge: 3,
        overchargeCooldown: 0,
      })
    ).toBe('stable');
    expect(
      h.normalizeCellState({
        value: 'bad',
        charge: 0,
        targetCharge: 2,
        maxCharge: 3,
        overchargeCooldown: 1,
      })
    ).toBe('overcharged');
    expect(
      h.normalizeCellState({
        value: 'bad',
        charge: 4,
        targetCharge: 2,
        maxCharge: 3,
        overchargeCooldown: 0,
      })
    ).toBe('overcharged');
    expect(
      h.normalizeCellState({
        value: 'bad',
        charge: 2,
        targetCharge: 2,
        maxCharge: 3,
        overchargeCooldown: 0,
      })
    ).toBe('stable');
    expect(
      h.normalizeCellState({
        value: 'bad',
        charge: 1,
        targetCharge: 2,
        maxCharge: 3,
        overchargeCooldown: 0,
      })
    ).toBe('charging');
    expect(h.normalizeCells(120, 90, 3).length).toBeGreaterThan(0);
    expect(h.normalizeCells(360, 240, 1).map(cell => cell.id)).toEqual([
      'cell-1-1',
      'cell-1-2',
      'cell-2-1',
      'cell-2-2',
      'cell-2-3',
      'cell-2-4',
      'cell-3-1',
      'cell-3-2',
      'cell-3-3',
    ]);
    expect(h.normalizeCells(360, 240, 1).map(cell => cell.state)).toEqual([
      'empty',
      'empty',
      'empty',
      'empty',
      'empty',
      'empty',
      'empty',
      'empty',
      'empty',
    ]);
    expect(h.buildCellPositions(360, 240, 28, 12)).toEqual([
      { x: 34, y: 32 },
      { x: 70, y: 34 },
      { x: 122, y: 34 },
      { x: 192, y: 32 },
      { x: 245, y: 34 },
      { x: 44, y: 50 },
      { x: 80, y: 52 },
      { x: 132, y: 52 },
      { x: 202, y: 50 },
      { x: 255, y: 52 },
      { x: 34, y: 68 },
      { x: 64, y: 70 },
      { x: 116, y: 70 },
      { x: 186, y: 68 },
      { x: 239, y: 70 },
    ]);
    expect(h.buildCellPositions(200, 140, 20, 10)).toEqual([
      { x: 34, y: 32 },
      { x: 57, y: 34 },
      { x: 70, y: 34 },
      { x: 109, y: 32 },
      { x: 136, y: 34 },
      { x: 44, y: 50 },
      { x: 67, y: 52 },
      { x: 80, y: 52 },
      { x: 119, y: 50 },
      { x: 146, y: 52 },
      { x: 34, y: 68 },
      { x: 51, y: 70 },
      { x: 64, y: 70 },
      { x: 103, y: 68 },
      { x: 130, y: 70 },
    ]);
    expect(h.buildCellPositions(150, 140, 20, 10)).toEqual([
      { x: 34, y: 32 },
      { x: 57, y: 34 },
      { x: 70, y: 34 },
      { x: 93, y: 32 },
      { x: 96, y: 34 },
      { x: 44, y: 50 },
      { x: 67, y: 52 },
      { x: 80, y: 52 },
      { x: 96, y: 50 },
      { x: 96, y: 52 },
      { x: 34, y: 68 },
      { x: 51, y: 70 },
      { x: 64, y: 70 },
      { x: 87, y: 68 },
      { x: 96, y: 70 },
    ]);
    expect(h.buildCellPositions(150, 140, 10, 10)).toEqual([
      { x: 34, y: 32 },
      { x: 57, y: 34 },
      { x: 70, y: 34 },
      { x: 93, y: 32 },
      { x: 106, y: 34 },
      { x: 44, y: 50 },
      { x: 67, y: 52 },
      { x: 80, y: 52 },
      { x: 103, y: 50 },
      { x: 106, y: 52 },
      { x: 34, y: 68 },
      { x: 51, y: 70 },
      { x: 64, y: 70 },
      { x: 87, y: 68 },
      { x: 100, y: 70 },
    ]);
    expect(h.buildCellPositions(200, 100, 10, 10)).toEqual([
      { x: 34, y: 30 },
      { x: 57, y: 30 },
      { x: 70, y: 30 },
      { x: 109, y: 30 },
      { x: 136, y: 30 },
      { x: 44, y: 30 },
      { x: 67, y: 30 },
      { x: 80, y: 30 },
      { x: 119, y: 30 },
      { x: 146, y: 30 },
      { x: 34, y: 30 },
      { x: 51, y: 30 },
      { x: 64, y: 30 },
      { x: 103, y: 30 },
      { x: 130, y: 30 },
    ]);
    expect(h.getCellColumnOffset(2)).toEqual(expect.any(Number));
    expect(h.getCellRowOffset(2)).toEqual(expect.any(Number));
    expect(h.getCellColumnOffset(0)).toBe(0);
    expect(h.getCellColumnOffset(1)).toBe(5);
    expect(h.getCellRowOffset(0)).toBe(0);
    expect(h.getCellRowOffset(1)).toBe(2);
    const shuffleInput = [{ x: 1 }, { x: 2 }, { x: 3 }];
    const shuffledInput = h.shufflePositions(shuffleInput, 1);
    expect(shuffledInput).toEqual([{ x: 3 }, { x: 2 }, { x: 1 }]);
    expect(Object.prototype.hasOwnProperty.call(shuffledInput, '3')).toBe(
      false
    );
    expect(Object.keys(shuffledInput)).toEqual(['0', '1', '2']);
    expect(shuffleInput).toEqual([{ x: 1 }, { x: 2 }, { x: 3 }]);
    expect(h.shufflePositions([1, 2], 1)).toEqual([2, 1]);
    expect(h.shufflePositions([], 1)).toEqual([]);
    expect(h.shufflePositions([{ x: 1 }], 1)).toEqual([{ x: 1 }]);
    expect(h.normalizeNonNegativeInteger(2.6, 0)).toBe(3);
    expect(h.normalizeNonNegativeInteger(-1, 7)).toBe(7);
    expect(h.deriveActions({}, {}, { buttons: [], axes: [] })).toHaveProperty(
      'actions.launchPressed'
    );
    expect(
      h.createActionsFromState({}, { buttons: [], axes: [] })
    ).toHaveProperty('actions.resetPressed');
    expect(h.isMoveLeftPressed({}, { buttons: [], axes: [] })).toBe(false);
    expect(h.isMoveRightPressed({}, { buttons: [], axes: [] })).toBe(false);
    expect(h.isLaunchPressed({}, { buttons: [], axes: [] })).toBe(false);
    expect(h.isPausePressed({}, { buttons: [], axes: [] })).toBe(false);
    expect(h.isResetPressed({}, { buttons: [], axes: [] })).toBe(false);
    expect(h.isLaunchPressed({ ' ': true }, { buttons: [], axes: [] })).toBe(
      true
    );
    expect(
      h.isLaunchPressed({ Button0: true }, { buttons: [], axes: [] })
    ).toBe(true);
    expect(h.isAxisLeft(-1)).toBe(true);
    expect(h.isAxisRight(1)).toBe(true);
    expect(h.isAxisLeft(-0.4)).toBe(false);
    expect(h.isAxisLeft(-0.5)).toBe(true);
    expect(h.isAxisRight(0.4)).toBe(false);
    expect(h.isAxisRight(0.5)).toBe(true);
    expect(
      h.createActionsFromState(
        { ArrowLeft: true, ArrowRight: true, Space: true, p: true, r: true },
        { buttons: [], axes: [] }
      )
    ).toEqual({
      actions: {
        moveLeft: true,
        moveRight: true,
        launchPressed: true,
        pausePressed: true,
        resetPressed: true,
      },
    });
    const keyboard = {};
    const gamepad = { buttons: [], axes: [] };
    h.applyKeyboardInput({ type: 'keydown', key: 'a' }, keyboard);
    h.applyKeyboardInput({ type: 'keyup', key: 'a' }, keyboard);
    h.applyKeyboardInput({ type: 'keydown' }, keyboard);
    h.applyKeyboardInput({ type: 'keypress', key: 'x' }, keyboard);
    h.applyKeyboardInput({ type: 'keydown', key: 'ArrowLeft' }, keyboard);
    h.applyKeyboardInput({ type: 'keyup', key: 'ArrowLeft' }, keyboard);
    h.applyGamepadInput(
      { buttons: [true], axes: ['1'], buttonIndex: 2, pressed: true },
      gamepad
    );
    h.applyGamepadInput(
      { buttons: {}, axes: {}, buttonIndex: '2', pressed: true },
      gamepad
    );
    h.applyGamepadInput({ pressed: true }, gamepad);
    expect(
      Object.prototype.hasOwnProperty.call(gamepad.buttons, 'undefined')
    ).toBe(false);
    const releasedGamepad = { buttons: [], axes: [] };
    h.applyGamepadInput({ buttonIndex: 0, pressed: false }, releasedGamepad);
    expect(releasedGamepad.buttons).toEqual([false]);
    expect(keyboard).toEqual({ a: false, ArrowLeft: false });
    expect(gamepad).toEqual({ buttons: [true, undefined, true], axes: [1] });
    expect(
      h.circleIntersectsCell(
        { x: 1, y: 1, radius: 2 },
        { x: 0, y: 0, width: 4, height: 4 }
      )
    ).toBe(true);
    expect(
      h.circleIntersectsCell(
        { x: 6.1, y: 2, radius: 1 },
        { x: 0, y: 0, width: 4, height: 4 }
      )
    ).toBe(false);
    expect(
      h.circleIntersectsCell(
        { x: 5.5, y: 2, radius: 2 },
        { x: 0, y: 0, width: 4, height: 4 }
      )
    ).toBe(true);
    const stuck = {
      ...state,
      orb: { ...state.orb, stuckToPaddle: true, x: 1, y: 1 },
    };
    h.stepSimulation(stuck);
    expect(stuck.orb).toMatchObject({ x: 1, y: 1, stuckToPaddle: true });
    expect(h.clamp(5, 0, 3)).toBe(3);
    expect(h.getOrbFill('lost')).toBe('#fca5a5');
    expect(h.getOrbFill('running')).toBe('#fde047');
    expect(h.buildFaultIndicator({ ...state, faults: 0 })).toEqual([]);
    expect(h.buildFaultIndicator({ ...state, faults: 1 })).toEqual([
      { type: 'rect', x: 66, y: 18, width: 36, height: 6, fill: '#94a3b8' },
    ]);
    expect(h.getFaultIndicatorFill(4)).toBe('#ef4444');
    expect(h.getFaultIndicatorFill(1)).toBe('#94a3b8');
    expect(h.getFaultIndicatorFill(3)).toBe('#94a3b8');
    expect(h.getCellChargeFill('overcharged')).toBe('#f97316');
    expect(h.getCellChargeFill('stable')).toBe('#dbeafe');
    expect(h.getCellFill('stable')).toBe('#4ade80');
    expect(h.getCellFill('overcharged')).toBe('#fb7185');
    expect(h.getCellFill('empty')).toBe('#60a5fa');
    expect(h.toCanvasPayload(state)).toEqual({
      width: 120,
      height: 90,
      shapes: [
        { type: 'rect', x: 0, y: 0, width: 120, height: 90, fill: '#07111f' },
        { type: 'rect', x: 14, y: 14, width: 92, height: 62, fill: '#0e1b2d' },
        { type: 'rect', x: 36, y: 66, width: 48, height: 6, fill: '#e5e7eb' },
        { type: 'circle', x: 60, y: 61, radius: 4, fill: '#fde047' },
        { type: 'rect', x: 18, y: 78, width: 20, height: 4, fill: '#34d399' },
      ],
    });
    const cellCanvasState = h.createState({
      ...h.createSeedOptions(),
      width: 120,
      height: 90,
      cells: [
        {
          id: 'c',
          x: 10,
          y: 20,
          width: 20,
          height: 10,
          charge: 1,
          targetCharge: 2,
          maxCharge: 3,
          state: 'charging',
          overchargeCooldown: 0,
        },
      ],
    });
    expect(h.toCanvasPayload(cellCanvasState)).toEqual({
      width: 120,
      height: 90,
      shapes: [
        { type: 'rect', x: 0, y: 0, width: 120, height: 90, fill: '#07111f' },
        { type: 'rect', x: 14, y: 14, width: 92, height: 62, fill: '#0e1b2d' },
        { type: 'rect', x: 10, y: 20, width: 20, height: 10, fill: '#60a5fa' },
        { type: 'rect', x: 13, y: 23, width: 5, height: 4, fill: '#dbeafe' },
        { type: 'rect', x: 36, y: 66, width: 48, height: 6, fill: '#e5e7eb' },
        { type: 'circle', x: 60, y: 61, radius: 4, fill: '#fde047' },
        { type: 'rect', x: 18, y: 78, width: 20, height: 4, fill: '#34d399' },
      ],
    });
    expect(h.toCanvasPayload({ ...state, score: 3 })).toEqual(
      expect.objectContaining({
        shapes: expect.arrayContaining([
          { type: 'rect', x: 18, y: 78, width: 56, height: 4, fill: '#34d399' },
        ]),
      })
    );
    const narrowCanvas = h.createState({
      ...h.createSeedOptions(),
      width: 40,
      height: 90,
      cells: [],
    });
    expect(h.toCanvasPayload({ ...narrowCanvas, score: 3 })).toEqual(
      expect.objectContaining({
        shapes: expect.arrayContaining([
          { type: 'rect', x: 18, y: 78, width: 8, height: 4, fill: '#34d399' },
        ]),
      })
    );
    const narrowCellState = h.createState({
      ...h.createSeedOptions(),
      width: 80,
      height: 90,
      cells: [
        {
          id: 'n',
          x: 10,
          y: 20,
          width: 8,
          height: 10,
          charge: 1,
          targetCharge: 2,
          maxCharge: 3,
          state: 'charging',
          overchargeCooldown: 0,
        },
      ],
    });
    expect(h.toCanvasPayload(narrowCellState).shapes).toEqual(
      expect.arrayContaining([
        { type: 'rect', x: 13, y: 23, width: 1, height: 4, fill: '#dbeafe' },
      ])
    );
    const charging = { ...state, score: 0, faults: 0 };
    const chargingCell = {
      id: 'c',
      state: 'empty',
      charge: 0,
      targetCharge: 2,
      maxCharge: 3,
      overchargeCooldown: 0,
    };
    h.applyCellHit(charging, chargingCell);
    expect(chargingCell).toMatchObject({ charge: 1, state: 'charging' });
    h.applyCellHit(charging, chargingCell);
    expect(chargingCell.state).toBe('stable');
    expect(charging.score).toBe(1);
    const faultState = { ...state, score: 0, faults: 0 };
    const faultCell = {
      id: 'f',
      state: 'empty',
      charge: 3,
      targetCharge: 2,
      maxCharge: 3,
      overchargeCooldown: 0,
    };
    h.applyCellHit(faultState, faultCell);
    expect(faultCell.state).toBe('overcharged');
    expect(faultState.faults).toBe(1);
    const directState = { score: 0, faults: 0 };
    const directCell = {
      state: 'empty',
      charge: 0,
      targetCharge: 2,
      maxCharge: 3,
      overchargeCooldown: 0,
    };
    h.updateCellStateAfterCharge(directState, directCell);
    expect(directCell.state).toBe('charging');
    expect(directState.score).toBe(0);
    directCell.charge = 2;
    h.updateCellStateAfterCharge(directState, directCell);
    expect(directCell.state).toBe('stable');
    expect(directState.score).toBe(1);
    directCell.charge = 4;
    h.updateCellStateAfterCharge(directState, directCell);
    expect(directCell.state).toBe('overcharged');
    expect(directState.faults).toBe(1);
    const alreadyOvercharged = {
      id: 'o',
      state: 'overcharged',
      charge: 0,
      targetCharge: 2,
      maxCharge: 3,
      overchargeCooldown: 0,
    };
    h.applyCellHit(faultState, alreadyOvercharged);
    expect(alreadyOvercharged.overchargeCooldown).toBe(120);
    h.advanceCellCooldowns({
      cells: [{ ...alreadyOvercharged, overchargeCooldown: 1 }],
    });
    expect(alreadyOvercharged.state).toBe('overcharged');
    const horizontal = { orb: { x: 0, y: 5, radius: 2, vx: 1, vy: 1 } };
    h.reflectOrb(horizontal, { x: 2, y: 4, width: 4, height: 4 });
    expect(horizontal.orb).toMatchObject({ x: -0.5, vx: -1 });
    const vertical = { orb: { x: 5, y: 0, radius: 2, vx: 1, vy: 1 } };
    h.reflectOrb(vertical, { x: 4, y: 2, width: 4, height: 4 });
    expect(vertical.orb).toMatchObject({ y: -0.5, vy: -1 });
    const equalReflection = { orb: { x: 5, y: 5, radius: 1, vx: 1, vy: 1 } };
    h.reflectOrb(equalReflection, { x: 4, y: 4, width: 2, height: 2 });
    expect(equalReflection.orb.vy).toBe(-1);
    const cellHitState = {
      orb: { x: 5, y: 5, radius: 2, vx: 0, vy: 1 },
      cells: [
        {
          id: 'hit',
          x: 4,
          y: 4,
          width: 4,
          height: 4,
          state: 'empty',
          charge: 0,
          targetCharge: 2,
          maxCharge: 3,
          overchargeCooldown: 0,
        },
      ],
    };
    const hitIds = new Set();
    h.resolveCells(cellHitState, hitIds);
    expect(hitIds.has('hit')).toBe(true);
    expect(cellHitState.cells[0].charge).toBe(1);
    const loss = {
      ...state,
      lives: 1,
      status: 'running',
      orb: { ...state.orb, y: 100 },
    };
    h.resolveBottom(loss);
    expect(loss.status).toBe('lost');
    const reset = {
      ...state,
      lives: 2,
      status: 'running',
      orb: { ...state.orb, y: 100 },
    };
    h.resolveBottom(reset);
    expect(reset.status).toBe('ready');
    const won = { ...state, cells: [{ state: 'stable' }], faults: 0, lives: 1 };
    h.resolveWinLoss(won);
    expect(won.status).toBe('won');
    const lost = { ...state, cells: [], faults: 4, lives: 1 };
    h.resolveWinLoss(lost);
    expect(lost.status).toBe('lost');
    const maxFaults = {
      ...state,
      cells: [{ state: 'stable' }],
      faults: 3,
      lives: 1,
    };
    h.resolveWinLoss(maxFaults);
    expect(maxFaults.status).toBe('won');
    const mixedCells = {
      ...state,
      cells: [{ state: 'stable' }, { state: 'charging' }],
      faults: 0,
      lives: 1,
    };
    h.resolveWinLoss(mixedCells);
    expect(mixedCells.status).toBe('ready');
    const zeroLives = { ...state, cells: [], faults: 0, lives: 0 };
    h.resolveWinLoss(zeroLives);
    expect(zeroLives.status).toBe('lost');
    const paddleHit = {
      width: 120,
      paddle: { x: 40, y: 60, width: 40, height: 6, speed: 4 },
      orb: { x: 60, y: 64, radius: 4, vx: 0, vy: 2 },
    };
    h.resolvePaddle(paddleHit);
    expect(paddleHit.orb).toMatchObject({ y: 55, vy: -2, vx: 1 });
    for (const [x, vx] of [
      [40, -2],
      [80, 2],
    ]) {
      const offsetHit = {
        width: 120,
        paddle: { x: 40, y: 60, width: 40, height: 6, speed: 4 },
        orb: { x, y: 64, radius: 4, vx: 0, vy: 2 },
      };
      h.resolvePaddle(offsetHit);
      expect(offsetHit.orb.vx).toBe(vx);
    }
    const paddleMiss = {
      width: 120,
      paddle: { x: 40, y: 60, width: 40, height: 6, speed: 4 },
      orb: { x: 10, y: 64, radius: 4, vx: 0, vy: 2 },
    };
    h.resolvePaddle(paddleMiss);
    expect(paddleMiss.orb.vy).toBe(2);
    const rightPaddleMiss = {
      width: 120,
      paddle: { x: 40, y: 60, width: 40, height: 6, speed: 4 },
      orb: { x: 90, y: 64, radius: 4, vx: 0, vy: 2 },
    };
    h.resolvePaddle(rightPaddleMiss);
    expect(rightPaddleMiss.orb.vy).toBe(2);
    for (const x of [36, 84]) {
      const edgeHit = {
        width: 120,
        paddle: { x: 40, y: 60, width: 40, height: 6, speed: 4 },
        orb: { x, y: 64, radius: 4, vx: 0, vy: 2 },
      };
      h.resolvePaddle(edgeHit);
      expect(edgeHit.orb.vy).toBe(-2);
    }
    const verticalEdgeHit = {
      width: 120,
      paddle: { x: 40, y: 60, width: 40, height: 6, speed: 4 },
      orb: { x: 60, y: 68, radius: 4, vx: 0, vy: 2 },
    };
    h.resolvePaddle(verticalEdgeHit);
    expect(verticalEdgeHit.orb.vy).toBe(-2);
    const lowerEdgeHit = {
      width: 120,
      paddle: { x: 40, y: 60, width: 40, height: 6, speed: 4 },
      orb: { x: 60, y: 56, radius: 4, vx: 0, vy: 2 },
    };
    h.resolvePaddle(lowerEdgeHit);
    expect(lowerEdgeHit.orb).toMatchObject({ y: 55, vy: -2 });
    const abovePaddleMiss = {
      width: 120,
      paddle: { x: 40, y: 60, width: 40, height: 6, speed: 4 },
      orb: { x: 60, y: 50, radius: 4, vx: 0, vy: 2 },
    };
    h.resolvePaddle(abovePaddleMiss);
    expect(abovePaddleMiss.orb.vy).toBe(2);
    const belowPaddleMiss = {
      width: 120,
      paddle: { x: 40, y: 60, width: 40, height: 6, speed: 4 },
      orb: { x: 60, y: 70, radius: 4, vx: 0, vy: 2 },
    };
    h.resolvePaddle(belowPaddleMiss);
    expect(belowPaddleMiss.orb.vy).toBe(2);
    const stationaryOrb = {
      width: 120,
      paddle: { x: 40, y: 60, width: 40, height: 6, speed: 4 },
      orb: { x: 60, y: 64, radius: 4, vx: 0, vy: 0 },
    };
    h.resolvePaddle(stationaryOrb);
    expect(stationaryOrb.orb.vy).toBe(0);
    const walls = {
      width: 100,
      orb: { x: 0, y: 0, radius: 4, vx: -2, vy: -3 },
    };
    h.resolveWalls(walls);
    expect(walls.orb).toMatchObject({ x: 4, y: 4, vx: 2, vy: 3 });
    const rightWall = {
      width: 100,
      orb: { x: 100, y: 20, radius: 4, vx: 2, vy: 1 },
    };
    h.resolveWalls(rightWall);
    expect(rightWall.orb).toMatchObject({ x: 96, vx: -2 });
    const boundaryWalls = {
      width: 100,
      orb: { x: 4, y: 4, radius: 4, vx: -2, vy: -3 },
    };
    h.resolveWalls(boundaryWalls);
    expect(boundaryWalls.orb).toMatchObject({ x: 4, y: 4, vx: 2, vy: 3 });
    const boundaryRight = {
      width: 100,
      orb: { x: 96, y: 20, radius: 4, vx: 2, vy: 1 },
    };
    h.resolveWalls(boundaryRight);
    expect(boundaryRight.orb).toMatchObject({ x: 96, vx: -2 });
    const launched = { status: 'ready', orb: { stuckToPaddle: true } };
    h.handleLaunchInput(launched, {
      actions: { launchPressed: true },
      previousActions: { launchPressed: false },
    });
    expect(launched).toEqual({
      status: 'running',
      orb: { stuckToPaddle: false },
    });
    const heldLaunch = { status: 'ready', orb: { stuckToPaddle: true } };
    h.handleLaunchInput(heldLaunch, {
      actions: { launchPressed: true },
      previousActions: { launchPressed: true },
    });
    expect(heldLaunch.status).toBe('ready');
    const nonReadyLaunch = { status: 'paused', orb: { stuckToPaddle: true } };
    h.handleLaunchInput(nonReadyLaunch, {
      actions: { launchPressed: true },
      previousActions: { launchPressed: false },
    });
    expect(nonReadyLaunch.status).toBe('paused');
    const cooldownState = {
      cells: [
        {
          state: 'overcharged',
          overchargeCooldown: 1,
          charge: 4,
          targetCharge: 2,
        },
      ],
    };
    h.advanceCellCooldowns(cooldownState);
    expect(cooldownState.cells[0]).toMatchObject({
      state: 'charging',
      overchargeCooldown: 0,
      charge: 2,
    });
    const noCooldown = {
      cells: [
        {
          state: 'charging',
          overchargeCooldown: 0,
          charge: 1,
          targetCharge: 2,
        },
      ],
    };
    h.advanceCellCooldowns(noCooldown);
    expect(noCooldown.cells[0]).toEqual({
      state: 'charging',
      overchargeCooldown: 0,
      charge: 1,
      targetCharge: 2,
    });
    const inactiveCooldown = {
      cells: [
        {
          state: 'charging',
          overchargeCooldown: 1,
          charge: 1,
          targetCharge: 2,
        },
      ],
    };
    h.advanceCellCooldowns(inactiveCooldown);
    expect(inactiveCooldown.cells[0].overchargeCooldown).toBe(1);
    const zeroOvercharge = {
      cells: [
        {
          state: 'overcharged',
          overchargeCooldown: 0,
          charge: 4,
          targetCharge: 2,
        },
      ],
    };
    h.advanceCellCooldowns(zeroOvercharge);
    expect(zeroOvercharge.cells[0].state).toBe('overcharged');
    const negativeCooldown = {
      cells: [
        {
          state: 'overcharged',
          overchargeCooldown: -1,
          charge: 4,
          targetCharge: 2,
        },
      ],
    };
    h.advanceCellCooldowns(negativeCooldown);
    expect(negativeCooldown.cells[0]).toMatchObject({
      state: 'overcharged',
      overchargeCooldown: -1,
    });
    expect(
      h.circleIntersectsCell(
        { x: 5, y: 2, radius: 1 },
        { x: 0, y: 0, width: 4, height: 4 }
      )
    ).toBe(true);
    const bottomBoundary = {
      ...state,
      lives: 2,
      status: 'running',
      orb: { ...state.orb, y: state.height - state.orb.radius },
    };
    h.resolveBottom(bottomBoundary);
    expect(bottomBoundary.lives).toBe(2);
    expect(h.persistState(jest.fn(), state)).toBeUndefined();
  });
});
