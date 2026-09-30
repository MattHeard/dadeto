// @ts-nocheck -- runtime game state is intentionally data-driven.
/* eslint-disable jsdoc/require-param, jsdoc/require-returns -- compact game-state contracts are documented at module boundaries. */
import { createMosslightRuntime } from './runtime.js';

/** Run one synchronous embedded-game step and return a frame payload. */
/** @param {string} input Serialized input. @param {Map} env Runtime environment. @returns {string} Serialized frame. */
export function mosslightValley(input, env) {
  const runtime = createMosslightRuntime(env);
  let parsed = null;
  try {
    parsed = JSON.parse(input || '{}');
  } catch {
    parsed = {};
  }
  if (parsed?.save) runtime.importSave(parsed.save);
  if (parsed?.actions)
    runtime.setInput({
      held: new Set(parsed.actions),
      pressed: new Set(parsed.actions),
    });
  runtime.step();
  return JSON.stringify(runtime.frame());
}

export { createMosslightRuntime } from './runtime.js';
export { CONTENT } from './content.js';
