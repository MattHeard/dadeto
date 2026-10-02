// @ts-nocheck -- runtime game state is intentionally data-driven.
import { createMosslightRuntime } from './runtime.js';
import { actionsFromInput, createInputState, updateInput } from './input.js';

/**
 * Run one synchronous embedded-game step and return a serialized frame payload.
 * @param {string} input - Serialized action or save input.
 * @param {Map} env - Runtime environment and local persistence adapter.
 * @returns {string} A serialized render frame.
 */
export function mosslightValley(input, env) {
  const runtime = createMosslightRuntime(env);
  runtime.start();
  let parsed = null;
  try {
    parsed = JSON.parse(input || '{}');
  } catch {
    parsed = {};
  }
  if (parsed?.reset === true) {
    const resetId = typeof parsed.resetId === 'string' ? parsed.resetId : '';
    return JSON.stringify(
      parsed.confirmed === true && resetId
        ? runtime.resetSave(resetId)
        : runtime.frame()
    );
  }
  if (parsed?.save) runtime.importSave(parsed.save);
  let actions = Array.isArray(parsed?.actions) ? parsed.actions : [];
  if (parsed?.type && parsed?.key) {
    actions = actionsFromInput(
      updateInput(createInputState(), { type: parsed.type, key: parsed.key })
    );
  }
  return JSON.stringify(runtime.step(125, actions));
}

export { createMosslightRuntime } from './runtime.js';
export { CONTENT } from './content.js';
