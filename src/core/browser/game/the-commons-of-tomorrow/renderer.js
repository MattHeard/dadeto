import {
  drawCanvasShapes,
  frameRectangle,
  toFramePayload,
  wrapDialogueText,
} from '../mosslight-valley/renderer.js';
import { generateCommonsTile } from './tiles.js';
import { commonsSpriteShapes } from './sprites.js';
import { WATER_PUZZLE } from './puzzle.js';
import { commonsJournal, menuItems } from './simulation.js';
import { COMMONS_CONTENT } from './content.js';

const COLORS = Object.freeze({
  dark: '#182f36',
  ground: '#315744',
  leaf: '#bfd77c',
  gold: '#e9d88d',
  water: '#246774',
});

/**
 * Render the same authored world or puzzle snapshot for both presenters.
 * @param {Record<string, any>} state Current game state.
 * @returns {Record<string, any>} Shared 160x144 frame payload.
 */
export function renderCommons(state) {
  const status = state.world.flags.seasonalClosure
    ? 'SEASONAL PACT · REVIEW AT HIGH WATER'
    : state.world.flags.bridgeOpen
      ? 'CROSSING OPEN · MARSH LIMITS SET'
      : state.world.flags.marshRestored
        ? 'MARSH RESTORED · GATHERING MOVED'
        : state.agreements.length
          ? 'AGREEMENT RECORDED · VISIT THE CHARTER TABLE'
          : state.presentation?.status;
  const frame = toFramePayload(
    {
      ...state,
      presentation: {
        ...state.presentation,
        status,
        palette: ['#193b43', '#c7b98f', '#789c7f', '#e29162', '#397e89'],
      },
    },
    { tileGenerator: generateCommonsTile, spriteRenderer: commonsSpriteShapes }
  );
  frame.type = 'the-commons-of-tomorrow';
  frame.quest = 'The River Keeps Its Own Time';
  frame.commons = {
    evidence: state.evidence,
    agreements: state.agreements,
    practices: state.practices,
    charterRecorded: Boolean(state.world.flags.charterRecorded),
  };
  if (state.mode === 'puzzle') frame.shapes = puzzleShapes(state.puzzle);
  else if (state.menu) frame.shapes = menuShapes(frame, state);
  return frame;
}

/**
 * Draw a normal world frame or the authored Commons water-board overlay.
 * @param {any} context Canvas 2D context.
 * @param {Record<string, any>} frame Shared Commons frame.
 */
export function drawCommonsFrame(context, frame) {
  drawCanvasShapes(context, frame.shapes);
}

/**
 * Render authored Commons menu pages as opaque handheld overlays.
 * @param {Record<string, any>} frame Shared frame payload.
 * @param {Record<string, any>} state Current game state.
 * @returns {Array<Record<string, any>>} Pixel shapes for the menu page.
 */
function menuShapes(frame, state) {
  const x = 5;
  const top = 5;
  const width = 150;
  const height = 98;
  const lines = menuRows(state)
    .flatMap(line => wrapDialogueText(line, 27))
    .slice(0, 8);
  return [
    ...frame.shapes.filter(
      (/** @type {Record<string, any>} */ shape) => shape.y < 108
    ),
    frameRectangle({ x, y: top, width, height }, COLORS.dark),
    frameRectangle(
      { x: x + 1, y: top + 1, width: width - 2, height: 1 },
      COLORS.leaf
    ),
    frameRectangle(
      { x: x + 1, y: top + 1, width: 1, height: height - 2 },
      COLORS.leaf
    ),
    frameRectangle(
      { x: x + width - 2, y: top + 1, width: 1, height: height - 2 },
      COLORS.leaf
    ),
    ...lines.map((line, index) => text(line, 9, 18 + index * 10, COLORS.gold)),
  ];
}

/**
 * Build the selected Commons page and its bounded journal details.
 * @param {Record<string, any>} state Current game state.
 * @returns {string[]} Visible menu rows.
 */
function menuRows(state) {
  const page = state.menu.page;
  const rows = [page.toUpperCase().replaceAll('-', ' ')];
  if (page === 'journal')
    rows.push(
      ...commonsJournal(state)
        .slice(0, 3)
        .map(item => `${item.status}: ${item.title}`)
    );
  else if (page === 'charter')
    rows.push(
      state.charter?.text ||
        state.agreements[0]?.terms ||
        'No agreement recorded yet.',
      'Seasonal ecological boundaries are reviewed with affected residents.',
      'Shared spaces remain accessible alternatives when their route closes.'
    );
  else if (page === 'practices')
    rows.push(
      ...state.practices.map(
        (/** @type {string} */ id) => `Practice learned: ${id}`
      )
    );
  const entries = menuItems(page, state, COMMONS_CONTENT);
  rows.push(
    ...entries.map(
      (entry, index) =>
        `${state.menu.selected === index ? '>' : ' '} ${entry[0]}`
    )
  );
  rows.push('A CHOOSE · B BACK · X CLOSE');
  return rows.slice(0, 6);
}

/**
 * Render the deterministic water board and its concise handheld instructions.
 * @param {Record<string, any>} puzzle Current puzzle state.
 * @returns {Array<Record<string, any>>} Pixel shapes for the board.
 */
function puzzleShapes(puzzle) {
  const cellWidth = 29;
  const cellHeight = 18;
  const gap = 1;
  const left = 5;
  const top = 22;
  const selected = puzzle.selectedCell ?? 7;
  const shapes = [
    frameRectangle({ x: 0, y: 0, width: 160, height: 144 }, COLORS.dark),
    frameRectangle({ x: 3, y: 3, width: 154, height: 138 }, COLORS.ground),
    text('LIVING WEIR · FLOW BOARD', 7, 13, COLORS.gold),
  ];
  for (
    let cell = 0;
    cell < WATER_PUZZLE.width * WATER_PUZZLE.height;
    cell += 1
  ) {
    const x = left + (cell % WATER_PUZZLE.width) * (cellWidth + gap);
    const y = top + Math.floor(cell / WATER_PUZZLE.width) * (cellHeight + gap);
    const fill = puzzle.fluid.solids[cell] ? COLORS.dark : COLORS.leaf;
    if (cell === selected)
      shapes.push(
        frameRectangle(
          { x: x - 1, y: y - 1, width: cellWidth + 2, height: cellHeight + 2 },
          COLORS.gold
        )
      );
    shapes.push(
      frameRectangle({ x, y, width: cellWidth, height: cellHeight }, fill)
    );
    const volume = puzzle.fluid.volume[cell];
    if (volume > 0) {
      const height = Math.max(2, Math.round((cellHeight - 4) * volume));
      shapes.push(
        frameRectangle(
          {
            x: x + 2,
            y: y + cellHeight - height - 2,
            width: cellWidth - 4,
            height,
          },
          COLORS.water
        )
      );
    }
    const label =
      cell === 1
        ? 'S'
        : cell === 13
          ? puzzle.gateOpen
            ? 'O'
            : 'G'
          : cell === 19
            ? 'IN'
            : '';
    if (label) shapes.push(text(label, x + 8, y + 12, COLORS.dark));
  }
  const percent = Math.round(puzzle.fluid.volume[WATER_PUZZLE.target] * 100);
  shapes.push(
    frameRectangle({ x: 5, y: 101, width: 150, height: 13 }, COLORS.dark),
    text(
      puzzle.completed
        ? 'WATER REACHES THE INLET'
        : `${puzzle.route.toUpperCase()} ${puzzle.gateOpen ? 'GATE OPEN' : 'GATE CLOSED'} · ${percent}%`,
      8,
      110,
      COLORS.leaf
    ),
    text(
      `${puzzle.editsUsed}/${puzzle.editBudget} EDITS · ARROWS SELECT`,
      8,
      122,
      COLORS.gold
    ),
    text('A CARVE/OPEN · B ROUTE · Y FLOW', 8, 132, COLORS.leaf),
    text('X RETURN TO DISTRICT', 8, 140, COLORS.leaf)
  );
  return shapes;
}

/**
 * Create one pixel-font text shape.
 * @param {string} value Visible text.
 * @param {number} x Logical pixel x.
 * @param {number} y Logical pixel baseline.
 * @param {string} fill Text color.
 * @returns {Record<string, any>} Canvas text shape.
 */
function text(value, x, y, fill) {
  return {
    type: 'text',
    text: value,
    x,
    y,
    fill,
    font: '7px monospace',
    bitmap: true,
  };
}
