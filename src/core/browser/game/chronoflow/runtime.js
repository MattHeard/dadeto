import { createFluidState, stepFluid } from './chronoflow.js';
import { isTideWindowOpen } from './tide.js';

const WIDTH = 5;
const HEIGHT = 4;
const GATE_CELL = 13;
const ARCHIVE_BRANCH_CELL = 12;
const DRAIN_BRANCH_CELLS = Object.freeze([16, 17]);
const DRAIN_CELL = 17;
const TARGET_APPROACH_CELL = 18;
const TARGET_CELL = 19;
const TARGET_VOLUME = 0.12;
const PAGE_STEP_COUNT = 60;
const EDIT_BUDGET = 3;
const EDITABLE_CELLS = Object.freeze([7, 11]);
const ARCHIVE_WALLS = Object.freeze([
  0, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
]);

/** @typedef {{status: 'synchronized'|'stale', epochMs: number|null, uncertaintyMs?: number|null}|null} TrustedClockReading */

/**
 * @typedef {object} ChronoflowGame
 * @property {'archive-entry'} level Current authored level.
 * @property {import('./chronoflow.js').FluidState} fluid Fluid solver state.
 * @property {boolean} gateOpen Whether the archive sluice has been opened.
 * @property {'archive'|'drain'} route Selected junction route.
 * @property {number} targetCell Target chamber cell index.
 * @property {number} targetVolume Required delivered water volume.
 * @property {boolean} completed Whether the level objective is met.
 * @property {boolean} timedCredit Whether completion earned a trusted high-tide record.
 * @property {'practice'|'timed'} mode Active puzzle mode.
 * @property {number} editsUsed Terrain edits spent in this attempt.
 * @property {number} editBudget Maximum terrain edits allowed.
 * @property {readonly number[]} editableCells Authored cells that may be reshaped.
 */

/**
 * Create the first puzzle: release the source, open the sluice, and fill the
 * target chamber through the authored elbow-shaped channel.
 * @returns {ChronoflowGame} Fresh level state.
 */
export function createChronoflowGame() {
  const solids = Array.from({ length: WIDTH * HEIGHT }, (_, cell) =>
    ARCHIVE_WALLS.includes(cell)
  );
  /** @type {ChronoflowGame} */
  const initialGame = {
    level: 'archive-entry',
    fluid: createFluidState({
      width: WIDTH,
      height: HEIGHT,
      volume: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      solids,
    }),
    gateOpen: false,
    route: 'drain',
    targetCell: TARGET_CELL,
    targetVolume: TARGET_VOLUME,
    completed: false,
    timedCredit: false,
    mode: 'practice',
    editsUsed: 0,
    editBudget: EDIT_BUDGET,
    editableCells: EDITABLE_CELLS,
  };
  return setChronoflowRoute(initialGame, 'drain');
}

/**
 * Toggle an authored channel cell between stone and open channel.
 * @param {ChronoflowGame} game Current level state.
 * @param {number} cell Zero-based board cell index.
 * @param {TrustedClockReading} [clockReading] Trusted time required in timed mode.
 * @returns {ChronoflowGame} Updated board or original when editing is disallowed.
 */
export function toggleChronoflowChannel(game, cell, clockReading = null) {
  if (isTimedCommandPaused(game, clockReading)) return game;
  if (
    game.completed ||
    !EDITABLE_CELLS.includes(cell) ||
    game.editsUsed >= game.editBudget
  ) {
    return game;
  }
  const solids = [...game.fluid.solids];
  solids[cell] = !solids[cell];
  return withFluidSolids({ ...game, editsUsed: game.editsUsed + 1 }, solids);
}

/**
 * Set the junction to feed either the archive or the decoy drain.
 * @param {ChronoflowGame} game Current game.
 * @param {'archive'|'drain'} route Player-selected route.
 * @returns {ChronoflowGame} Updated routing state.
 */
export function setChronoflowRoute(game, route) {
  if (game.completed || (route !== 'archive' && route !== 'drain')) return game;
  const solids = [...game.fluid.solids];
  solids[ARCHIVE_BRANCH_CELL] = route !== 'archive';
  for (const cell of DRAIN_BRANCH_CELLS) solids[cell] = route === 'archive';
  solids[TARGET_APPROACH_CELL] = route === 'drain';
  return withFluidSolids({ ...game, route }, solids);
}

/**
 * Award timed completion only when the objective is met during the trusted tide window.
 * @param {ChronoflowGame} game Current level state.
 * @param {TrustedClockReading} clockReading Injected Internet clock reading.
 * @returns {ChronoflowGame} State with timed credit evaluated once at completion.
 */
export function finalizeChronoflowObjective(game, clockReading) {
  if (!game.completed || game.timedCredit) return game;
  const timedCredit = game.mode === 'timed' && isTimedHighTide(clockReading);
  return {
    ...game,
    timedCredit,
  };
}

/**
 * Start a timed attempt only when Internet time is securely inside high tide.
 * @param {ChronoflowGame} game Current game state.
 * @param {TrustedClockReading} clockReading Injected Internet clock reading.
 * @returns {ChronoflowGame} Timed state or unchanged practice state.
 */
export function startTimedRun(game, clockReading) {
  if (
    game.completed ||
    game.mode === 'timed' ||
    !isTimedHighTide(clockReading)
  ) {
    return game;
  }
  return { ...game, mode: 'timed' };
}

/**
 * Open the only movable gate. The command does not advance simulation time.
 * @param {ChronoflowGame} game Current game.
 * @param {TrustedClockReading} [clockReading] Trusted time required in timed mode.
 * @returns {ChronoflowGame} Updated game or the original when not allowed.
 */
export function openSluice(game, clockReading = null) {
  if (game.gateOpen || game.completed || game.route !== 'archive') return game;
  if (isTimedCommandPaused(game, clockReading)) return game;
  const solids = [...game.fluid.solids];
  solids[GATE_CELL] = false;
  return withFluidSolids({ ...game, gateOpen: true }, solids);
}

/**
 * Replace terrain while preserving the rest of the fluid state.
 * @param {ChronoflowGame} game Current game state.
 * @param {boolean[]} solids Updated solid-cell map.
 * @returns {ChronoflowGame} Game with replaced terrain.
 */
function withFluidSolids(game, solids) {
  return { ...game, fluid: { ...game.fluid, solids } };
}

/**
 * Advance fixed simulation steps without reading any clock.
 * @param {ChronoflowGame} game Current game.
 * @param {number} [steps] Number of fixed steps to execute.
 * @param {TrustedClockReading} [clockReading] Trusted time required in timed mode.
 * @returns {ChronoflowGame} Updated game.
 */
export function advanceChronoflow(
  game,
  steps = PAGE_STEP_COUNT,
  clockReading = null
) {
  if (!Number.isSafeInteger(steps) || steps < 0 || steps > 600) {
    throw new RangeError('Advance steps must be a safe integer from 0 to 600.');
  }
  if (isTimedCommandPaused(game, clockReading)) return game;
  if (game.completed || steps === 0) {
    return game;
  }
  return advanceUntilTarget(game, steps);
}

/**
 * Check the fresh high-tide gate for timed gameplay commands.
 * @param {TrustedClockReading} clockReading Trusted time reading.
 * @returns {boolean} Whether timed commands may advance.
 */
function isTimedHighTide(clockReading) {
  return isTideWindowOpen(toTideWindow(clockReading));
}

/**
 * Check whether the trusted tide currently blocks timed state changes.
 * @param {ChronoflowGame} game Current level state.
 * @param {TrustedClockReading} clockReading Current trusted clock sample.
 * @returns {boolean} Whether a timed command must pause.
 */
function isTimedCommandPaused(game, clockReading) {
  return game.mode === 'timed' && !isTimedHighTide(clockReading);
}

/**
 * Normalize a nullable network reading to the tide-window interface.
 * @param {TrustedClockReading} clockReading Trusted time reading.
 * @returns {{clockStatus: 'synchronized'|'stale'|'offline', epochMs: number|null, uncertaintyMs: number}} Tide predicate input.
 */
function toTideWindow(clockReading) {
  return {
    clockStatus: clockReading?.status ?? 'offline',
    epochMs: clockReading?.epochMs ?? null,
    uncertaintyMs: clockReading?.uncertaintyMs ?? 0,
  };
}

/**
 * Evolve the fluid in order until the target is filled or the batch is spent.
 * @param {ChronoflowGame} game Current level state.
 * @param {number} steps Fixed steps remaining.
 * @returns {ChronoflowGame} Evolved level state.
 */
function advanceUntilTarget(game, steps) {
  if (steps === 0 || game.completed) return game;
  const fluid = stepFluid(game.fluid, {
    drains: game.route === 'drain' ? [{ cell: DRAIN_CELL, volume: 0.02 }] : [],
  }).state;
  const completed = fluid.volume[TARGET_CELL] >= TARGET_VOLUME;
  return advanceUntilTarget(
    { ...game, fluid, completed },
    completed ? 0 : steps - 1
  );
}

/**
 * Reset the authored level to its initial practice state.
 * @returns {ChronoflowGame} Fresh state for the first level.
 */
export function resetChronoflow() {
  return createChronoflowGame();
}
