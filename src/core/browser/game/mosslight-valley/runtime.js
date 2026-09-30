// @ts-nocheck -- runtime game state is intentionally data-driven.
/* eslint-disable jsdoc/require-returns -- compact game-state contracts are documented at module boundaries. */
import { CONTENT } from './content.js';
import { createAudioAdapter } from './audio.js';
import { createInputState, actionsFromInput, consumePressed } from './input.js';
import { createSimulation, stepGame } from './simulation.js';
import { createSaveAdapter } from './save.js';
import { toFramePayload } from './renderer.js';

/** Compose the game modules into a step-based runtime. */
/** @param {Map} env Runtime environment. @returns {object} Game runtime. */
export function createMosslightRuntime(env = new Map()) {
  const save = createSaveAdapter(env);
  const audio = createAudioAdapter(env);
  let state = save.load() || createSimulation(CONTENT);
  let input = createInputState();
  return {
    getState: () => state,
    setInput: next => {
      input = next;
    },
    step: () => {
      state = stepGame(state, actionsFromInput(input), CONTENT);
      state.effects.forEach(audio.play);
      save.save(state);
      input = consumePressed(input);
      return toFramePayload(state);
    },
    save: () => save.save(state),
    exportSave: () => save.export(state),
    importSave: raw => {
      const next = save.import(raw);
      if (next) state = next;
      return state;
    },
    frame: () => toFramePayload(state),
  };
}
