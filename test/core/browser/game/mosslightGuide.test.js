import {
  createSimulation,
  stepGame,
} from '../../../../src/core/browser/game/mosslight-valley/simulation.js';
import { toFramePayload } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';

test('object feedback survives key release and idle frames', () => {
  let state = stepGame(createSimulation(), ['interact']);
  const feedback = state.toast;
  expect(feedback).not.toBe('');
  for (let i = 0; i < 100; i++) state = stepGame(state, []);
  expect(state.toast).toBe(feedback);
});

test('Start presents story, controls and objectives in the embedded frame', () => {
  let state = stepGame(createSimulation(), ['journal']);
  expect(state.mode).toBe('journal');
  expect(toFramePayload(state).dialogue.lines[0].text).toContain('Aster');
  expect(state.dialogue.lines.some(line => line.text.includes('D-pad'))).toBe(
    true
  );
  expect(state.dialogue.lines.some(line => line.text.includes('active:'))).toBe(
    true
  );
  state = stepGame(state, []);
  expect(state.dialogue.index).toBe(0);
  state = stepGame(state, ['cancel']);
  expect(state.dialogue).toBeNull();
  expect(state.mode).toBe('world');
});

test('guide finishes only through explicit presses and returns to exploration', () => {
  let state = stepGame(createSimulation(), ['menu']);
  const count = state.dialogue.lines.length;
  for (let i = 0; i < count; i++) {
    state = stepGame(state, []);
    state = stepGame(state, ['confirm']);
  }
  expect(state.dialogue).toBeNull();
  expect(state.mode).toBe('world');
});

test.each(['cancel', 'confirm'])(
  'closing help with %s restores an existing battle',
  action => {
    let state = stepGame(
      { ...createSimulation(), mode: 'battle', battle: {} },
      ['journal']
    );
    if (action === 'confirm') {
      state.dialogue.index = state.dialogue.lines.length - 1;
    }
    state = stepGame(state, []);
    state = stepGame(state, [action]);
    expect(state.mode).toBe('battle');
    expect(state.dialogue).toBeNull();
  }
);

test('the village noticeboard opens persistent readable pages', () => {
  const initial = createSimulation();
  initial.world.player = {
    ...initial.world.player,
    x: 7,
    y: 3,
    facing: 'left',
  };
  let state = stepGame(initial, ['interact']);
  expect(state.dialogue.actorId).toBe('guide');
  state = stepGame(state, []);
  expect(state.dialogue.lines[0].text).toContain('sleeping creature');
});
