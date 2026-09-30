// @ts-nocheck -- runtime game state is intentionally data-driven.
/** Create the optional audio event boundary. */
/** @param {Map} env Runtime environment. @returns {object} Audio adapter. */
/* eslint-disable jsdoc/require-jsdoc -- compact game-state contracts are documented at module boundaries. */
export function createAudioAdapter(env) {
  const log = env?.get?.('logInfo');
  return {
    play(name) {
      log?.(`mosslight-audio:${name}`);
    },
    stop() {},
  };
}
