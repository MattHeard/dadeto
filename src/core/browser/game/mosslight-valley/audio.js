// @ts-nocheck -- browser audio is injected so the simulation stays platform independent.
/**
 * Create an optional cue player that degrades safely when audio is unavailable.
 * @param {unknown} env - The env argument.
 * @returns {object} A controllable audio cue adapter.
 */
export function createAudioAdapter(env = new Map()) {
  const cue = env?.get?.('playAudioCue');
  let enabled = true;
  return {
    play(name) {
      if (enabled) cue?.(name);
    },
    stop() {
      cue?.('stop');
    },
    setEnabled(value) {
      enabled = Boolean(value);
    },
    isEnabled() {
      return enabled;
    },
  };
}
