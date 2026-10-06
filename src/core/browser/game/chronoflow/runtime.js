import { createFluidState, stepFluid } from './chronoflow.js';

const WIDTH = 5;
const HEIGHT = 4;
const GATE_CELL = 13;
const TARGET_CELL = 19;
const TARGET_VOLUME = 0.12;
const PAGE_STEP_COUNT = 60;
const ARCHIVE_WALLS = Object.freeze([
  0, 2, 3, 4, 5, 7, 8, 9, 10, 13, 14, 15, 16, 17,
]);

/**
 * @typedef {object} ChronoflowGame
 * @property {'archive-entry'} level Current authored level.
 * @property {import('./chronoflow.js').FluidState} fluid Fluid solver state.
 * @property {boolean} gateOpen Whether the archive sluice has been opened.
 * @property {number} targetCell Target chamber cell index.
 * @property {number} targetVolume Required delivered water volume.
 * @property {boolean} completed Whether the level objective is met.
 * @property {'practice'} mode Clockless practice mode for this milestone.
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
  return {
    level: 'archive-entry',
    fluid: createFluidState({
      width: WIDTH,
      height: HEIGHT,
      volume: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      solids,
    }),
    gateOpen: false,
    targetCell: TARGET_CELL,
    targetVolume: TARGET_VOLUME,
    completed: false,
    mode: 'practice',
  };
}

/**
 * Open the only movable gate. The command does not advance simulation time.
 * @param {ChronoflowGame} game Current game.
 * @returns {ChronoflowGame} Updated game or the original when already open/completed.
 */
export function openSluice(game) {
  if (game.gateOpen || game.completed) return game;
  const solids = [...game.fluid.solids];
  solids[GATE_CELL] = false;
  return {
    ...game,
    gateOpen: true,
    fluid: { ...game.fluid, solids },
  };
}

/**
 * Advance fixed simulation steps without reading any clock.
 * @param {ChronoflowGame} game Current game.
 * @param {number} [steps] Number of fixed steps to execute.
 * @returns {ChronoflowGame} Updated game.
 */
export function advanceChronoflow(game, steps = PAGE_STEP_COUNT) {
  if (!Number.isSafeInteger(steps) || steps < 0 || steps > 600) {
    throw new RangeError('Advance steps must be a safe integer from 0 to 600.');
  }
  if (game.completed || steps === 0) return game;
  return advanceUntilTarget(game, steps);
}

/**
 * Evolve the fluid in order until the target is filled or the batch is spent.
 * @param {ChronoflowGame} game Current level state.
 * @param {number} steps Fixed steps remaining.
 * @returns {ChronoflowGame} Evolved level state.
 */
function advanceUntilTarget(game, steps) {
  if (steps === 0 || game.completed) return game;
  const fluid = stepFluid(game.fluid).state;
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
