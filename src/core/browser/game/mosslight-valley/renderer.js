// @ts-nocheck -- render state is a plain JSON payload consumed by both views.
import { cameraFor } from './world.js';
import { generateBackgroundTile } from './tileGenerator.js';
import { spriteShapes } from './sprites.js';
import { crossingPixels } from './scenery.js';
import { drawPixelText } from '../../pixelFont.js';
import { menuLines } from './controls.js';
const PALETTES = {
  village: ['#182f36', '#315744', '#bfd77c', '#e9d88d'],
  shore: ['#182f36', '#246774', '#b9e2ce', '#e5d39c'],
  orchard: ['#253b32', '#465c38', '#cbd889', '#e7cf86'],
  hollow: ['#1c203c', '#3e4670', '#c1c0e2', '#d7d0a0'],
};
/**
 * Build the same pixel-art frame payload for page and embedded renderer.
 * @param {unknown} state - The state argument.
 * @returns {unknown} The computed result.
 */
export function toFramePayload(state) {
  const palette =
    state.presentation?.palette ||
    PALETTES[state.world.map.palette] ||
    PALETTES.village;
  const camera = cameraFor(state.world, 13, 9);
  const frame = {
    type: 'mosslight-valley',
    width: 160,
    height: 144,
    pixelated: true,
    camera,
    palette,
    world: state.world,
    player: state.world.player,
    npcs: state.world.npcs.filter(npc => npc.map === state.world.mapId),
    dialogue: state.dialogue,
    battle: state.battle,
    mode: state.mode,
    journal: state.journal,
    inventory: state.inventory,
    menu: state.menu,
    quickAction: state.quickAction || 'fish',
    quest: state.world.flags.gardenShared
      ? 'The Borrowed Memory'
      : 'A Noise Under the Well',
    toast: state.toast,
    ending: state.ending,
    tick: state.tick,
    presentation: state.presentation,
  };
  frame.shapes = toCanvasShapes(frame);
  return frame;
}
/**
 *
 * @param {unknown} frame - The frame argument.
 * @returns {unknown} The computed result.
 */
function toCanvasShapes(frame) {
  const layers = worldLayers(frame);
  const shapes = [...layers.scenery, ...layers.signs];
  shapes.push(...hudShapes(frame));
  if (frame.menu) shapes.push(...controllerShapes(frame));
  else if (frame.dialogue)
    shapes.push(...dialogueShapes(frame.dialogue, '#182f36', '#e9d88d'));
  return shapes;
}

/**
 * Keep world depth and navigation annotations identical across both presenters.
 * @param {object} frame Shared game frame.
 * @returns {{scenery: object[], signs: object[]}} Paintable world layers.
 */
function worldLayers(frame) {
  const crossings = crossingShapes(frame);
  return {
    scenery: [
      ...terrainShapes(frame),
      ...crossings.tiles,
      ...foregroundShapes(frame),
    ],
    signs: crossings.signs,
  };
}
/**
 * Fill the viewport, clipping the partial rightmost tile.
 * @param {object} frame Shared game frame.
 * @returns {object[]} Opaque terrain shapes.
 */
function terrainShapes(frame) {
  const shapes = [
    frameRectangle({ x: 0, y: 0, width: 160, height: 144 }, frame.palette[0]),
  ];
  const map = frame.world.map;
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 14; x++) {
      const wx = x + frame.camera.x;
      const wy = y + frame.camera.y;
      if (wx >= map.width || wy >= map.height) continue;
      const blocked = map.blocked.includes(`${wx},${wy}`);
      for (const rect of generateBackgroundTile({
        x: wx,
        y: wy,
        palette: frame.palette,
        region: map.palette,
        blocked,
        roof: !map.blocked.includes(`${wx},${wy - 1}`),
      })) {
        const left = x * 12 + rect.x;
        if (left >= 160) continue;
        shapes.push({
          type: 'rect',
          x: left,
          y: y * 12 + rect.y,
          width: Math.min(rect.width, 160 - left),
          height: rect.height,
          fill: rect.fill,
        });
      }
    }
  return shapes;
}
/**
 * Draw named crossings in both renderers, including the story-locked Hollow gate.
 * @param {object} frame Shared game frame.
 * @returns {{tiles: object[], signs: object[]}} World art and foreground destination annotations.
 */
function crossingShapes(frame) {
  const map = frame.world.map;
  const tiles = [];
  const signs = [];
  for (const exit of map.exits || []) {
    const x = (exit.x - frame.camera.x) * 12;
    const y = (exit.y - frame.camera.y) * 12;
    if (x < 0 || x >= 160 || y < 0 || y >= 108) continue;
    const direction =
      exit.x === 0
        ? 'left'
        : exit.x === map.width - 1
          ? 'right'
          : exit.y === 0
            ? 'up'
            : 'down';
    const locked = Boolean(exit.requires && !frame.world.flags[exit.requires]);
    const art = crossingPixels({
      direction,
      gateway: exit.map === 'hollow',
      locked,
      palette: frame.palette,
    });
    const label = `${exit.map.toUpperCase()}${locked ? ' SEALED' : ''}`;
    const width = label.length * 5 + 4;
    const left = Math.floor(
      Math.max(0, Math.min(160 - width, x - width / 2 + 6))
    );
    const top = Math.max(0, Math.min(96, y - 12));
    const pixels = art.map(pixel => ({
      ...pixel,
      type: 'rect',
      x: pixel.x + x,
      y: pixel.y + y,
    }));
    tiles.push(...pixels);
    signs.push(
      frameRectangle({ x: left, y: top, width, height: 10 }, frame.palette[0]),
      {
        type: 'text',
        x: left + 2,
        y: top + 8,
        text: label,
        fill: frame.palette[3],
        font: '7px monospace',
        bitmap: true,
      }
    );
  }
  return { tiles, signs };
}
/**
 * Construct the shared opaque background contract for scenery and HUD panels.
 * @param {object} bounds Logical-screen rectangle bounds.
 * @param {string} fill Palette color.
 * @returns {object} Renderable rectangle.
 */
function frameRectangle(bounds, fill) {
  return { type: 'rect', ...bounds, fill };
}
/**
 * Fit a single HUD row with an explicit overflow marker.
 * @param {string} text HUD prose.
 * @returns {string} Bounded label.
 */
function fitHudText(text) {
  return text.length > 30 ? `${text.slice(0, 29)}…` : text;
}
/**
 * Share compact location, objective and two message rows between presenters.
 * @param {object} frame Shared game frame.
 * @returns {object[]} HUD shapes.
 */
function hudShapes(frame) {
  const rows = wrapDialogueText(frame.toast || 'Move · interact · listen', 30);
  return [
    frameRectangle({ x: 0, y: 108, width: 160, height: 36 }, '#141c2c'),
    frameText(
      fitHudText(
        `${frame.world.map.name} D${frame.world.day} ${Math.floor(frame.world.time).toString().padStart(2, '0')}:00`
      ),
      115,
      '#e9d88d'
    ),
    frameText(
      fitHudText(
        frame.presentation?.status ||
          `♥ ${frame.world.flags.memoryCount || 0}/3 · ${frame.quest}`
      ),
      124,
      '#e8e1c0'
    ),
    frameText(rows[0], 133, '#93ad68'),
    frameText(fitHudText(rows.slice(1).join(' ')), 142, '#93ad68'),
  ];
}
/**
 * Create one HUD text shape with the shared left gutter.
 * @param {string} text - Visible HUD label.
 * @param {number} y - Logical-screen baseline coordinate.
 * @param {string} fill - Palette color.
 * @param {string} font - Canvas font declaration.
 * @returns {object} Canvas presenter text shape.
 */
function frameText(text, y, fill, font = '7px monospace') {
  return { type: 'text', x: 4, y, text, fill, font, bitmap: true };
}
/**
 * Draw tile art, actors, weather, menu and story UI into a 160×144 canvas.
 * @param {unknown} context - The context argument.
 * @param {unknown} frame - The frame argument.
 */
export function drawGameFrame(context, frame) {
  const [p0, , , p3] = frame.palette;
  context.imageSmoothingEnabled = false;
  const layers = worldLayers(frame);
  drawShapes(context, layers.scenery);
  if (frame.world.weather === 'rain' || frame.world.weather === 'dream') {
    context.fillStyle = frame.world.weather === 'dream' ? '#e7d6ff' : '#b8d6df';
    for (let i = 0; i < 12; i++) {
      const x = (i * 29 + frame.tick * 2) % 160;
      context.fillRect(x, (i * 17 + frame.tick * 3) % 108, 1, 4);
    }
  }
  drawShapes(context, layers.signs);
  drawShapes(context, hudShapes(frame));
  if (frame.menu) drawShapes(context, controllerShapes(frame));
  else if (frame.dialogue) drawDialogue(context, frame, p0, p3);
  else if (frame.mode === 'journal') drawJournal(context, frame, p0, p3);
  else if (frame.battle) drawBattle(context, frame, p0, p3);
  if (frame.ending) drawEnding(context, frame, p0, p3);
}
/**
 * Share foreground artwork and depth ordering between game views.
 * @param {object} frame Game frame.
 * @returns {object[]} Foreground pixel shapes.
 */
function foregroundShapes(frame) {
  return [
    ...(frame.world.map.objects || []),
    ...frame.npcs,
    { ...frame.player, id: 'player' },
  ]
    .sort((a, b) => a.y - b.y)
    .flatMap(actor => spriteShapes(actor, frame.camera, frame.tick));
}

/**
 * Present the controller menu identically in standalone and embedded canvases.
 * @param {object} frame Shared frame snapshot.
 * @returns {object[]} Opaque bounded menu shapes.
 */
function controllerShapes(frame) {
  const background = [
    frameRectangle({ x: 3, y: 3, width: 154, height: 104 }, '#182f36'),
  ];
  return textPanel(
    background,
    (frame.presentation?.menuRows || menuLines(frame)).map(text =>
      text.slice(0, 30)
    ),
    { x: 6, y: 13, fill: '#e9d88d', font: '7px monospace' }
  );
}

/**
 * Compose opaque UI panels and their pixel-font rows for both presenters.
 * @param {object[]} background Panel background shapes.
 * @param {string[]} rows Visible text rows.
 * @param {{x: number, y: number, fill: string, font: string}} style Text placement and palette.
 * @returns {object[]} Shared panel shapes.
 */
function textPanel(background, rows, { x, y, fill, font }) {
  const text = rows.map((row, index) => ({
    ...frameText(row, y + index * 10, fill, font),
    x,
  }));
  return background.concat(text);
}
/**
 *
 * @param {unknown} ctx - The ctx argument.
 * @param {unknown} frame - The frame argument.
 * @param {unknown} dark - The dark argument.
 * @param {unknown} light - The light argument.
 */
function drawDialogue(ctx, frame, dark, light) {
  drawShapes(ctx, dialogueShapes(frame.dialogue, dark, light));
}
/**
 * Paint the shared rectangle and text contract.
 * @param {object} ctx Canvas context.
 * @param {object[]} shapes Renderable shapes.
 */
function drawShapes(ctx, shapes) {
  for (const shape of shapes) {
    ctx.fillStyle = shape.fill;
    if (shape.type === 'rect')
      ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
    else {
      ctx.font = shape.font;
      drawPixelText(ctx, shape.text, shape.x, shape.y);
    }
  }
}

/**
 * Wrap pixel-font prose into conservative 140px-wide rows, including long words.
 * @param {string} text Authored dialogue text.
 * @param {number} [columns] Maximum characters per row.
 * @returns {string[]} Rows fitting the shared 8px monospace font.
 */
export function wrapDialogueText(text, columns = 28) {
  const words = text
    .split(/\s+/)
    .flatMap(word => word.match(new RegExp(`.{1,${columns}}`, 'gu')) || []);
  const rows = [''];
  for (const word of words) {
    const index = rows.length - 1;
    const trial = [rows[index], word].filter(Boolean).join(' ');
    if (trial.length > columns) rows.push(word);
    else rows[index] = trial;
  }
  return rows;
}

/**
 * Lay out a bordered dialogue panel above the HUD for both presenters.
 * @param {object} dialogue Current conversation and highlighted choice.
 * @param {string} dark Panel background.
 * @param {string} light Border and text color.
 * @returns {object[]} Canvas shapes with identical text and spacing in both modes.
 */
function dialogueShapes(dialogue, dark, light) {
  const rows = wrapDialogueText(dialogue.lines[dialogue.index]?.text || '');
  const choices = dialogue.choices || [];
  if (choices.length) {
    const selected = dialogue.selected || 0;
    rows.push('');
    rows.push(
      ...wrapDialogueText(
        `${selected + 1}/${choices.length} › ${choices[selected].label}`
      )
    );
  }
  rows.push(choices.length ? '↑↓ choose · A confirm' : 'A continue · B close');
  const height = rows.length * 10 + 14;
  const top = 106 - height;
  const background = [
    { type: 'rect', x: 3, y: top, width: 154, height, fill: light },
    {
      type: 'rect',
      x: 4,
      y: top + 1,
      width: 152,
      height: height - 2,
      fill: dark,
    },
  ];
  return textPanel(background, rows, {
    x: 8,
    y: top + 12,
    fill: light,
    font: '8px monospace',
  });
}
/**
 *
 * @param {unknown} ctx - The ctx argument.
 * @param {unknown} frame - The frame argument.
 * @param {unknown} dark - The dark argument.
 * @param {unknown} light - The light argument.
 */
function drawBattle(ctx, frame, dark, light) {
  ctx.fillStyle = dark;
  ctx.fillRect(5, 6, 150, 94);
  ctx.strokeStyle = light;
  ctx.strokeRect(6, 7, 148, 92);
  ctx.fillStyle = light;
  ctx.font = '10px monospace';
  drawPixelText(ctx, frame.battle.name, 12, 21);
  drawPixelText(ctx, `HP ${frame.battle.hp}/${frame.battle.maxHp}`, 12, 34);
  drawPixelText(ctx, 'Your posture is being read.', 12, 57);
  drawPixelText(ctx, 'A attack  X actions  Y bind', 12, 83);
}
/**
 *
 * @param {unknown} ctx - The ctx argument.
 * @param {unknown} frame - The frame argument.
 * @param {unknown} dark - The dark argument.
 * @param {unknown} light - The light argument.
 */
function drawJournal(ctx, frame, dark, light) {
  ctx.fillStyle = dark;
  ctx.fillRect(5, 5, 150, 98);
  ctx.strokeStyle = light;
  ctx.strokeRect(6, 6, 148, 96);
  ctx.fillStyle = light;
  ctx.font = '9px monospace';
  drawPixelText(ctx, 'FIELD JOURNAL', 12, 19);
  drawPixelText(
    ctx,
    `Memories ${frame.world.flags.memoryCount || 0}/3`,
    12,
    35
  );
  drawPixelText(ctx, `Items ${Object.keys(frame.inventory).length}`, 12, 48);
  drawPixelText(
    ctx,
    `Bond: Mira ${frame.world.relationships.mira || 0}`,
    12,
    61
  );
  drawPixelText(ctx, 'A / B / X close', 12, 87);
}
/**
 *
 * @param {unknown} ctx - The ctx argument.
 * @param {unknown} frame - The frame argument.
 * @param {unknown} dark - The dark argument.
 * @param {unknown} light - The light argument.
 */
function drawEnding(ctx, frame, dark, light) {
  ctx.fillStyle = dark;
  ctx.fillRect(4, 20, 152, 76);
  ctx.strokeStyle = light;
  ctx.strokeRect(5, 21, 150, 74);
  ctx.fillStyle = light;
  ctx.font = '9px monospace';
  drawPixelText(ctx, 'THE VALLEY WAKES', 18, 39);
  wrapText({
    ctx,
    text: frame.ending.text,
    x: 12,
    y: 54,
    maxWidth: 136,
    lineHeight: 11,
  });
}
/**
 *
 * @param {object} options - Canvas context and text layout details.
 */
function wrapText(options) {
  const { ctx, text, x, maxWidth, lineHeight } = options;
  let y = options.y;
  let line = '';
  for (const word of text.split(' ')) {
    const trial = line ? `${line} ${word}` : word;
    if (trial.length * 5 > maxWidth && line) {
      drawPixelText(ctx, line, x, y);
      line = word;
      y += lineHeight;
    } else line = trial;
  }
  if (line) drawPixelText(ctx, line, x, y);
}
