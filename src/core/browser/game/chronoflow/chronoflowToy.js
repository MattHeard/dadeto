import { createBackgroundShape, runToy } from '../../toys/toyPersistence.js';
import { parseObjectRecord } from '../../validation.js';
import * as chronoflowRuntime from './runtime.js';
import { restoreChronoflowSave, serializeChronoflowSave } from './save.js';
import { replayChronoflowWitness } from './witness.js';

const WIDTH = 160;
const HEIGHT = 144;
const CELL_WIDTH = 29;
const CELL_HEIGHT = 20;
const CELL_GAP = 1;
const BOARD_X = 5;
const BOARD_Y = 23;
const STORAGE_KEY = 'CHRO1';
const COLORS = Object.freeze({
  dark: '#182f36',
  middle: '#315744',
  light: '#bfd77c',
  highlight: '#e9d88d',
  water: '#246774',
});

/**
 * Run the embedded Chronoflow handheld toy using the standard Mosslight keypad.
 * Command arrays remain available for deterministic parity checks.
 * @param {string} input Serialized command or keypad input.
 * @param {Map<string, unknown>} env Persistent toy environment.
 * @returns {string} Pixelated 160x144 canvas payload and practice snapshot.
 */
export function chronoflowToy(input, env) {
  const request = parseObjectRecord(input);
  if (!request) return serializeFrame(createInitialState());
  if (Array.isArray(request.commands)) {
    return serializeWitnessFrame(request.commands);
  }
  return runToy(input, env, {
    storageKey: STORAGE_KEY,
    normalizeState: normalizeEmbeddedState,
    buildNextState,
    toCanvasPayload: serializeFrame,
  });
}

/**
 * Replay explicit commands from the authored initial level.
 * @param {Parameters<typeof replayChronoflowWitness>[0]} commands Deterministic level commands.
 * @returns {string} Rendered replay frame, or the initial frame for invalid batches.
 */
function serializeWitnessFrame(commands) {
  try {
    return serializeFrame({
      game: replayChronoflowWitness(
        /** @type {Parameters<typeof replayChronoflowWitness>[0]} */ (commands)
      ),
      selectedCell: 7,
    });
  } catch {
    return serializeFrame(createInitialState());
  }
}

/**
 * Create the fresh embedded game state.
 * @returns {{game: import('./runtime.js').ChronoflowGame, selectedCell: number}} Practice state.
 */
function createInitialState() {
  return { game: chronoflowRuntime.createChronoflowGame(), selectedCell: 7 };
}

/**
 * Validate persisted embedded progress through the versioned practice save contract.
 * @param {unknown} value Stored toy state.
 * @returns {{game: import('./runtime.js').ChronoflowGame, selectedCell: number}|null} Safe embedded state.
 */
function normalizeEmbeddedState(value) {
  const stored = parseObjectRecord(value);
  if (!stored?.game || typeof stored.game !== 'object') return null;
  let game = null;
  try {
    game = restoreChronoflowSave(
      serializeChronoflowSave(
        /** @type {import('./runtime.js').ChronoflowGame} */ (stored.game)
      )
    );
  } catch {
    game = null;
  }
  if (!game) return null;
  const selectedCell = /** @type {number} */ (stored.selectedCell);
  return {
    game,
    selectedCell:
      Number.isSafeInteger(selectedCell) &&
      selectedCell >= 0 &&
      selectedCell < 20
        ? selectedCell
        : 7,
  };
}

/**
 * Apply one Mosslight keypad or keyboard event to persisted practice state.
 * @param {{game: import('./runtime.js').ChronoflowGame, selectedCell: number}|null} persisted Prior embedded state.
 * @param {Record<string, unknown>|null} input Latest keypad payload.
 * @returns {{game: import('./runtime.js').ChronoflowGame, selectedCell: number}} Next state.
 */
function buildNextState(persisted, input) {
  const state = persisted ?? createInitialState();
  if (
    input?.reset === true ||
    (input?.type === 'keydown' && input.key === 'r')
  ) {
    return createInitialState();
  }
  if (input?.type !== 'keydown' || typeof input.key !== 'string') return state;

  const key = input.key.toLowerCase();
  if (key.startsWith('arrow')) {
    return { ...state, selectedCell: moveSelection(state.selectedCell, key) };
  }
  if (key === 'b') {
    return {
      ...state,
      game: chronoflowRuntime.setChronoflowRoute(
        state.game,
        state.game.route === 'archive' ? 'drain' : 'archive'
      ),
    };
  }
  if (key === 'x') {
    return { ...state, game: chronoflowRuntime.openSluice(state.game) };
  }
  if (key === 'y') {
    return {
      ...state,
      game: chronoflowRuntime.advanceChronoflow(state.game, 60),
    };
  }
  if (key === 'a') {
    const game = state.game.editableCells.includes(state.selectedCell)
      ? chronoflowRuntime.toggleChronoflowChannel(
          state.game,
          state.selectedCell
        )
      : state.game.gateOpen
        ? chronoflowRuntime.advanceChronoflow(state.game, 60)
        : state.game;
    return { ...state, game };
  }
  return persisted ?? createInitialState();
}

/**
 * Move the screen cursor one cell without wrapping across board edges.
 * @param {number} selectedCell Current selected cell.
 * @param {string} key Arrow key name.
 * @returns {number} Selected cell after movement.
 */
function moveSelection(selectedCell, key) {
  const column = selectedCell % 5;
  const row = Math.floor(selectedCell / 5);
  if (key === 'arrowleft' && column > 0) return selectedCell - 1;
  if (key === 'arrowright' && column < 4) return selectedCell + 1;
  if (key === 'arrowup' && row > 0) return selectedCell - 5;
  if (key === 'arrowdown' && row < 3) return selectedCell + 5;
  return selectedCell;
}

/**
 * Serialize one Game Boy-style frame with an untimed state snapshot.
 * @param {{game: import('./runtime.js').ChronoflowGame, selectedCell: number}} state Current embedded state.
 * @returns {string} Canvas presenter payload.
 */
function serializeFrame(state) {
  const payload = {
    type: 'chronoflow',
    width: WIDTH,
    height: HEIGHT,
    pixelated: true,
    background: COLORS.dark,
    shapes: renderBoard(state),
    snapshot: {
      level: state.game.level,
      route: state.game.route,
      gateOpen: state.game.gateOpen,
      completed: state.game.completed,
      mode: 'practice',
      timedCredit: false,
      editsUsed: state.game.editsUsed,
      selectedCell: state.selectedCell,
      fluid: state.game.fluid,
    },
  };
  const serialized = JSON.stringify(payload);
  return serialized;
}

/**
 * Create pixel artwork for the interactive 160x144 handheld puzzle display.
 * @param {{game: import('./runtime.js').ChronoflowGame, selectedCell: number}} state Current embedded state.
 * @returns {Array<Record<string, unknown>>} Canvas 2D shapes.
 */
function renderBoard(state) {
  const { game, selectedCell } = state;
  const shapes = /** @type {Array<Record<string, unknown>>} */ ([
    createBackgroundShape(WIDTH, HEIGHT, COLORS.dark),
    { type: 'rect', x: 2, y: 2, width: 156, height: 140, fill: COLORS.middle },
    { type: 'rect', x: 5, y: 5, width: 150, height: 13, fill: COLORS.dark },
    bitmapText('CHRONOFLOW · ARCHIVE', 8, 14, COLORS.highlight),
  ]);

  for (let cell = 0; cell < game.fluid.volume.length; cell += 1) {
    const x = BOARD_X + (cell % game.fluid.width) * (CELL_WIDTH + CELL_GAP);
    const y =
      BOARD_Y + Math.floor(cell / game.fluid.width) * (CELL_HEIGHT + CELL_GAP);
    const baseFill = game.fluid.solids[cell] ? COLORS.middle : COLORS.light;
    if (cell === selectedCell) {
      shapes.push({
        type: 'rect',
        x,
        y,
        width: CELL_WIDTH,
        height: CELL_HEIGHT,
        fill: COLORS.highlight,
      });
    }
    shapes.push({
      type: 'rect',
      x: x + (cell === selectedCell ? 1 : 0),
      y: y + (cell === selectedCell ? 1 : 0),
      width: CELL_WIDTH - (cell === selectedCell ? 2 : 0),
      height: CELL_HEIGHT - (cell === selectedCell ? 2 : 0),
      fill: baseFill,
    });
    addWaterShape(shapes, { game, cell, x, y });
    addCellLabel(shapes, { game, cell, x, y });
  }

  const targetPercent = Math.round(game.fluid.volume[game.targetCell] * 100);
  const status = game.completed
    ? 'ARCHIVE PRIMED'
    : `${game.route === 'archive' ? 'ARCHIVE' : 'DRAIN'} ${game.gateOpen ? 'OPEN' : 'GATE'} · ${targetPercent}%`;
  shapes.push(
    { type: 'rect', x: 5, y: 108, width: 150, height: 11, fill: COLORS.dark },
    bitmapText(status, 8, 116, COLORS.light),
    bitmapText(
      `CELL ${String(selectedCell + 1).padStart(2, '0')} · ${game.editsUsed}/${game.editBudget} EDITS`,
      6,
      127,
      COLORS.dark
    ),
    bitmapText('ARROWS MOVE · A EDIT · B ROUTE', 6, 135, COLORS.dark),
    bitmapText('X OPEN · Y FLOW · R RESET', 6, 140, COLORS.dark)
  );
  return shapes;
}

/**
 * Draw the current water height within one grid cell.
 * @param {Array<Record<string, unknown>>} shapes Canvas shapes in draw order.
 * @param {{game: import('./runtime.js').ChronoflowGame, cell: number, x: number, y: number}} cellView Current cell view.
 * @returns {void}
 */
function addWaterShape(shapes, cellView) {
  const { game, cell, x, y } = cellView;
  const volume = game.fluid.volume[cell];
  if (volume <= 0) return;
  const waterHeight = Math.max(2, Math.round((CELL_HEIGHT - 4) * volume));
  shapes.push({
    type: 'rect',
    x: x + 2,
    y: y + CELL_HEIGHT - 2 - waterHeight,
    width: CELL_WIDTH - 4,
    height: waterHeight,
    fill: COLORS.water,
  });
}

/**
 * Add a readable marker for the source, sluice, and archive target.
 * @param {Array<Record<string, unknown>>} shapes Canvas shapes in draw order.
 * @param {{game: import('./runtime.js').ChronoflowGame, cell: number, x: number, y: number}} cellView Current cell view.
 * @returns {void}
 */
function addCellLabel(shapes, cellView) {
  const { game, cell, x, y } = cellView;
  const label =
    cell === 1
      ? 'S'
      : cell === 13
        ? game.gateOpen
          ? 'O'
          : 'G'
        : cell === game.targetCell
          ? `${Math.round(game.fluid.volume[cell] * 100)}`
          : '';
  if (!label) return;
  shapes.push(
    bitmapText(
      label,
      x + (cell === game.targetCell ? 5 : 11),
      y + 13,
      COLORS.dark
    )
  );
}

/**
 * Create a pixel-font label matching the Mosslight handheld canvas frame.
 * @param {string} text Text to draw.
 * @param {number} x Screen x coordinate.
 * @param {number} y Text baseline.
 * @param {string} fill LCD palette color.
 * @returns {Record<string, unknown>} Pixel-font canvas shape.
 */
function bitmapText(text, x, y, fill) {
  return { type: 'text', x, y, text, fill, bitmap: true };
}
