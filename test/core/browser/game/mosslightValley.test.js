import { CONTENT } from '../../../../src/core/browser/game/mosslight-valley/content.js';
import {
  createInputState,
  updateInput,
} from '../../../../src/core/browser/game/mosslight-valley/input.js';
import {
  createSimulation,
  stepGame,
} from '../../../../src/core/browser/game/mosslight-valley/simulation.js';
import {
  parseSave,
  serializeSave,
} from '../../../../src/core/browser/game/mosslight-valley/save.js';
import { toFramePayload } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { mosslightValley } from '../../../../src/core/browser/game/mosslight-valley/mosslightValley.js';

/** Verify the core movement and frame contract. */
test('moves, interacts, and renders a handheld frame', () => {
  let state = createSimulation(CONTENT);
  state = stepGame(state, ['right', 'right'], CONTENT);
  expect(state.world.player.x).toBe(2);
  state = stepGame(state, ['up'], CONTENT);
  expect(toFramePayload(state).type).toBe('mosslight-valley');
  expect(toFramePayload(state).shapes.length).toBeGreaterThan(1);
});

/** Verify keyboard normalization. */
test('input normalizes keyboard actions', () => {
  const state = updateInput(createInputState(), {
    type: 'keydown',
    key: 'ArrowRight',
  });
  expect([...state.held]).toEqual(['right']);
});

/** Verify save validation and round trips. */
test('save data round trips and rejects malformed input', () => {
  const state = createSimulation(CONTENT);
  const raw = serializeSave(state);
  expect(parseSave(raw).world.player.name).toBe('Aster');
  expect(parseSave('{bad')).toBeNull();
});

/** Verify the embedded adapter output. */
test('public toy adapter returns a valid frame payload', () => {
  const payload = JSON.parse(
    mosslightValley(JSON.stringify({ actions: ['right'] }), new Map())
  );
  expect(payload.width).toBe(160);
  expect(payload.height).toBe(144);
  expect(payload.hud.location).toBe('village');
});
