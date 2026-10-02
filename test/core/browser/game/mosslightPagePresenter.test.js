import { jest } from '@jest/globals';
import { CONTENT } from '../../../../src/core/browser/game/mosslight-valley/content.js';
import { createSimulation } from '../../../../src/core/browser/game/mosslight-valley/simulation.js';
import { startBattle } from '../../../../src/core/browser/game/mosslight-valley/combat.js';
import { serializeSave } from '../../../../src/core/browser/game/mosslight-valley/save.js';
import { startMosslightPage } from '../../../../src/core/browser/game/mosslight-valley/pagePresenter.js';

class FakeTarget {
  listeners = {};
  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }
  removeEventListener(type, listener) {
    this.listeners[type] = (this.listeners[type] || []).filter(
      item => item !== listener
    );
  }
  emit(type, event = {}) {
    return Promise.all(
      (this.listeners[type] || []).map(listener => listener(event))
    );
  }
}

class FakeElement extends FakeTarget {
  constructor(dataset = {}) {
    super();
    this.dataset = dataset;
    this.value = '';
    this.files = [];
    this.textContent = '';
    this.captureThrows = false;
  }
  click() {
    this.emit('click');
  }
  setPointerCapture() {
    if (this.captureThrows) throw new Error('capture unsupported');
  }
}

/**
 *
 * @returns {object} Browser dependencies and observable fake elements.
 */
function pageOptions() {
  const context = {
    measureText: text => ({ width: text.length * 2 }),
    fillRect() {},
    fillText() {},
    strokeRect() {},
  };
  const canvas = new FakeElement();
  canvas.getContext = () => context;
  const status = new FakeElement();
  const slot = new FakeElement();
  const importInput = new FakeElement();
  const selectors = {
    '#game-screen': canvas,
    '#game-status': status,
    '#save-slot': slot,
    '#import-game': importInput,
    '#save-game': new FakeElement(),
    '#export-game': new FakeElement(),
    '#import-button': new FakeElement(),
    '#pause-game': new FakeElement(),
    '#resume-game': new FakeElement(),
    '#fullscreen-game': new FakeElement(),
  };
  const touchButtons = ['right', 'interact'].map(
    action => new FakeElement({ action })
  );
  const documentObj = new FakeTarget();
  documentObj.hidden = false;
  documentObj.querySelector = selector => selectors[selector];
  documentObj.querySelectorAll = () => touchButtons;
  let downloadClicked = false;
  documentObj.createElement = () => ({
    click: () => {
      downloadClicked = true;
    },
  });
  documentObj.documentElement = { requestFullscreen: () => Promise.resolve() };
  const storage = new Map();
  let audioClosed = false;
  let storageFails = false;
  const audioFrequencies = [];
  class AudioContext {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    resume() {
      this.state = 'running';
    }
    createOscillator() {
      return {
        frequency: {
          set value(value) {
            audioFrequencies.push(value);
          },
        },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
    close() {
      audioClosed = true;
    }
  }
  const windowObj = new FakeTarget();
  windowObj.document = documentObj;
  windowObj.localStorage = {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => {
      if (storageFails) throw new Error('storage disabled');
      storage.set(key, value);
    },
  };
  windowObj.Blob = class {
    constructor(parts) {
      this.parts = parts;
    }
  };
  windowObj.URL = {
    createObjectURL: () => 'blob:save',
    revokeObjectURL: () => {},
  };
  windowObj.AudioContext = AudioContext;
  const callbacks = [];
  const options = {
    documentObj,
    windowObj,
    navigatorObj: { maxTouchPoints: 1, getGamepads: () => [] },
    requestFrame: callback => (callbacks.push(callback), callbacks.length),
    cancelFrame: jest.fn(),
  };
  return {
    options,
    selectors,
    touchButtons,
    documentObj,
    windowObj,
    callbacks,
    storage,
    didDownload: () => downloadClicked,
    audioIsClosed: () => audioClosed,
    audioFrequencies,
    setStorageFails: value => {
      storageFails = value;
    },
  };
}

/**
 * Seed the fake browser's versioned Mosslight slot.
 * @param {object} page - Browser fixture.
 * @param {object} state - Save state.
 */
function seedSave(page, state) {
  page.storage.set(
    'permanentData',
    JSON.stringify({
      'mosslight-valley-saves-v2': { slots: { 0: serializeSave(state) } },
    })
  );
}

/**
 * Exercise pointer, keyboard, focus, and visibility events.
 * @param {object} page - Page fixture.
 */
function exercisePageInput(page) {
  page.callbacks[0](0);
  page.touchButtons[0].emit('pointerdown', {
    preventDefault() {},
    pointerId: 4,
  });
  page.touchButtons[0].emit('pointercancel');
  page.touchButtons[1].captureThrows = true;
  page.touchButtons[1].emit('pointerdown', {
    preventDefault() {},
    pointerId: 5,
  });
  page.touchButtons[1].emit('lostpointercapture');
  page.windowObj.emit('pointerup');
  page.callbacks[0](140);
  page.documentObj.emit('keydown', {
    key: 'ArrowRight',
    preventDefault: jest.fn(),
  });
  page.documentObj.emit('keyup', { key: 'ArrowRight' });
  page.documentObj.hidden = true;
  page.documentObj.emit('visibilitychange');
  page.documentObj.hidden = false;
  page.documentObj.emit('visibilitychange');
  page.windowObj.emit('blur');
  page.documentObj.hidden = true;
  page.windowObj.emit('blur');
  page.documentObj.hidden = false;
  page.windowObj.emit('focus');
}

/**
 * Exercise local save controls and malformed or valid file imports.
 * @param {object} page - Page fixture.
 */
async function exerciseSaveControls(page) {
  page.selectors['#save-game'].click();
  expect(page.selectors['#game-status'].textContent).toBe(
    'Saved on this device.'
  );
  page.selectors['#export-game'].click();
  expect(page.didDownload()).toBe(true);
  page.selectors['#import-button'].click();
  page.selectors['#import-game'].files = [{ text: async () => '{broken' }];
  await page.selectors['#import-game'].emit('change');
  expect(page.selectors['#game-status'].textContent).toBe(
    'That save could not be read.'
  );
  page.selectors['#import-game'].files = [];
  await page.selectors['#import-game'].emit('change');
  const savedEnvelope = JSON.parse(page.storage.get('permanentData'))[
    'mosslight-valley-saves-v2'
  ].slots['0'];
  page.selectors['#import-game'].files = [{ text: async () => savedEnvelope }];
  await page.selectors['#import-game'].emit('change');
  page.selectors['#save-slot'].value = '2';
  page.selectors['#save-slot'].emit('change');
  page.selectors['#pause-game'].click();
  page.callbacks[0](500);
  expect(page.selectors['#game-status'].textContent).toContain('Paused');
  page.selectors['#resume-game'].click();
  page.callbacks[0](650);
  expect(page.selectors['#game-status'].textContent).not.toContain('Paused');
  page.documentObj.documentElement.requestFullscreen = () =>
    Promise.reject(new Error('fullscreen unsupported'));
  page.selectors['#fullscreen-game'].click();
  await Promise.resolve();
}

test('page presenter handles touch, lifecycle, keyboard, saves, import and export', async () => {
  const page = pageOptions();
  const dispose = startMosslightPage(page.options);
  expect(page.callbacks).toHaveLength(1);
  exercisePageInput(page);
  await exerciseSaveControls(page);
  const callbackCount = page.callbacks.length;
  dispose();
  page.callbacks[0](300);
  expect(page.callbacks).toHaveLength(callbackCount);
  expect(page.audioIsClosed()).toBe(true);
  expect(page.options.cancelFrame).toHaveBeenCalled();
});

test('page tolerates unavailable audio, malformed preferences, and absent frame handles', () => {
  const page = pageOptions();
  page.storage.set('permanentData', '{malformed');
  page.windowObj.AudioContext = null;
  page.windowObj.webkitAudioContext = undefined;
  page.options.requestFrame = callback => (page.callbacks.push(callback), null);
  const dispose = startMosslightPage(page.options);
  page.setStorageFails(true);
  page.options.navigatorObj.getGamepads = undefined;
  page.callbacks[0](0);
  page.callbacks[0](16);
  page.callbacks[0](140);
  page.documentObj.emit('keydown', { key: 'Unmapped', preventDefault() {} });
  dispose();
  expect(page.options.cancelFrame).not.toHaveBeenCalled();
});

test('page audio reacts to a quest reveal and a battle turn', () => {
  const questPage = pageOptions();
  const newGame = createSimulation(CONTENT);
  seedSave(questPage, {
    ...newGame,
    world: {
      ...newGame.world,
      npcs: [],
      player: { x: 8, y: 6, facing: 'up', name: 'Aster' },
    },
  });
  const stopQuestPage = startMosslightPage(questPage.options);
  questPage.callbacks[0](0);
  questPage.documentObj.emit('keydown', { key: 'e', preventDefault() {} });
  questPage.callbacks[0](16);
  questPage.callbacks[0](150);
  questPage.documentObj.emit('keydown', { key: 'e', preventDefault() {} });
  expect(questPage.audioFrequencies).toContain(660);
  stopQuestPage();

  const battlePage = pageOptions();
  seedSave(
    battlePage,
    startBattle(createSimulation(CONTENT), {
      ...CONTENT.creatures[0],
      hp: 30,
    })
  );
  const stopBattlePage = startMosslightPage(battlePage.options);
  battlePage.callbacks[0](0);
  battlePage.documentObj.emit('keydown', { key: 'v', preventDefault() {} });
  battlePage.callbacks[0](16);
  battlePage.callbacks[0](150);
  expect(battlePage.audioFrequencies).toContain(180);
  stopBattlePage();
});
