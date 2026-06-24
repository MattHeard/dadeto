import { normalizePositiveInteger } from '../../common.js';

/**
 * @typedef {{ x: number, y: number }} LifeCell
 * @typedef {{
 *   width: number,
 *   height: number,
 *   cols: number,
 *   rows: number,
 *   tickSpeedMs: number,
 *   framesPerTick: number,
 *   framesUntilTick: number,
 *   generation: number,
 *   cells: LifeCell[],
 * }} LifeState
 */

const STORAGE_KEY = 'CONW1';
const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 240;
const DEFAULT_COLS = 24;
const DEFAULT_ROWS = 16;
const DEFAULT_TICK_SPEED_MS = 128;
const MIN_TICK_SPEED_MS = 16;
const MAX_TICK_SPEED_MS = 2000;
const DEFAULT_SEED = [
  [11, 7],
  [12, 7],
  [13, 7],
  [13, 6],
  [12, 5],
];

/**
 * Step Conway's Game of Life while persisting board state in local storage.
 * @param {string} input JSON configuration or empty input.
 * @param {{ get?: (name: string) => unknown }} env Toy environment helpers.
 * @returns {string} JSON canvas payload for the canvas presenter.
 */
export function conwayLife(input, env) {
  const storage = getStorageAccessor(env);
  const persisted = readPersistedState(storage);
  const parsed = parseInput(input);
  const state = buildNextState(persisted, parsed);
  persistState(storage, state);
  return JSON.stringify(toCanvasPayload(state));
}

/**
 * @param {{ get?: (name: string) => unknown }} env
 * @returns {((value: Record<string, unknown>) => unknown) | null}
 */
function getStorageAccessor(env) {
  if (!env || typeof env.get !== 'function') {
    return null;
  }

  const setter = env.get('setLocalPermanentData');
  return typeof setter === 'function'
    ? /** @type {(value: Record<string, unknown>) => unknown} */ (setter)
    : null;
}

/**
 * @param {((value: Record<string, unknown>) => unknown) | null} storage
 * @returns {LifeState | null}
 */
function readPersistedState(storage) {
  if (!storage) {
    return null;
  }

  return normalizeState(parseJsonRecord(storage({})));
}

/**
 * @param {string} input
 * @returns {Record<string, unknown> | null}
 */
function parseInput(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    return null;
  }

  return parseJsonRecord(input);
}

/**
 * @param {LifeState | null} persisted
 * @param {Record<string, unknown> | null} input
 * @returns {LifeState}
 */
function buildNextState(persisted, input) {
  const seed = normalizeSeed(input);
  const base = persisted || seed;
  const nextTickSpeedMs = normalizeTickSpeedMs(
    input?.tickSpeedMs ?? base.tickSpeedMs
  );
  const framesPerTick = Math.max(1, Math.round(nextTickSpeedMs / 16));
  const shouldReset = input?.reset === true || !persisted;
  const startingCells = shouldReset ? seed.cells : base.cells;
  const initialCountdown = shouldReset
    ? framesPerTick
    : normalizePositiveInteger(base.framesUntilTick, framesPerTick);
  const nextState = shouldReset
    ? composeLifeState({
        width: base.width,
        height: base.height,
        cols: base.cols,
        rows: base.rows,
        tickSpeedMs: nextTickSpeedMs,
        framesPerTick,
        framesUntilTick: initialCountdown,
        generation: 0,
        cells: startingCells,
      })
    : stepBoard(
        composeLifeState({
          width: base.width,
          height: base.height,
          cols: base.cols,
          rows: base.rows,
          tickSpeedMs: nextTickSpeedMs,
          framesPerTick,
          framesUntilTick: initialCountdown,
          generation: base.generation,
          cells: startingCells,
        }),
        framesPerTick
      );

  return nextState;
}

/**
 * @param {LifeState} base
 * @param {number} framesPerTick
 * @returns {LifeState}
 */
function stepBoard(base, framesPerTick) {
  const nextFrameCountdown = base.framesUntilTick - 1;
  if (nextFrameCountdown > 0) {
    return {
      ...base,
      framesUntilTick: nextFrameCountdown,
    };
  }

  return {
    ...base,
    framesPerTick,
    generation: base.generation + 1,
    framesUntilTick: framesPerTick,
    cells: evolveCells(base.cells, base.cols, base.rows),
  };
}

/**
 * @param {Record<string, unknown> | null} input
 * @returns {LifeState}
 */
function normalizeSeed(input) {
  const width = normalizePositiveInteger(input?.width, DEFAULT_WIDTH);
  const height = normalizePositiveInteger(input?.height, DEFAULT_HEIGHT);
  const cols = normalizePositiveInteger(input?.cols, DEFAULT_COLS);
  const rows = normalizePositiveInteger(input?.rows, DEFAULT_ROWS);
  const tickSpeedMs = normalizeTickSpeedMs(input?.tickSpeedMs);
  return createSeedLifeState({
    width,
    height,
    cols,
    rows,
    tickSpeedMs,
    cells: normalizeCells(input?.cells, cols, rows),
  });
}

/**
 * Parse a JSON value into an object-like record.
 * @param {unknown} value Raw JSON source or parsed payload.
 * @returns {Record<string, unknown> | null} Object payload or null.
 */
function parseJsonRecord(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? /** @type {Record<string, unknown>} */ (parsed)
      : null;
  } catch {
    return null;
  }
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function normalizeTickSpeedMs(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) {
    return DEFAULT_TICK_SPEED_MS;
  }
  return Math.min(
    MAX_TICK_SPEED_MS,
    Math.max(MIN_TICK_SPEED_MS, Math.round(next))
  );
}

/**
 * @param {unknown} cells
 * @param {number} cols
 * @param {number} rows
 * @returns {LifeCell[]}
 */
function normalizeCells(cells, cols, rows) {
  if (!Array.isArray(cells)) {
    return DEFAULT_SEED.map(([x, y]) => ({ x, y }));
  }

  const valid = [];
  for (const cell of cells) {
    if (!Array.isArray(cell) || cell.length < 2) {
      continue;
    }
    const x = Number(cell[0]);
    const y = Number(cell[1]);
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      continue;
    }
    valid.push({
      x: wrapCoordinate(x, cols),
      y: wrapCoordinate(y, rows),
    });
  }
  return dedupeCells(valid);
}

/**
 * @param {number} value
 * @param {number} size
 * @returns {number}
 */
function wrapCoordinate(value, size) {
  if (size <= 0) {
    return 0;
  }
  return ((value % size) + size) % size;
}

/**
 * @param {LifeCell[]} cells
 * @returns {LifeCell[]}
 */
function dedupeCells(cells) {
  const seen = new Set();
  const next = [];
  for (const cell of cells) {
    const key = `${cell.x}:${cell.y}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(cell);
  }
  return next;
}

/**
 * @param {LifeCell[]} cells
 * @param {number} cols
 * @param {number} rows
 * @returns {LifeCell[]}
 */
function evolveCells(cells, cols, rows) {
  const live = new Set(cells.map(cell => `${cell.x}:${cell.y}`));
  const counts = new Map();
  for (const cell of cells) {
    for (const neighbor of getNeighbors(cell, cols, rows)) {
      const key = `${neighbor.x}:${neighbor.y}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const next = [];
  for (const [key, count] of counts.entries()) {
    const alive = live.has(key);
    if (count === 3 || (alive && count === 2)) {
      const [x, y] = key.split(':').map(Number);
      next.push({ x, y });
    }
  }
  return next;
}

/**
 * @param {LifeCell} cell
 * @param {number} cols
 * @param {number} rows
 * @returns {LifeCell[]}
 */
function getNeighbors(cell, cols, rows) {
  const neighbors = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      neighbors.push({
        x: wrapCoordinate(cell.x + dx, cols),
        y: wrapCoordinate(cell.y + dy, rows),
      });
    }
  }
  return neighbors;
}

/**
 * @param {LifeState} state
 * @returns {{ width: number, height: number, shapes: Array<Record<string, unknown>> }}
 */
function toCanvasPayload(state) {
  const cellWidth = state.width / state.cols;
  const cellHeight = state.height / state.rows;
  const shapes = [
    {
      type: 'rect',
      x: 0,
      y: 0,
      width: state.width,
      height: state.height,
      fill: '#0f172a',
    },
    ...state.cells.map(cell => ({
      type: 'rect',
      x: cell.x * cellWidth + 1,
      y: cell.y * cellHeight + 1,
      width: Math.max(1, cellWidth - 2),
      height: Math.max(1, cellHeight - 2),
      fill: '#dbeafe',
    })),
  ];

  return {
    width: state.width,
    height: state.height,
    shapes,
  };
}

/**
 * @param {((value: Record<string, unknown>) => unknown) | null} storage
 * @param {LifeState} state
 * @returns {void}
 */
function persistState(storage, state) {
  if (!storage) {
    return;
  }

  try {
    storage({
      [STORAGE_KEY]: {
        width: state.width,
        height: state.height,
        cols: state.cols,
        rows: state.rows,
        tickSpeedMs: state.tickSpeedMs,
        framesPerTick: state.framesPerTick,
        framesUntilTick: state.framesUntilTick,
        generation: state.generation,
        cells: state.cells.map(cell => [cell.x, cell.y]),
      },
    });
  } catch {
    // Ignore persistence errors and keep the current frame render.
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} data
 * @returns {LifeState | null}
 */
function normalizeState(data) {
  const stored = data?.[STORAGE_KEY];
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return null;
  }
  const candidate = /** @type {Record<string, unknown>} */ (stored);
  const width = normalizePositiveInteger(candidate.width, DEFAULT_WIDTH);
  const height = normalizePositiveInteger(candidate.height, DEFAULT_HEIGHT);
  const cols = normalizePositiveInteger(candidate.cols, DEFAULT_COLS);
  const rows = normalizePositiveInteger(candidate.rows, DEFAULT_ROWS);
  const tickSpeedMs = normalizeTickSpeedMs(candidate.tickSpeedMs);
  const framesPerTick = Math.max(
    1,
    normalizePositiveInteger(
      candidate.framesPerTick,
      Math.round(tickSpeedMs / 16)
    )
  );
  const framesUntilTick = Math.max(
    1,
    normalizePositiveInteger(candidate.framesUntilTick, framesPerTick)
  );
  const generation = normalizePositiveInteger(candidate.generation, 0);

  return createStoredLifeState({
    width,
    height,
    cols,
    rows,
    tickSpeedMs,
    framesPerTick,
    framesUntilTick,
    generation,
    cells: normalizeCells(candidate.cells, cols, rows),
  });
}

/**
 * Create a seed state from the current input fields.
 * @param {{ width: number, height: number, cols: number, rows: number, tickSpeedMs: number, cells: LifeCell[] }} fields Seed fields.
 * @returns {LifeState} Normalized state object.
 */
function createSeedLifeState(fields) {
  const framesPerTick = Math.max(1, Math.round(fields.tickSpeedMs / 16));
  return composeLifeState(fields, {
    framesPerTick,
    framesUntilTick: framesPerTick,
    generation: 0,
  });
}

/**
 * Create a stored state from persisted fields.
 * @param {{ width: number, height: number, cols: number, rows: number, tickSpeedMs: number, framesPerTick: number, framesUntilTick: number, generation: number, cells: LifeCell[] }} fields Stored fields.
 * @returns {LifeState} Normalized state object.
 */
function createStoredLifeState(fields) {
  return composeLifeState(fields, {});
}

/**
 * Build a LifeState object from normalized fields.
 * @param {{
 *   width: number,
 *   height: number,
 *   cols: number,
 *   rows: number,
 *   tickSpeedMs: number,
 *   framesPerTick: number,
 *   framesUntilTick: number,
 *   generation: number,
 *   cells: LifeCell[],
 * }} base Normalized state fields.
 * @param {Partial<Pick<LifeState, 'framesPerTick' | 'framesUntilTick' | 'generation'>>} overrides Derived fields.
 * @returns {LifeState} Normalized state object.
 */
function composeLifeState(base, overrides) {
  return {
    width: base.width,
    height: base.height,
    cols: base.cols,
    rows: base.rows,
    tickSpeedMs: base.tickSpeedMs,
    framesPerTick: overrides.framesPerTick ?? base.framesPerTick,
    framesUntilTick: overrides.framesUntilTick ?? base.framesUntilTick,
    generation: overrides.generation ?? base.generation,
    cells: base.cells,
  };
}
