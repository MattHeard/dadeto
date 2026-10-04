import {
  noteFrequency,
  scoreStep,
  SOUNDTRACK,
  SOUND_EFFECTS,
  transitionSound,
} from './soundtrack.js';

const sessions = new WeakMap();

/**
 * Share one gesture-unlocked transport across synchronous embedded submissions.
 * @param {Record<string, any>} browser Injected browser APIs, absent on servers.
 * @returns {Record<string, any>} Optional audio adapter.
 */
export function neonAudio(browser = globalThis.window) {
  if (!browser) return {};
  if (!sessions.has(browser)) sessions.set(browser, createNeonAudio(browser));
  return sessions.get(browser);
}

/**
 * Create an original chiptune transport at the browser boundary only.
 * @param {Record<string, any>} browser AudioContext, document and timer adapters.
 * @returns {Record<string, any>} Gesture, lifecycle and state-feedback controls.
 */
export function createNeonAudio(browser) {
  /** @type {AudioContext} */
  let context;
  /** @type {GainNode} */
  let master;
  /** @type {AudioBuffer} */
  let noise;
  /** @type {number | undefined} */
  let timer;
  let position = 0;
  let nextTime = 0;
  let muted = false;
  let paused = false;
  let disposed = false;
  let room = 'office';
  const browserDocument = browser.document;
  const duration = 60 / SOUNDTRACK.bpm / 2;

  /**
   * Build one repeatable noise waveform without simulation randomness.
   * @returns {AudioBuffer} Short percussion sample.
   */
  function noiseBuffer() {
    const buffer = context.createBuffer(1, 2048, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 1979;
    for (let i = 0; i < samples.length; i++) {
      seed = (seed * 16807) % 2147483647;
      samples[i] = seed / 1073741824 - 1;
    }
    return buffer;
  }

  /**
   * Schedule a bounded envelope and disconnect its nodes when finished.
   * @param {Record<string, any>} voice Synthesizer voice.
   * @param {number} time Audio-clock start.
   * @param {number} length Note duration.
   * @returns {void} Audio graph side effects only.
   */
  function note(voice, time, length) {
    const gain = context.createGain();
    let source;
    if (voice.type === 'noise') {
      source = context.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      length = 0.045;
    } else {
      source = context.createOscillator();
      source.type = voice.type;
      source.frequency.setValueAtTime(noteFrequency(voice.note), time);
    }
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(voice.volume, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    source.connect(gain);
    gain.connect(master);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start(time);
    source.stop(time + length + 0.01);
  }

  /**
   * Look ahead on the audio clock; never catch up with a burst after backgrounding.
   * @returns {void} Schedules a small bounded window of music.
   */
  function schedule() {
    nextTime = Math.max(nextTime, context.currentTime);
    while (nextTime < context.currentTime + 0.2) {
      for (const voice of scoreStep(position++, room))
        note(voice, nextTime, duration * 0.8);
      nextTime += duration;
    }
  }

  /**
   * Silence queued notes immediately and stop background timer work.
   * @returns {void} Pauses transport without losing its musical position.
   */
  function stop() {
    browser.clearInterval(timer);
    timer = undefined;
    if (!context) return;
    master.gain.setValueAtTime(0, context.currentTime);
    context.suspend().catch(() => {});
  }

  /**
   * Resume only an already gesture-created graph when playback is permitted.
   * @returns {void} Optional browser playback.
   */
  function resume() {
    if (!context || muted || paused || disposed || browserDocument.hidden)
      return;
    if (timer !== undefined) return;
    master.gain.setValueAtTime(0.65, context.currentTime);
    context.resume().catch(() => {});
    nextTime = context.currentTime + 0.02;
    schedule();
    timer = browser.setInterval(schedule, 100);
  }

  /**
   * Initialize inside a physical gesture; unsupported or denied audio stays safe.
   * @returns {void} Never changes game state or throws into input handling.
   */
  function unlock() {
    if (disposed || muted) return;
    try {
      if (!context) {
        const Constructor = browser.AudioContext || browser.webkitAudioContext;
        if (!Constructor) return;
        context = new Constructor();
        master = context.createGain();
        master.connect(context.destination);
        noise = noiseBuffer();
      }
      // A later physical press can retry permission even with a queued transport.
      context.resume().catch(() => {});
      resume();
    } catch {
      /* Optional audio must never prevent play. */
    }
  }

  /**
   * Unlock only gestures directed at this game, not unrelated blog toys.
   * @param {Record<string, any>} event Physical pointer or keyboard event.
   * @returns {void} Starts the transport after browser permission.
   */
  function gesture(event) {
    if (
      browser.location.pathname.startsWith('/neon-covenant') ||
      event.target.closest?.('#NEON1')
    )
      unlock();
  }

  /**
   * Stop hidden-tab playback and avoid automatic first-load audio.
   * @returns {void} Updates an existing transport only.
   */
  function visibility() {
    if (browserDocument.hidden) stop();
    else resume();
  }

  /**
   * Release timers, browser listeners and the audio context.
   * @returns {void} Idempotent teardown.
   */
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    browserDocument.removeEventListener('pointerdown', gesture, true);
    browserDocument.removeEventListener('keydown', gesture, true);
    browserDocument.removeEventListener('visibilitychange', visibility);
    browser.removeEventListener('pagehide', dispose);
    context?.close().catch(() => {});
    sessions.delete(browser);
  }

  browserDocument.addEventListener('pointerdown', gesture, true);
  browserDocument.addEventListener('keydown', gesture, true);
  browserDocument.addEventListener('visibilitychange', visibility);
  browser.addEventListener('pagehide', dispose);
  return {
    unlock,
    stop,
    dispose,
    /**
     * Apply real campaign feedback without influencing deterministic rules.
     * @param {Record<string, any>} before Previous state.
     * @param {Record<string, any>} after Current state.
     * @returns {void} Audio-only effects.
     */
    observe(before, after) {
      muted = Boolean(after.audioMuted);
      paused = after.menu?.page === 'paused';
      room = after.world.mapId;
      if (muted || paused) {
        stop();
        return;
      }
      resume();
      const effect = transitionSound(before, after);
      if (!context || !effect || browserDocument.hidden) return;
      SOUND_EFFECTS[effect].forEach((pitch, index) =>
        note(
          { type: 'square', note: pitch, volume: 0.028 },
          context.currentTime + index * 0.055,
          0.05
        )
      );
    },
  };
}
