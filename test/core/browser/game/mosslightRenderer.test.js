import { jest } from '@jest/globals';
import { CONTENT } from '../../../../src/core/browser/game/mosslight-valley/content.js';
import { createSimulation } from '../../../../src/core/browser/game/mosslight-valley/simulation.js';
import {
  drawGameFrame,
  toFramePayload,
  wrapDialogueText,
} from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { startBattle } from '../../../../src/core/browser/game/mosslight-valley/combat.js';
import { openDialogue } from '../../../../src/core/browser/game/mosslight-valley/dialogue.js';
import { selectEnding } from '../../../../src/core/browser/game/mosslight-valley/quests.js';

const makeContext = () => {
  const rectangles = [];
  return {
    rectangles,
    measureText: text => ({ width: text.length * 8 }),
    fillRect: jest.fn(function (x, y, width, height) {
      rectangles.push({ x, y, width, height, fill: this.fillStyle });
    }),
    fillText: jest.fn(),
    strokeRect: jest.fn(),
  };
};

test('draws terrain, objects, weather and both dialogue layouts', () => {
  let state = createSimulation(CONTENT);
  const context = makeContext();
  drawGameFrame(context, toFramePayload(state));
  expect(context.imageSmoothingEnabled).toBe(false);
  expect(context.fillRect).toHaveBeenCalled();

  for (const map of Object.values(CONTENT.maps)) {
    state = {
      ...state,
      world: {
        ...state.world,
        map,
        mapId: map.id || 'village',
        weather: 'rain',
      },
    };
    drawGameFrame(context, toFramePayload(state));
    drawGameFrame(
      context,
      toFramePayload({
        ...state,
        world: { ...state.world, weather: 'dream' },
      })
    );
  }
  const tinyMap = {
    name: 'Tiny',
    palette: 'unlisted',
    width: 1,
    height: 1,
    blocked: ['0,0'],
    objects: [{ x: 30, y: 30, kind: 'unknown' }],
  };
  state = {
    ...state,
    world: {
      ...state.world,
      map: tinyMap,
      mapId: 'tiny',
      flags: { gardenShared: true },
      npcs: [],
      weather: 'sun',
    },
    toast: '',
  };
  expect(toFramePayload(state).quest).toBe('The Borrowed Memory');
  drawGameFrame(context, toFramePayload(state));
  drawGameFrame(
    context,
    toFramePayload({
      ...state,
      world: { ...state.world, map: { ...tinyMap, objects: undefined } },
    })
  );
  drawGameFrame(
    context,
    toFramePayload({
      ...state,
      world: {
        ...state.world,
        map: { ...tinyMap, objects: [{ x: 0, y: 0, kind: 'unknown' }] },
      },
    })
  );
  state = openDialogue(state, 'mira', [
    {
      text: 'A very long line that wraps into several neat little pixel-sized rows.',
    },
  ]);
  drawGameFrame(context, toFramePayload(state));
  state = {
    ...state,
    dialogue: {
      ...state.dialogue,
      choices: [{ label: 'Choose the moonlit path.' }],
    },
  };
  drawGameFrame(context, toFramePayload(state));
  state = {
    ...state,
    dialogue: { actorId: 'mira', lines: [], index: 0, choices: [] },
  };
  drawGameFrame(context, toFramePayload(state));
  expect(
    context.rectangles.some(rect => rect.x === 3 && rect.width === 154)
  ).toBe(true);
});

test('wraps whitespace, empty prose and oversized words without losing text', () => {
  expect(wrapDialogueText('')).toEqual(['']);
  expect(wrapDialogueText('  bells\n for\t doors  ')).toEqual([
    'bells for doors',
  ]);
  const word = 'x'.repeat(70);
  const rows = wrapDialogueText(word);
  expect(rows.join('')).toBe(word);
  expect(rows.every(row => row.length <= 28)).toBe(true);
});

test('renders an empty ending and a restored dialogue with no choice list', () => {
  const state = createSimulation(CONTENT);
  const frame = toFramePayload({
    ...state,
    ending: { text: '' },
    dialogue: { lines: [{ text: 'Restored conversation.' }], index: 0 },
  });
  const context = makeContext();
  drawGameFrame(context, frame);
  expect(context.fillText).toHaveBeenCalledWith('A/Z continue', 8, 94);
});

test('keeps every authored dialogue and selected choice inside the same panel in both modes', () => {
  const initial = createSimulation(CONTENT);
  for (const nodes of Object.values(CONTENT.dialogue))
    for (const lines of Object.values(nodes))
      for (const line of lines) {
        const selections = Array.from(
          { length: Math.max(1, line.choices?.length || 0) },
          (_, selected) => selected
        );
        for (const selected of selections)
          assertDialogueLayout(initial, line, selected);
      }
  assertDialogueLayout(initial, { text: '', choices: undefined }, 0);
});

/**
 * Verify identical dialogue rows and bounds in the payload and direct canvas.
 * @param {object} initial Starting simulation.
 * @param {object} line Authored line.
 * @param {number} selected Highlighted choice.
 */
function assertDialogueLayout(initial, line, selected) {
  const state = openDialogue(initial, 'test', [line]);
  state.dialogue.selected = selected;
  const frame = toFramePayload(state);
  const rows = frame.shapes.filter(
    shape => shape.type === 'text' && shape.x === 8
  );
  const border = frame.shapes.find(
    shape => shape.x === 3 && shape.width === 154
  );
  expect(border.y).toBeGreaterThanOrEqual(0);
  expect(border.y + border.height).toBe(106);
  expect(
    rows.every(row => row.text.length <= 28 && row.y > border.y && row.y < 106)
  ).toBe(true);
  const context = makeContext();
  drawGameFrame(context, frame);
  expect(context.fillText.mock.calls.filter(([, x]) => x === 8)).toEqual(
    rows.map(row => [row.text, row.x, row.y])
  );
}

test('draws battle, journal and ending overlays through the shared renderer', () => {
  let state = startBattle(createSimulation(CONTENT), CONTENT.creatures[0]);
  const context = makeContext();
  drawGameFrame(context, toFramePayload(state));
  state = { ...state, battle: null, mode: 'journal', inventory: {} };
  drawGameFrame(context, toFramePayload(state));
  state = selectEnding(state, 'gentle', CONTENT);
  drawGameFrame(context, toFramePayload(state));
  expect(context.fillText).toHaveBeenCalledWith('THE VALLEY WAKES', 18, 39);
});

test('keeps walkable terrain tile colors at a visible contrast', () => {
  const state = createSimulation(CONTENT);
  for (const map of Object.values(CONTENT.maps)) {
    const frame = toFramePayload({
      ...state,
      world: { ...state.world, map },
    });
    const [foreground, background] = frame.palette.slice(1, 3);
    const luminance = color => {
      const channels = color
        .slice(1)
        .match(/../g)
        .map(channel => parseInt(channel, 16) / 255)
        .map(channel =>
          channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
        );
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const values = [luminance(foreground), luminance(background)].sort(
      (left, right) => right - left
    );
    const contrast = (values[0] + 0.05) / (values[1] + 0.05);
    expect(contrast).toBeGreaterThanOrEqual(3);
  }
});

test('uses identical generated terrain rectangles in both render paths', () => {
  const frame = toFramePayload(createSimulation(CONTENT));
  const firstActor = frame.shapes.findIndex(
    shape => shape.width === 6 && shape.height === 9
  );
  const terrain = frame.shapes
    .slice(0, firstActor)
    .map(({ x, y, width, height, fill }) => ({ x, y, width, height, fill }));
  const context = makeContext();

  drawGameFrame(context, frame);

  expect(context.rectangles.slice(0, terrain.length)).toEqual(terrain);
});

test('fills the right edge and keeps the player visible at authored map boundaries', () => {
  const initial = createSimulation(CONTENT);
  for (const map of Object.values(CONTENT.maps)) {
    for (const x of [0, map.width - 1]) {
      const frame = toFramePayload({
        ...initial,
        world: {
          ...initial.world,
          map,
          player: { ...initial.world.player, x, y: map.height - 1 },
        },
      });
      const actor = frame.shapes.findIndex(
        shape => shape.width === 6 && shape.height === 9
      );
      const terrain = frame.shapes.slice(1, actor);
      expect(terrain.every(shape => shape.x + shape.width <= 160)).toBe(true);
      expect(frame.shapes[actor].x + 6).toBeLessThanOrEqual(160);
      if (x === 0)
        expect(terrain.some(shape => shape.x + shape.width === 160)).toBe(true);
      expect(frame.shapes[0]).toMatchObject({ width: 160, height: 144 });
    }
  }
});

test('shares bounded HUD rows and explicitly marks oversized labels and messages', () => {
  const initial = createSimulation(CONTENT);
  for (const toast of [
    '',
    'Water the plot, then let one day pass.',
    'x'.repeat(180),
  ]) {
    const frame = toFramePayload({
      ...initial,
      toast,
      world: {
        ...initial.world,
        map: { ...initial.world.map, name: 'Long location '.repeat(8) },
      },
    });
    const rows = frame.shapes.filter(
      shape => shape.type === 'text' && shape.x === 4
    );
    expect(rows.map(row => row.y)).toEqual([115, 124, 133, 142]);
    expect(
      rows.every(row => row.text.length <= 35 && row.font === '7px monospace')
    ).toBe(true);
    expect(rows[0].text.endsWith('…')).toBe(true);
    if (toast.length > 70) expect(rows[3].text.endsWith('…')).toBe(true);
    const context = makeContext();
    drawGameFrame(context, frame);
    expect(context.fillText.mock.calls).toEqual(
      rows.map(row => [row.text, row.x, row.y])
    );
  }
});
