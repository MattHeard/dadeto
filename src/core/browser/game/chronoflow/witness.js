import {
  advanceChronoflow,
  createChronoflowGame,
  openSluice,
  setChronoflowRoute,
  toggleChronoflowChannel,
} from './runtime.js';

/** @type {readonly ({type: 'route', value: 'archive'}|{type: 'edit', cell: number}|{type: 'open'}|{type: 'advance', steps: number, batches?: number})[]} */
export const ARCHIVE_ENTRY_SOLUTION = Object.freeze([
  Object.freeze({ type: 'route', value: 'archive' }),
  Object.freeze({ type: 'edit', cell: 11 }),
  Object.freeze({ type: 'open' }),
  Object.freeze({ type: 'advance', steps: 60, batches: 5 }),
]);

/**
 * Replay an authored Archive Entry command witness.
 * @param {readonly ({type: 'route', value: 'archive'|'drain'}|{type: 'edit', cell: number}|{type: 'open'}|{type: 'advance', steps: number, batches?: number})[]} commands Level solution commands.
 * @returns {import('./runtime.js').ChronoflowGame} Final deterministic state.
 */
export function replayChronoflowWitness(commands = ARCHIVE_ENTRY_SOLUTION) {
  return commands.reduce((game, command) => {
    switch (command.type) {
      case 'route':
        return setChronoflowRoute(game, command.value);
      case 'edit':
        return toggleChronoflowChannel(game, command.cell);
      case 'open':
        return openSluice(game);
      case 'advance':
        return advanceBatches(game, command.steps, command.batches ?? 1);
      default:
        return game;
    }
  }, createChronoflowGame());
}

/**
 * Apply a fixed number of same-sized simulation batches.
 * @param {import('./runtime.js').ChronoflowGame} game Current game state.
 * @param {number} steps Simulation steps per batch.
 * @param {number} batches Number of batches to apply.
 * @returns {import('./runtime.js').ChronoflowGame} Result after all batches.
 */
function advanceBatches(game, steps, batches) {
  if (!Number.isSafeInteger(batches) || batches < 0 || batches > 10) {
    throw new RangeError(
      'Witness batches must be a safe integer from 0 to 10.'
    );
  }
  if (batches === 0 || game.completed) return game;
  return advanceBatches(advanceChronoflow(game, steps), steps, batches - 1);
}
