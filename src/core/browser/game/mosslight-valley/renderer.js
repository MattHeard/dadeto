// @ts-nocheck -- render state is a plain JSON payload consumed by both views.
import { cameraFor } from './world.js';
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
  const palette = PALETTES[state.world.map.palette] || PALETTES.village;
  const camera = cameraFor(state.world, 12, 9);
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
    quest: state.world.flags.gardenShared
      ? 'The Borrowed Memory'
      : 'A Noise Under the Well',
    toast: state.toast,
    ending: state.ending,
    tick: state.tick,
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
  const shapes = [];
  const map = frame.world.map;
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 12; x++) {
      const wx = x + frame.camera.x;
      const wy = y + frame.camera.y;
      if (wx < map.width && wy < map.height)
        shapes.push({
          type: 'rect',
          x: x * 12,
          y: y * 12,
          width: 12,
          height: 12,
          fill: map.blocked.includes(`${wx},${wy}`)
            ? frame.palette[0]
            : frame.palette[((wx + wy) % 3) + 1],
        });
    }
  shapes.push({
    type: 'rect',
    x: (frame.player.x - frame.camera.x) * 12 + 3,
    y: (frame.player.y - frame.camera.y) * 12 + 2,
    width: 6,
    height: 9,
    fill: '#e57d53',
  });
  for (const npc of frame.npcs)
    shapes.push({
      type: 'rect',
      x: (npc.x - frame.camera.x) * 12 + 3,
      y: (npc.y - frame.camera.y) * 12 + 3,
      width: 6,
      height: 7,
      fill: '#eee19a',
    });
  shapes.push(
    { type: 'rect', x: 0, y: 108, width: 160, height: 36, fill: '#141c2c' },
    frameText(
      `${map.name} D${frame.world.day} ${Math.floor(frame.world.time)}:00`,
      119,
      '#e9d88d'
    ),
    frameText(`MEMORY ${frame.world.flags.memoryCount || 0}/3`, 132, '#e8e1c0'),
    frameText(
      frame.toast || 'Move · interact · listen',
      142,
      '#93ad68',
      '7px monospace'
    )
  );
  if (frame.dialogue) {
    shapes.push(
      { type: 'rect', x: 4, y: 68, width: 152, height: 38, fill: '#182f36' },
      {
        type: 'text',
        x: 8,
        y: 82,
        text: frame.dialogue.lines[frame.dialogue.index]?.text || '',
        fill: '#e9d88d',
        font: '8px monospace',
      }
    );
  }
  return shapes;
}
/**
 * Create one HUD text shape with the shared left gutter.
 * @param {string} text - Visible HUD label.
 * @param {number} y - Logical-screen baseline coordinate.
 * @param {string} fill - Palette color.
 * @param {string} font - Canvas font declaration.
 * @returns {object} Canvas presenter text shape.
 */
function frameText(text, y, fill, font = '8px monospace') {
  return { type: 'text', x: 4, y, text, fill, font };
}
/**
 * Draw tile art, actors, weather, menu and story UI into a 160×144 canvas.
 * @param {unknown} context - The context argument.
 * @param {unknown} frame - The frame argument.
 */
export function drawGameFrame(context, frame) {
  const [p0, p1, p2, p3] = frame.palette;
  context.imageSmoothingEnabled = false;
  context.fillStyle = p0;
  context.fillRect(0, 0, 160, 144);
  const map = frame.world.map;
  const tile = 12;
  for (let sy = 0; sy < 9; sy++)
    for (let sx = 0; sx < 12; sx++) {
      const x = sx + frame.camera.x,
        y = sy + frame.camera.y;
      if (x >= map.width || y >= map.height) continue;
      const blocked = map.blocked.includes(`${x},${y}`);
      context.fillStyle = blocked ? p1 : (x + y) % 4 === 0 ? p2 : p1;
      context.fillRect(sx * tile, sy * tile, tile, tile);
      context.fillStyle = blocked ? p0 : p2;
      context.fillRect(sx * tile + 2, sy * tile + 4, 2, 2);
      if (!blocked && (x * y + frame.tick) % 13 === 0) {
        context.fillStyle = p3;
        context.fillRect(sx * tile + 8, sy * tile + 2, 2, 2);
      }
    }
  for (const object of map.objects || []) {
    const sx = (object.x - frame.camera.x) * tile;
    const sy = (object.y - frame.camera.y) * tile;
    if (sx < -tile || sy < -tile || sx >= 144 || sy >= 108) continue;
    drawObject({ ctx: context, object, x: sx, y: sy, dark: p0, light: p3 });
  }
  for (const npc of frame.npcs) {
    drawActor({
      ctx: context,
      x: (npc.x - frame.camera.x) * tile,
      y: (npc.y - frame.camera.y) * tile,
      dark: p0,
      shirt: p3,
      tick: frame.tick + npc.x,
    });
  }
  drawActor({
    ctx: context,
    x: (frame.player.x - frame.camera.x) * tile,
    y: (frame.player.y - frame.camera.y) * tile,
    dark: p0,
    shirt: '#e57d53',
    tick: frame.tick,
  });
  if (frame.world.weather === 'rain' || frame.world.weather === 'dream') {
    context.fillStyle = frame.world.weather === 'dream' ? '#e7d6ff' : '#b8d6df';
    for (let i = 0; i < 12; i++) {
      const x = (i * 29 + frame.tick * 2) % 144;
      context.fillRect(x, (i * 17 + frame.tick * 3) % 108, 1, 4);
    }
  }
  context.fillStyle = '#141c2c';
  context.fillRect(0, 108, 160, 36);
  context.fillStyle = p3;
  context.font = '8px monospace';
  context.fillText(
    `${map.name}  D${frame.world.day} ${Math.floor(frame.world.time).toString().padStart(2, '0')}:00`,
    5,
    119
  );
  context.fillStyle = '#e8e1c0';
  context.fillText(
    `HEART ${frame.world.flags.memoryCount || 0}/3  ${frame.quest}`,
    5,
    130
  );
  context.fillStyle = p2;
  context.fillText(frame.toast || 'ARROWS move  Z talk  X menu', 5, 140);
  if (frame.dialogue) drawDialogue(context, frame, p0, p3);
  if (frame.battle) drawBattle(context, frame, p0, p3);
  if (frame.mode === 'journal') drawJournal(context, frame, p0, p3);
  if (frame.ending) drawEnding(context, frame, p0, p3);
}
/**
 *
 * @param {object} options - Canvas context and prop placement details.
 */
function drawObject(options) {
  const { ctx, object, x, y, dark, light } = options;
  ctx.fillStyle =
    object.kind === 'well'
      ? '#426d87'
      : object.kind === 'farm'
        ? '#795c44'
        : object.kind === 'fishing'
          ? '#eee19a'
          : light;
  ctx.fillRect(x + 3, y + 3, 6, 6);
  ctx.fillStyle = dark;
  ctx.fillRect(x + 5, y + 5, 2, 2);
}
/**
 *
 * @param {object} options - Canvas context and animated actor details.
 */
function drawActor(options) {
  const { ctx, x, y, dark, shirt, tick } = options;
  ctx.fillStyle = dark;
  ctx.fillRect(x + 3, y + 2, 6, 9);
  ctx.fillStyle = shirt;
  ctx.fillRect(x + 3, y + 5, 6, 5);
  ctx.fillStyle = '#f4d4a1';
  ctx.fillRect(x + 4, y + 1, 4, 4);
  ctx.fillStyle = dark;
  ctx.fillRect(x + 4, y + 10 + (Math.floor(tick / 8) % 2), 2, 2);
  ctx.fillRect(x + 7, y + 10 - (Math.floor(tick / 8) % 2), 2, 2);
}
/**
 *
 * @param {unknown} ctx - The ctx argument.
 * @param {unknown} frame - The frame argument.
 * @param {unknown} dark - The dark argument.
 * @param {unknown} light - The light argument.
 */
function drawDialogue(ctx, frame, dark, light) {
  ctx.fillStyle = dark;
  ctx.fillRect(3, 69, 154, 36);
  ctx.strokeStyle = light;
  ctx.strokeRect(4, 70, 152, 34);
  ctx.fillStyle = light;
  ctx.font = '8px monospace';
  const text = frame.dialogue.lines[frame.dialogue.index]?.text || '';
  wrapText({ ctx, text, x: 8, y: 82, maxWidth: 142, lineHeight: 10 });
  if (frame.dialogue.choices.length)
    ctx.fillText(
      `› ${frame.dialogue.choices[frame.dialogue.selected || 0].label}`,
      8,
      99
    );
  else ctx.fillText('Z  continue', 116, 100);
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
  ctx.fillText(frame.battle.name, 12, 21);
  ctx.fillText(`HP ${frame.battle.hp}/${frame.battle.maxHp}`, 12, 34);
  ctx.fillText('Mossmurmur reads your posture.', 12, 57);
  ctx.fillText('Z strike  X sing  C guard', 12, 83);
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
  ctx.fillText('FIELD JOURNAL', 12, 19);
  ctx.fillText(`Memories ${frame.world.flags.memoryCount || 0}/3`, 12, 35);
  ctx.fillText(`Items ${Object.keys(frame.inventory).length}`, 12, 48);
  ctx.fillText(`Bond: Mira ${frame.world.relationships.mira || 0}`, 12, 61);
  ctx.fillText('X or Z to close', 12, 87);
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
  ctx.fillText('THE VALLEY WAKES', 18, 39);
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
    if (ctx.measureText(trial).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else line = trial;
  }
  if (line) ctx.fillText(line, x, y);
}
