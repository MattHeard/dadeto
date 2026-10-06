import { createChronoflowGame } from './runtime.js';
import { replayChronoflowWitness } from './witness.js';
import { parseObjectRecord } from '../../validation.js';

const WIDTH = 320;
const HEIGHT = 270;
const CELL_WIDTH = 56;
const CELL_HEIGHT = 44;
const CELL_GAP_X = 4;
const CELL_GAP_Y = 4;
const BOARD_X = 16;
const BOARD_Y = 48;

/**
 * Run a deterministic untimed command replay for the embedded Chronoflow toy.
 * Input is a JSON object with an optional `commands` array using route, edit,
 * open, and advance commands. The output includes a canvas-doodle payload and
 * a solver snapshot for parity checks. Embedded play cannot earn timed credit.
 * @param {string} input Serialized embedded-toy command stream.
 * @returns {string} Canvas payload with the deterministic solver snapshot.
 */
export function chronoflowToy(input) {
  const request = parseInput(input);
  let game;
  try {
    game = replayChronoflowWitness(request.commands);
  } catch {
    game = createChronoflowGame();
  }
  const payload = {
    width: WIDTH,
    height: HEIGHT,
    background: '#071a26',
    shapes: renderBoard(game),
    snapshot: {
      level: game.level,
      route: game.route,
      gateOpen: game.gateOpen,
      completed: game.completed,
      mode: 'practice',
      timedCredit: false,
      editsUsed: game.editsUsed,
      fluid: game.fluid,
    },
  };
  return JSON.stringify(payload, null, 0);
}

/**
 * Parse the optional command array, defaulting invalid JSON to a fresh board.
 * @param {string} input Serialized request.
 * @returns {{commands: Parameters<typeof replayChronoflowWitness>[0]}} Normalized request.
 */
function parseInput(input) {
  const parsed = parseObjectRecord(input || '{}');
  return { commands: Array.isArray(parsed?.commands) ? parsed.commands : [] };
}

/**
 * Convert the shared solver snapshot into shapes for the existing Canvas 2D toy presenter.
 * @param {import('./runtime.js').ChronoflowGame} game Current puzzle state.
 * @returns {Array<Record<string, unknown>>} Canvas doodle shapes.
 */
function renderBoard(game) {
  const shapes = /** @type {Array<Record<string, unknown>>} */ ([
    { type: 'rect', x: 0, y: 0, width: WIDTH, height: HEIGHT, fill: '#071a26' },
    {
      type: 'text',
      x: 16,
      y: 24,
      text: 'CHRONOFLOW · ARCHIVE ENTRY',
      fill: '#d8f2e8',
      font: 'bold 14px monospace',
    },
    {
      type: 'text',
      x: 16,
      y: 40,
      text: `${game.mode.toUpperCase()} · ${game.completed ? 'TARGET FILLED' : 'ROUTE WATER'}`,
      fill: '#72d8e6',
      font: '11px monospace',
    },
  ]);
  for (let cell = 0; cell < game.fluid.volume.length; cell += 1) {
    const x = BOARD_X + (cell % game.fluid.width) * (CELL_WIDTH + CELL_GAP_X);
    const y =
      BOARD_Y +
      Math.floor(cell / game.fluid.width) * (CELL_HEIGHT + CELL_GAP_Y);
    shapes.push({
      type: 'rect',
      x,
      y,
      width: CELL_WIDTH,
      height: CELL_HEIGHT,
      fill: game.fluid.solids[cell] ? '#304454' : '#133342',
    });
    const volume = game.fluid.volume[cell];
    if (volume > 0) {
      const waterHeight = Math.max(2, Math.round((CELL_HEIGHT - 4) * volume));
      shapes.push({
        type: 'rect',
        x: x + 2,
        y: y + CELL_HEIGHT - 2 - waterHeight,
        width: CELL_WIDTH - 4,
        height: waterHeight,
        fill: '#25b9d2',
      });
    }
    const label = cell === 1 ? 'S' : cell === game.targetCell ? 'T' : '';
    if (label) {
      shapes.push({
        type: 'text',
        x: x + CELL_WIDTH / 2,
        y: y + CELL_HEIGHT / 2 + 4,
        text: label,
        fill: '#eff9ec',
        font: 'bold 14px monospace',
        align: 'center',
      });
    }
  }
  shapes.push({
    type: 'text',
    x: 16,
    y: 260,
    text: `${game.route.toUpperCase()} VALVE · ${game.editsUsed}/${game.editBudget} EDITS · ${game.fluid.tick} TICKS`,
    fill: '#c0d4dc',
    font: '10px monospace',
  });
  return shapes;
}
