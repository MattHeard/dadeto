import { jest } from '@jest/globals';
import {
  createNeonAudio,
  neonAudio,
} from '../../../../src/core/browser/game/neon-covenant/audio.js';
import {
  noteFrequency,
  scoreStep,
  transitionSound,
} from '../../../../src/core/browser/game/neon-covenant/soundtrack.js';
import {
  createNeonState,
  stepNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import { labEntries } from '../../../../src/core/browser/game/neon-covenant/controls.js';
import {
  createNeonRuntime,
  validLabSave,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';

/**
 * Provide inspectable audio-clock and event boundaries without real playback.
 * @returns {Record<string, any>} Isolated browser and graph fixture.
 */
function browserFixture() {
  const listeners = new Map();
  const nodes = [];
  const addEventListener = jest.fn((name, callback) =>
    listeners.set(name, callback)
  );
  const removeEventListener = jest.fn();
  const parameter = () => ({
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  });
  const node = () => {
    const result = {
      gain: parameter(),
      frequency: parameter(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };
    nodes.push(result);
    return result;
  };
  const context = {
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createGain: node,
    createOscillator: node,
    createBufferSource: node,
    createBuffer: jest.fn(() => ({
      getChannelData: () => new Float32Array(2048),
    })),
    resume: jest.fn(() => Promise.resolve()),
    suspend: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
  };
  const browser = {
    document: { hidden: false, addEventListener, removeEventListener },
    location: { pathname: '/neon-covenant/' },
    AudioContext: jest.fn(function () {
      return context;
    }),
    addEventListener,
    removeEventListener,
    setInterval: jest.fn(() => 1),
    clearInterval: jest.fn(),
  };
  return { browser, context, listeners, nodes };
}

test('original score repeats deterministically with pulse, bass and noise voices', () => {
  expect(noteFrequency(69)).toBe(440);
  const phrase = Array.from({ length: 32 }, (_, i) => scoreStep(i, 'office'));
  expect(phrase).toEqual(
    Array.from({ length: 32 }, (_, i) => scoreStep(i + 32, 'office'))
  );
  expect(new Set(phrase.flat().map(voice => voice.type))).toEqual(
    new Set(['square', 'triangle', 'noise'])
  );
  expect(scoreStep(0, 'clinic')[0].note).toBe(
    scoreStep(0, 'office')[0].note + 5
  );
  expect(scoreStep(0, 'unknown')).toEqual(scoreStep(0, 'office'));
  expect(phrase.flat().every(voice => voice.volume <= 0.035)).toBe(true);
});

test.each([
  [{ world: { day: 2, mapId: 'office' } }, 'shift'],
  [{ world: { day: 1, mapId: 'clinic' } }, 'room'],
  [{ lab: { cash: 160, decisions: 6 } }, 'purchase'],
  [{ lab: { cash: 180, decisions: 5 } }, 'confirm'],
  [{ toast: 'Rejected' }, 'reject'],
  [{ menu: { page: 'main', selected: 1 } }, 'select'],
  [{ dialogue: { index: 1 } }, 'confirm'],
  [{ menu: { page: 'ledger', selected: 0 } }, 'back'],
  [{}, null],
])('feedback follows actual transitions: %j', (change, expected) => {
  const before = {
    world: { day: 1, mapId: 'office' },
    lab: { cash: 180, decisions: 6 },
    toast: '',
    menu: { page: 'main', selected: 0 },
    dialogue: { index: 0 },
  };
  expect(transitionSound(before, { ...before, ...change })).toBe(expected);
  expect(transitionSound(createNeonState(), createNeonState())).toBeNull();
});

test('transport stays silent until gesture, bounds scheduling and disconnects finished notes', () => {
  const { browser, context, listeners, nodes } = browserFixture();
  const audio = createNeonAudio(browser);
  const state = createNeonState();
  audio.observe(state, state);
  expect(browser.AudioContext).not.toHaveBeenCalled();
  listeners.get('pointerdown')({ target: {} });
  expect(browser.AudioContext).toHaveBeenCalledTimes(1);
  audio.unlock();
  expect(browser.setInterval).toHaveBeenCalledTimes(1);
  expect(context.resume).toHaveBeenCalledTimes(3);
  context.currentTime = 20;
  browser.setInterval.mock.calls[0][0]();
  expect(nodes.length).toBeLessThan(20);
  const source = nodes.find(entry => entry.onended);
  source.onended();
  expect(source.disconnect).toHaveBeenCalled();
  audio.observe(state, { ...state, dialogue: null });
  expect(nodes.filter(entry => entry.type === 'square').length).toBeGreaterThan(
    1
  );
  audio.dispose();
  audio.dispose();
  audio.unlock();
  expect(context.close).toHaveBeenCalledTimes(1);
});

test('mute, pause and visibility silence queued audio and preserve one timer', () => {
  const { browser, context, listeners, nodes } = browserFixture();
  const audio = createNeonAudio(browser);
  const state = createNeonState();
  audio.unlock();
  audio.observe(state, { ...state, audioMuted: true });
  expect(nodes[0].gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
  audio.unlock();
  expect(browser.setInterval).toHaveBeenCalledTimes(1);
  audio.observe(state, { ...state, menu: { page: 'paused', selected: 0 } });
  audio.observe(state, state);
  browser.document.hidden = true;
  listeners.get('visibilitychange')();
  audio.observe(state, { ...state, toast: 'No order' });
  expect(context.suspend).toHaveBeenCalled();
  browser.document.hidden = false;
  listeners.get('visibilitychange')();
  listeners.get('pagehide')();
  expect(context.close).toHaveBeenCalledTimes(1);
});

test('embedded gestures stay scoped; fallback and denied audio never prevent play', () => {
  expect(neonAudio()).toEqual({});
  const { browser, listeners } = browserFixture();
  browser.location.pathname = '/';
  browser.webkitAudioContext = browser.AudioContext;
  browser.AudioContext = null;
  const audio = neonAudio(browser);
  expect(neonAudio(browser)).toBe(audio);
  listeners.get('keydown')({ target: { closest: () => null } });
  expect(browser.webkitAudioContext).not.toHaveBeenCalled();
  listeners.get('pointerdown')({ target: { closest: () => ({}) } });
  expect(browser.webkitAudioContext).toHaveBeenCalledTimes(1);
  audio.dispose();
  const unavailable = browserFixture();
  unavailable.browser.AudioContext = null;
  const silent = createNeonAudio(unavailable.browser);
  silent.unlock();
  silent.stop();
  silent.dispose();
  const denied = browserFixture();
  denied.browser.AudioContext.mockImplementation(() => {
    throw new Error('Denied');
  });
  const rejected = createNeonAudio(denied.browser);
  expect(() => rejected.unlock()).not.toThrow();
  rejected.dispose();
});

test('rejected asynchronous browser audio permissions are contained', async () => {
  const { browser, context } = browserFixture();
  context.resume.mockImplementation(() => Promise.reject(new Error('Locked')));
  context.suspend.mockImplementation(() => Promise.reject(new Error('Locked')));
  context.close.mockImplementation(() => Promise.reject(new Error('Closed')));
  const audio = createNeonAudio(browser);
  audio.unlock();
  audio.dispose();
  await Promise.resolve();
});

test('sound toggle is reachable with X/directions/A, persists and costs no attention', () => {
  const state = {
    ...createNeonState(),
    dialogue: null,
    menu: { page: 'main', selected: 0 },
  };
  const index = labEntries(state).findIndex(row => row[1] === 'audio-toggle');
  state.menu.selected = index;
  const muted = stepNeon(state, ['a']);
  expect(muted.audioMuted).toBe(true);
  expect(muted.lab).toEqual(state.lab);
  expect(labEntries(muted)[index][0]).toContain('OFF');
  const released = stepNeon(muted, []);
  const audible = stepNeon(released, ['a']);
  expect(audible.audioMuted).toBe(false);
  expect(audible.lab).toEqual(state.lab);
  const observe = jest.fn();
  const runtime = createNeonRuntime({ audio: { observe } });
  runtime.dispatch('b');
  expect(observe).toHaveBeenCalledTimes(2);
  runtime.setState(muted);
  runtime.importSave(runtime.exportSave());
  expect(runtime.getSnapshot().audioMuted).toBe(true);
  expect(validLabSave({ ...muted, audioMuted: 'yes' })).toBe(false);
  expect(createNeonRuntime().frame().type).toBe('mosslight-valley');
});
