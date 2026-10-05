/** @typedef {{play: (name: string) => void, stop: () => void, setEnabled: (value: boolean) => void, isEnabled: () => boolean}} AudioCueAdapter */

/**
 * Create an optional cue player that degrades safely when audio is unavailable.
 * @param {Map<string, (name: string) => void>} env Audio cue callbacks.
 * @returns {AudioCueAdapter} A controllable audio cue adapter.
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
