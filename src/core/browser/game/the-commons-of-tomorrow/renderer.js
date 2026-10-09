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
import { COMMONS_GAME_VERSION } from './version.js';

const COLORS = Object.freeze({
  dark: '#182f36',
  ground: '#315744',
  leaf: '#bfd77c',
  gold: '#e9d88d',
  water: '#246774',
});
const WEIR_PALETTE = Object.freeze([
  '#182f36',
  '#617369',
  '#68786d',
  '#e29162',
  '#355760',
]);

/**
 * Render the same authored world or puzzle snapshot for both presenters.
 * @param {Record<string, any>} state Current game state.
 * @returns {Record<string, any>} Shared 160x144 frame payload.
 */
export function renderCommons(state) {
  const menu = state.menu;
  const status = state.world.flags.seasonalClosure
    ? 'SEASONAL PACT · REVIEW AT HIGH WATER'
    : state.world.flags.bridgeOpen
      ? 'CROSSING OPEN · MARSH LIMITS SET'
      : state.world.flags.footbridgeStabilized
        ? 'HANDRAIL STABILIZED · CROSSING STILL CLOSED'
        : state.world.flags.marshRestored
          ? 'MARSH RESTORED · GATHERING MOVED'
          : state.agreements.length
            ? 'AGREEMENT RECORDED · VISIT THE CHARTER TABLE'
            : state.presentation?.status;
  const frame = toFramePayload(
    {
      ...state,
      menu: null,
      presentation: {
        ...state.presentation,
        status,
        palette:
          state.world.mapId === 'weir'
            ? WEIR_PALETTE
            : ['#193b43', '#c7b98f', '#789c7f', '#e29162', '#397e89'],
      },
    },
    {
      tileGenerator: /** @type {any} */ (generateCommonsTile),
      spriteRenderer: commonsSpriteShapes,
    }
  );
  frame.menu = menu;
  frame.type = 'the-commons-of-tomorrow';
  frame.quest = 'The River Keeps Its Own Time';
  frame.commons = {
    gameVersion: COMMONS_GAME_VERSION,
    evidence: state.evidence,
    agreements: state.agreements,
    practices: state.practices,
    charterRecorded: Boolean(state.world.flags.charterRecorded),
  };
  frame.commons.path = state.world.map.walkways;
  if (state.mode === 'puzzle') frame.shapes = puzzleShapes(state.puzzle);
  else if (state.menu) frame.shapes = menuShapes(frame, state);
  else if (!state.dialogue && state.mode === 'world') {
    frame.shapes = frame.shapes.filter(
      (/** @type {Record<string, any>} */ shape) => shape.y < 110
    );
    frame.shapes.push(...overworldMessageShapes(state));
  }
  return frame;
}

/**
 * Keep the first district prompt tied to what the player has learned so far.
 * @param {Record<string, any>} state Current game state.
 * @returns {string} Contextual field message.
 */
function commonsOpeningPrompt(state) {
  const flags = state.world.flags;
  if (!flags.earlyFloodMarkRead) return 'RIVER UP · CHECK FLOOD MARK';
  if (!flags['heard-june'] || !flags['heard-elian'])
    return 'TALK TO JUNE AND ELIAN';
  return 'WEIR → · FOLLOW LIGHT PATH';
}

/**
 * Replace the shared multi-row HUD with one relevant overworld instruction.
 * @param {Record<string, any>} state Current game state.
 * @returns {string} One line of bounded contextual text.
 */
function compactOverworldPrompt(state) {
  const message = state.toast?.trim();
  const prompt =
    message && message !== ' '
      ? message
      : state.world.mapId === 'commons'
        ? commonsOpeningPrompt(state)
        : state.agreements.length && !state.world.flags.charterRecorded
          ? 'RETURN TO CANOPY · RECORD CHARTER'
          : state.puzzle.completed && !state.agreements.length
            ? 'RETURN TO FOOTBRIDGE · DECIDE'
            : 'WEIR · GAUGE / REEDS / FLOW BOARD';
  return prompt;
}

/**
 * Draw a two-row field note and a scrollbar when a longer note is open.
 * @param {Record<string, any>} state Current game state.
 * @returns {Array<Record<string, any>>} Bottom message panel shapes.
 */
function overworldMessageShapes(state) {
  const messageLines = wrapDialogueText(compactOverworldPrompt(state), 29);
  const rows = state.hudReading
    ? messageLines.slice(state.hudScroll || 0, (state.hudScroll || 0) + 2)
    : messageLines.length === 1
      ? [state.world.map.name.toUpperCase(), messageLines[0]]
      : messageLines.slice(0, 2);
  const shapes = [
    frameRectangle({ x: 0, y: 109, width: 160, height: 35 }, COLORS.dark),
    frameRectangle({ x: 0, y: 109, width: 160, height: 1 }, COLORS.leaf),
    ...rows.map((line, index) => text(line, 4, 119 + index * 10, COLORS.gold)),
  ];
  if (state.hudReading && messageLines.length > 2) {
    const trackHeight = 26;
    const thumbHeight = Math.max(
      4,
      Math.floor((trackHeight * 2) / messageLines.length)
    );
    const maxScroll = messageLines.length - 2;
    const thumbTop =
      113 +
      Math.floor(
        ((trackHeight - thumbHeight) * (state.hudScroll || 0)) / maxScroll
      );
    shapes.push(
      frameRectangle(
        { x: 154, y: 113, width: 2, height: trackHeight },
        COLORS.ground
      ),
      frameRectangle(
        { x: 153, y: thumbTop, width: 4, height: thumbHeight },
        COLORS.leaf
      )
    );
  }
  return shapes;
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
  const title =
    page === 'assign'
      ? 'ASSIGN AN ACTION TO B'
      : page.toUpperCase().replaceAll('-', ' ');
  const info = [];
  if (page === 'journal')
    info.push(
      ...commonsJournal(state)
        .slice(0, 3)
        .map(item => `${item.status}: ${item.title}`)
    );
  else if (page === 'charter')
    info.push(
      state.charter?.text ||
        state.agreements[0]?.terms ||
        'No agreement recorded yet.',
      'Seasonal ecological boundaries are reviewed with affected residents.',
      'Shared spaces remain accessible alternatives when their route closes.'
    );
  else if (page === 'practices')
    info.push(
      ...state.practices.map(
        (/** @type {string} */ id) => `Practice learned: ${id}`
      )
    );
  else if (page === 'assign')
    info.push('Choose what B performs while facing a person or feature.');
  const entries = menuItems(page, state, COMMONS_CONTENT);
  const titleRows = wrapDialogueText(title, 27);
  const infoRows = info.flatMap(line => wrapDialogueText(line, 27));
  const selected = Math.max(
    0,
    Math.min(state.menu.selected || 0, entries.length - 1)
  );
  const choiceRows = entries.map((entry, index) =>
    wrapDialogueText(`${index === selected ? '>' : ' '} ${entry[0]}`, 27)
  );
  const footer =
    page === 'assign'
      ? 'A SET · B BACK · X CLOSE'
      : 'A CHOOSE · B BACK · X CLOSE';
  const footerRows = wrapDialogueText(footer, 27);
  const selectedRows = choiceRows[selected] || [];
  const infoLimit = Math.max(
    0,
    8 - titleRows.length - footerRows.length - selectedRows.length
  );
  const visibleInfo = infoRows.slice(0, infoLimit);
  const choiceCapacity =
    8 - titleRows.length - footerRows.length - visibleInfo.length;
  const visible = new Set([selected]);
  let used = selectedRows.length;
  for (let distance = 1; distance < entries.length; distance += 1)
    for (const candidate of [selected - distance, selected + distance]) {
      const candidateRows = choiceRows[candidate];
      if (candidateRows && used + candidateRows.length <= choiceCapacity) {
        visible.add(candidate);
        used += candidateRows.length;
      }
    }
  const choices = [...visible]
    .sort((left, right) => left - right)
    .flatMap(index => choiceRows[index]);
  return [...titleRows, ...visibleInfo, ...choices, ...footerRows].slice(0, 8);
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
    text('ROUTE WATER TO THE INLET', 7, 13, COLORS.gold),
  ];
  for (
    let cell = 0;
    cell < WATER_PUZZLE.width * WATER_PUZZLE.height;
    cell += 1
  ) {
    const x = left + (cell % WATER_PUZZLE.width) * (cellWidth + gap);
    const y = top + Math.floor(cell / WATER_PUZZLE.width) * (cellHeight + gap);
    const cellKind = puzzleCellKind(puzzle, cell);
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
    shapes.push(
      ...puzzleCellArt({
        kind: cellKind,
        cell,
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        fill,
      })
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
        : cell === 7
          ? '8'
          : cell === 11
            ? '12'
            : cell === 13
              ? puzzle.gateOpen
                ? 'O'
                : 'G'
              : cell === 19
                ? 'IN'
                : '';
    if (label)
      shapes.push(
        text(label, x + 8, y + 12, volume > 0 ? COLORS.gold : COLORS.dark)
      );
  }
  const percent = Math.round(puzzle.fluid.volume[WATER_PUZZLE.target] * 100);
  shapes.push(
    frameRectangle({ x: 5, y: 99, width: 150, height: 43 }, COLORS.dark),
    text('ROCK #   CUT <>   FLOW ~', 8, 107, COLORS.gold),
    text(
      `${puzzle.route.toUpperCase()} · GATE ${puzzle.gateOpen ? 'OPEN' : 'CLOSED'}`,
      8,
      116,
      COLORS.leaf
    ),
    text(
      `INLET ${percent}% · EDITS USED ${puzzle.editsUsed}/${puzzle.editBudget}`,
      8,
      125,
      COLORS.gold
    ),
    text(puzzleNextStep(puzzle, selected), 8, 134, COLORS.leaf),
    text(
      puzzle.completed
        ? 'X RETURN · FOOTBRIDGE WEST'
        : 'Y TEST FLOW · X RETURN',
      8,
      141,
      COLORS.leaf
    )
  );
  return shapes;
}

/**
 * Identify the authored role of a board cell for its pixel-art treatment.
 * @param {Record<string, any>} puzzle Current water board.
 * @param {number} cell Board cell index.
 * @returns {string} Semantic cell kind.
 */
function puzzleCellKind(puzzle, cell) {
  if (cell === 1) return 'source';
  if (cell === WATER_PUZZLE.target) return 'inlet';
  if (cell === 13) return puzzle.gateOpen ? 'open-gate' : 'gate';
  if (WATER_PUZZLE.editableCells.includes(cell))
    return puzzle.fluid.solids[cell] ? 'cut-channel' : 'channel';
  if (puzzle.fluid.solids[cell]) return 'bedrock';
  return 'basin';
}

/**
 * Add a compact authored motif that makes each board cell role readable.
 * @param {Record<string, any>} cellData Cell role, index, dimensions and fill.
 * @returns {Array<Record<string, any>>} Pixel-art details.
 */
function puzzleCellArt({ kind, cell, x, y, width, height, fill }) {
  if (kind === 'source')
    return [
      frameRectangle(
        { x: x + 4, y: y + 4, width: 21, height: 10 },
        COLORS.water
      ),
      text('S', x + 12, y + 12, COLORS.gold),
    ];
  if (kind === 'bedrock')
    return [
      frameRectangle(
        { x: x + 3 + (cell % 4), y: y + 3, width: 7, height: 3 },
        COLORS.ground
      ),
      frameRectangle(
        { x: x + 16, y: y + 7 + (cell % 3), width: 9, height: 4 },
        COLORS.ground
      ),
      frameRectangle(
        { x: x + 9 + (cell % 5), y: y + 14, width: 5, height: 2 },
        COLORS.ground
      ),
    ];
  if (kind === 'cut-channel')
    return [
      ...puzzleChannelBed(x, y, COLORS.dark),
      text('·', x + 13, y + 11, COLORS.gold),
    ];
  if (kind === 'channel') return puzzleChannelBed(x, y, COLORS.water);
  if (kind === 'gate' || kind === 'open-gate')
    return [
      frameRectangle(
        { x: x + 5, y: y + 3, width: 19, height: 12 },
        COLORS.ground
      ),
      frameRectangle(
        { x: x + 8, y: y + 4, width: 3, height: 10 },
        kind === 'gate' ? COLORS.gold : COLORS.water
      ),
      frameRectangle(
        { x: x + 13, y: y + 4, width: 3, height: 10 },
        kind === 'gate' ? COLORS.gold : COLORS.water
      ),
      frameRectangle(
        { x: x + 18, y: y + 4, width: 3, height: 10 },
        kind === 'gate' ? COLORS.gold : COLORS.water
      ),
    ];
  if (kind === 'inlet')
    return [
      frameRectangle(
        { x: x + 5, y: y + 3, width: 19, height: 12 },
        COLORS.water
      ),
      frameRectangle({ x: x + 8, y: y + 5, width: 13, height: 8 }, fill),
      frameRectangle({ x: x + 10, y: y + 7, width: 9, height: 4 }, COLORS.gold),
    ];
  return [
    ...puzzlePixels([
      {
        rectangle: {
          x: x + 4 + (cell % 5),
          y: y + 4 + (cell % 3),
          width: 4,
          height: 3,
        },
        fill: COLORS.gold,
      },
      {
        rectangle: {
          x: x + width - 9 - (cell % 4),
          y: y + height - 7 - (cell % 3),
          width: 4,
          height: 2 + (cell % 2),
        },
        fill: COLORS.water,
      },
    ]),
  ];
}

/**
 * Draw authored puzzle pixel rectangles from a compact motif description.
 * @param {Array<{rectangle: {x: number, y: number, width: number, height: number}, fill: string}>} pixels Pixel motifs.
 * @returns {Array<Record<string, any>>} Pixel rectangles.
 */
function puzzlePixels(pixels) {
  return pixels.map(({ rectangle, fill }) => frameRectangle(rectangle, fill));
}

/**
 * Draw the shared raised bed around a channel cell.
 * @param {number} x Cell origin x.
 * @param {number} y Cell origin y.
 * @param {string} waterFill Interior channel color.
 * @returns {Array<Record<string, any>>} Channel bed and interior shapes.
 */
function puzzleChannelBed(x, y, waterFill) {
  return puzzlePixels([
    {
      rectangle: { x: x + 3, y: y + 4, width: 23, height: 10 },
      fill: COLORS.ground,
    },
    {
      rectangle: { x: x + 6, y: y + 6, width: 17, height: 6 },
      fill: waterFill,
    },
  ]);
}

/**
 * Give one actionable next step for the current route and selected cell.
 * @param {Record<string, any>} puzzle Current water board.
 * @param {number} selected Selected zero-based board cell.
 * @returns {string} Short next action that fits the handheld frame.
 */
function puzzleNextStep(puzzle, selected) {
  if (puzzle.completed) return 'PUZZLE SOLVED · INLET FILLED';
  if (puzzle.route !== 'commons') return 'NEXT: B SWITCH TO COMMONS';
  if (puzzle.fluid.solids[11]) {
    if (puzzle.editsUsed >= puzzle.editBudget)
      return 'X BACK · ACTIONS: RESET BOARD';
    return selected === 11
      ? 'NEXT: A CARVE CHANNEL 12'
      : 'NEXT: ARROWS TO 12 · A CARVE';
  }
  if (!puzzle.gateOpen)
    return selected === 13 ? 'NEXT: A OPEN GATE' : 'NEXT: ARROWS TO G · A OPEN';
  return 'NEXT: Y TEST FLOW UNTIL INLET';
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
