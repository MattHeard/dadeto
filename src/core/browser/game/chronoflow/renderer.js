import { frameRectangle } from '../mosslight-valley/renderer.js';

const WIDTH = 160;
const HEIGHT = 144;
const CELL_WIDTH = 29;
const CELL_HEIGHT = 20;
const CELL_GAP = 1;
const BOARD_X = 5;
const BOARD_Y = 23;
const COLORS = Object.freeze({
  dark: '#182f36',
  middle: '#315744',
  light: '#bfd77c',
  highlight: '#e9d88d',
  water: '#246774',
});

/**
 * Build the shared Mosslight canvas shapes for embedded and standalone play.
 * @param {{fluid: {width: number, volume: number[], solids: boolean[]}, route: string, gateOpen: boolean, completed: boolean, targetCell: number, editsUsed: number, editBudget: number}} game Current puzzle state.
 * @param {number} selectedCell Selected board cell.
 * @returns {Array<Record<string, unknown>>} Pixel-art shapes in logical 160x144 coordinates.
 */
export function renderChronoflowBoard(game, selectedCell) {
  const shapes = /** @type {Array<Record<string, unknown>>} */ ([
    frameRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT }, COLORS.dark),
    { type: 'rect', x: 2, y: 2, width: 156, height: 140, fill: COLORS.middle },
    { type: 'rect', x: 5, y: 5, width: 150, height: 13, fill: COLORS.dark },
    bitmapText('CHRONOFLOW · ARCHIVE', 8, 14, COLORS.highlight),
  ]);

  for (let cell = 0; cell < game.fluid.volume.length; cell += 1) {
    const x = BOARD_X + (cell % game.fluid.width) * (CELL_WIDTH + CELL_GAP);
    const y =
      BOARD_Y + Math.floor(cell / game.fluid.width) * (CELL_HEIGHT + CELL_GAP);
    const baseFill = game.fluid.solids[cell] ? COLORS.middle : COLORS.light;
    const selected = cell === selectedCell;
    if (selected) {
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
      x: x + (selected ? 1 : 0),
      y: y + (selected ? 1 : 0),
      width: CELL_WIDTH - (selected ? 2 : 0),
      height: CELL_HEIGHT - (selected ? 2 : 0),
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
 * @param {Array<Record<string, unknown>>} shapes Canvas shapes in draw order.
 * @param {{game: Parameters<typeof renderChronoflowBoard>[0], cell: number, x: number, y: number}} view Current cell presentation.
 */
function addWaterShape(shapes, view) {
  const { game, cell, x, y } = view;
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
 * @param {Array<Record<string, unknown>>} shapes Canvas shapes in draw order.
 * @param {{game: Parameters<typeof renderChronoflowBoard>[0], cell: number, x: number, y: number}} view Current cell presentation.
 */
function addCellLabel(shapes, view) {
  const { game, cell, x, y } = view;
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
 * @param {string} text Pixel label.
 * @param {number} x Logical screen x.
 * @param {number} y Text baseline.
 * @param {string} fill Text color.
 * @returns {Record<string, unknown>} Mosslight-compatible bitmap text shape.
 */
function bitmapText(text, x, y, fill) {
  return { type: 'text', x, y, text, fill, bitmap: true };
}
