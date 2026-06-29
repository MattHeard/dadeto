import {
  createRectShape,
  getStorageAccessor,
  parseInput,
  persistState,
  readPersistedState,
} from '../toyPersistence.js';
import { normalizePositiveInteger } from '../../common.js';

const LIFE_RENDER_MODE = 'toroidal';

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
  const persisted = readPersistedState(storage, STORAGE_KEY, normalizeState);
  const parsed = parseInput(input);
  const state = buildNextState(persisted, parsed);
  persistState(storage, STORAGE_KEY, state, serializeState);
  return JSON.stringify(toCanvasPayload(state));
}

/**
 * Build the next simulation state from persisted and current input.
 * @param {LifeState | null} persisted Previous persisted state.
 * @param {Record<string, unknown> | null} input Current input payload.
 * @returns {LifeState} Next simulation state.
 */
function buildNextState(persisted, input) {
  const seed = normalizeSeed(input);
  const base = persisted || seed;
  const nextTickSpeedMs = normalizeTickSpeedMs(
    input?.tickSpeedMs ?? base.tickSpeedMs
  );
  const framesPerTick = Math.max(1, Math.round(nextTickSpeedMs / 16));
  const shouldReset = input?.reset === true || !persisted;
  const state = createNextState({
    base,
    nextTickSpeedMs,
    framesPerTick,
    seedCells: seed.cells,
    shouldReset,
  });
  if (!shouldReset) {
    return stepBoard(state, framesPerTick);
  }

  return state;
}

/**
 * Create the state before advancing the board.
 * @param {{
 *   base: LifeState,
 *   nextTickSpeedMs: number,
 *   framesPerTick: number,
 *   seedCells: LifeCell[],
 *   shouldReset: boolean,
 * }} options Next-state options.
 * @returns {LifeState} Prepared state.
 */
function createNextState(options) {
  const { base, nextTickSpeedMs, framesPerTick, seedCells, shouldReset } =
    options;
  let startingCells = base.cells;
  if (shouldReset) {
    startingCells = seedCells;
  }

  let initialCountdown = normalizePositiveInteger(
    base.framesUntilTick,
    framesPerTick
  );
  if (shouldReset) {
    initialCountdown = framesPerTick;
  }
  let generation = base.generation;
  if (shouldReset) {
    generation = 0;
  }

  return composeLifeState(
    createBaseStateFields({
      width: base.width,
      height: base.height,
      cols: base.cols,
      rows: base.rows,
      tickSpeedMs: nextTickSpeedMs,
      cells: startingCells,
    }),
    {
      framesPerTick,
      framesUntilTick: initialCountdown,
      generation,
    }
  );
}

/**
 * Advance the board by one frame or one generation.
 * @param {LifeState} base Current board state.
 * @param {number} framesPerTick Frames per tick.
 * @returns {LifeState} Next board state.
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
 * Normalize seed state from current input.
 * @param {Record<string, unknown> | null} input Parsed current input.
 * @returns {LifeState} Normalized seed state.
 */
function normalizeSeed(input) {
  const width = normalizePositiveInteger(input?.width, DEFAULT_WIDTH);
  const height = normalizePositiveInteger(input?.height, DEFAULT_HEIGHT);
  const cols = normalizePositiveInteger(input?.cols, DEFAULT_COLS);
  const rows = normalizePositiveInteger(input?.rows, DEFAULT_ROWS);
  const tickSpeedMs = normalizeTickSpeedMs(input?.tickSpeedMs);
  return createSeedLifeState(
    createBaseStateFields({
      width,
      height,
      cols,
      rows,
      tickSpeedMs,
      cells: normalizeCells(input?.cells, cols, rows),
    })
  );
}

/**
 * Clamp the tick speed to the allowed simulation range.
 * @param {unknown} value Raw tick speed value.
 * @returns {number} Clamped tick speed in milliseconds.
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
 * Normalize a cell list to valid toroidal coordinates.
 * @param {unknown} cells Raw cells payload.
 * @param {number} cols Board columns.
 * @param {number} rows Board rows.
 * @returns {LifeCell[]} Normalized cell list.
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
 * Wrap a coordinate within the board dimensions.
 * @param {number} value Raw coordinate.
 * @param {number} size Board size.
 * @returns {number} Wrapped coordinate.
 */
function wrapCoordinate(value, size) {
  return ((value % size) + size) % size;
}

/**
 * Remove duplicate cells from the list.
 * @param {LifeCell[]} cells Input cell list.
 * @returns {LifeCell[]} Deduplicated cell list.
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
 * Evolve the board by one generation.
 * @param {LifeCell[]} cells Current cell list.
 * @param {number} cols Board columns.
 * @param {number} rows Board rows.
 * @returns {LifeCell[]} Next generation cells.
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
 * Enumerate the neighbors of a cell on the torus.
 * @param {LifeCell} cell Source cell.
 * @param {number} cols Board columns.
 * @param {number} rows Board rows.
 * @returns {LifeCell[]} Neighbor cells.
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
 * Convert a life state into a canvas payload.
 * @param {LifeState} state Board state.
 * @returns {{ width: number, height: number, shapes: Array<Record<string, unknown>> }} Canvas payload.
 */
function toCanvasPayload(state) {
  const cellWidth = state.width / state.cols;
  const cellHeight = state.height / state.rows;
  const shapes = [
    createBackdropShape(state.width, state.height),
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
 * Create the backdrop rectangle for the canvas payload.
 * @param {number} width Canvas width.
 * @param {number} height Canvas height.
 * @returns {Record<string, unknown>} Background shape.
 */
function createBackdropShape(width, height) {
  return createRectShape({
    x: 0,
    y: 0,
    width,
    height,
    fill: '#0f172a',
  });
}

/**
 * Serialize the current life state into the persisted storage shape.
 * @param {LifeState} state State to serialize.
 * @returns {{
 *   width: number,
 *   height: number,
 *   cols: number,
 *   rows: number,
 *   tickSpeedMs: number,
 *   framesPerTick: number,
 *   framesUntilTick: number,
 *   generation: number,
 *   cells: Array<[number, number]>,
 * }} Persisted payload.
 */
function serializeState(state) {
  return {
    width: state.width,
    height: state.height,
    cols: state.cols,
    rows: state.rows,
    tickSpeedMs: state.tickSpeedMs,
    framesPerTick: state.framesPerTick,
    framesUntilTick: state.framesUntilTick,
    generation: state.generation,
    cells: state.cells.map(serializeCell),
  };
}

/**
 * Serialize a single cell for persistence.
 * @param {LifeCell} cell Cell to serialize.
 * @returns {[number, number]} Persisted cell pair.
 */
function serializeCell(cell) {
  return [cell.x, cell.y];
}

/**
 * Normalize a persisted state payload.
 * @param {unknown} data Stored data.
 * @returns {LifeState | null} Normalized state or null.
 */
function normalizeState(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const candidate = getStoredLifeCandidate(
    /** @type {Record<string, unknown>} */ (data)
  );
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null;
  }
  return normalizeStoredLifeCandidate(candidate);
}

/**
 * Resolve the stored life candidate from either the wrapped or raw persistence shape.
 * @param {Record<string, unknown>} data Stored data.
 * @returns {Record<string, unknown> | null} Stored life record.
 */
function getStoredLifeCandidate(data) {
  if (STORAGE_KEY in data) {
    const stored = /** @type {Record<string, unknown>} */ (data)[STORAGE_KEY];
    if (stored) {
      return /** @type {Record<string, unknown>} */ (stored);
    }
    return null;
  }

  return /** @type {Record<string, unknown>} */ (data);
}

/**
 * Normalize a persisted life candidate into a stored state.
 * @param {Record<string, unknown>} candidate Persisted candidate record.
 * @returns {LifeState} Normalized stored state.
 */
function normalizeStoredLifeCandidate(candidate) {
  const width = normalizePositiveInteger(candidate.width, DEFAULT_WIDTH);
  const height = normalizePositiveInteger(candidate.height, DEFAULT_HEIGHT);
  const cols = normalizePositiveInteger(candidate.cols, DEFAULT_COLS);
  const rows = normalizePositiveInteger(candidate.rows, DEFAULT_ROWS);
  const tickSpeedMs = normalizeTickSpeedMs(candidate.tickSpeedMs);
  const framesPerTickRaw = normalizePositiveInteger(
    candidate.framesPerTick,
    Math.round(tickSpeedMs / 16)
  );
  let framesPerTick = framesPerTickRaw;
  if (framesPerTick < 1) {
    framesPerTick = 1;
  }
  const framesUntilTickRaw = normalizePositiveInteger(
    candidate.framesUntilTick,
    framesPerTick
  );
  let framesUntilTick = framesUntilTickRaw;
  if (framesUntilTick < 1) {
    framesUntilTick = 1;
  }
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
  return composeLifeState(createBaseStateFields(fields), {
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
  return composeLifeState(createBaseStateFields(fields), {});
}

/**
 * Build the shared state fields used by both seed and stored state shapes.
 * @param {{
 *   width: number,
 *   height: number,
 *   cols: number,
 *   rows: number,
 *   tickSpeedMs: number,
 *   framesPerTick?: number,
 *   framesUntilTick?: number,
 *   generation?: number,
 *   cells: LifeCell[],
 * }} fields Common state fields.
 * @returns {{
 *   width: number,
 *   height: number,
 *   cols: number,
 *   rows: number,
 *   tickSpeedMs: number,
 *   framesPerTick: number,
 *   framesUntilTick: number,
 *   generation: number,
 *   cells: LifeCell[],
 * }} Shared base state fields.
 */
function createBaseStateFields(fields) {
  const framesPerTick =
    fields.framesPerTick ?? Math.max(1, Math.round(fields.tickSpeedMs / 16));
  const framesUntilTick = fields.framesUntilTick ?? framesPerTick;
  const generation = fields.generation ?? 0;

  return {
    width: fields.width,
    height: fields.height,
    cols: fields.cols,
    rows: fields.rows,
    tickSpeedMs: fields.tickSpeedMs,
    framesPerTick,
    framesUntilTick,
    generation,
    cells: fields.cells,
  };
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
