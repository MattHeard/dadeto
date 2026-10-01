import { jest } from '@jest/globals';
import { CONTENT } from '../../../../src/core/browser/game/mosslight-valley/content.js';
import { createSimulation } from '../../../../src/core/browser/game/mosslight-valley/simulation.js';
import {
  drawGameFrame,
  toFramePayload,
} from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { startBattle } from '../../../../src/core/browser/game/mosslight-valley/combat.js';
import { openDialogue } from '../../../../src/core/browser/game/mosslight-valley/dialogue.js';
import { selectEnding } from '../../../../src/core/browser/game/mosslight-valley/quests.js';

const makeContext = () => ({
  measureText: text => ({ width: text.length * 8 }),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  strokeRect: jest.fn(),
});

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
  expect(context.strokeRect).toHaveBeenCalled();
});

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
