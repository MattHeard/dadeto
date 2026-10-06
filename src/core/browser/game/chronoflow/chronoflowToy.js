import { runToy } from '../../toys/toyPersistence.js';
import { parseObjectRecord } from '../../validation.js';
import * as chronoflowRuntime from './runtime.js';
import { restoreChronoflowSave, serializeChronoflowSave } from './save.js';
import { replayChronoflowWitness } from './witness.js';
import { renderChronoflowBoard } from './renderer.js';

const WIDTH = 160;
const HEIGHT = 144;
const STORAGE_KEY = 'CHRO1';
const BACKGROUND = '#182f36';

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
    background: BACKGROUND,
    shapes: renderChronoflowBoard(state.game, state.selectedCell),
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
