/** Original four-voice score; MIDI notes, eighth-note steps, no external assets. */
/** @type {{bpm: number, lead: number[], bass: number[], rooms: Record<string, number>}} */
export const SOUNDTRACK = {
  bpm: 110,
  lead: [
    64, 0, 67, 71, 74, 71, 67, 0, 62, 0, 66, 69, 74, 69, 66, 0, 60, 0, 64, 67,
    72, 71, 67, 64, 59, 62, 66, 69, 71, 69, 66, 62,
  ],
  bass: [40, 38, 36, 35],
  rooms: { office: 0, compute: -12, evaluation: 0, clinic: 5, commons: 7 },
};

/** Authored short effects, deliberately quieter than typical emulator audio. */
/** @type {Record<string, number[]>} */
export const SOUND_EFFECTS = {
  select: [76],
  confirm: [72, 79],
  back: [67, 60],
  purchase: [64, 67, 72],
  reject: [43, 42],
  shift: [60, 64, 67, 72],
  room: [67, 74],
};

/**
 * Convert an authored MIDI pitch to oscillator frequency.
 * @param {number} note MIDI note number.
 * @returns {number} Frequency in hertz.
 */
export function noteFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

/**
 * Arrange a repeating phrase into exactly four handheld-style voices.
 * @param {number} step Eighth-note transport position.
 * @param {string} room Current room identifier.
 * @returns {object[]} Scheduled voice descriptions; rests create no oscillator.
 */
export function scoreStep(step, room) {
  const index = step % SOUNDTRACK.lead.length;
  const transpose = SOUNDTRACK.rooms[room] || 0;
  const lead = SOUNDTRACK.lead[index];
  const bass = SOUNDTRACK.bass[Math.floor(index / 8)];
  const voices = [];
  if (lead)
    voices.push({ type: 'square', note: lead + transpose, volume: 0.016 });
  if (step % 2 === 0)
    voices.push({ type: 'square', note: bass + 24, volume: 0.009 });
  if (step % 4 === 0)
    voices.push({ type: 'triangle', note: bass, volume: 0.035 });
  if (step % 2 === 1) voices.push({ type: 'noise', note: 0, volume: 0.018 });
  return voices;
}

/**
 * Select feedback from actual state transitions, never speculative orders.
 * @param {Record<string, any>} before Previous campaign.
 * @param {Record<string, any>} after Settled input result.
 * @returns {string | null} Authored effect, or silence on an idle frame.
 */
export function transitionSound(before, after) {
  if (before.world.day !== after.world.day) return 'shift';
  if (before.world.mapId !== after.world.mapId) return 'room';
  if (before.lab.cash !== after.lab.cash) return 'purchase';
  if (before.lab.decisions !== after.lab.decisions) return 'confirm';
  if (before.toast !== after.toast) return 'reject';
  if (before.menu?.selected !== after.menu?.selected) return 'select';
  if (before.dialogue?.index !== after.dialogue?.index) return 'confirm';
  if (before.menu?.page !== after.menu?.page) return 'back';
  return null;
}
