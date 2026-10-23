import { jest } from '@jest/globals';
import { CONTENT } from '../../../../src/core/browser/game/mosslight-valley/content.js';
import { createSimulation } from '../../../../src/core/browser/game/mosslight-valley/simulation.js';
import { startBattle } from '../../../../src/core/browser/game/mosslight-valley/combat.js';
import { serializeSave } from '../../../../src/core/browser/game/mosslight-valley/save.js';
import {
  createMosslightPageEnvironment,
  startMosslightPage,
} from '../../../../src/core/browser/game/mosslight-valley/pagePresenter.js';

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

test('gamepad face buttons resume agent pauses only while the page is visible', () => {
  const page = pageOptions();
  page.options.browser.navigatorObj.getGamepads = () => [
    { buttons: [{ pressed: true }] },
  ];
  const stop = startMosslightPage(page.options);
  page.selectors['#pause-game'].click();
  page.documentObj.hidden = true;
  page.callbacks[0](0);
  expect(page.selectors['#game-status'].textContent).toContain('Paused');
  page.documentObj.hidden = false;
  page.callbacks[0](150);
  expect(page.selectors['#game-status'].textContent).not.toContain('Paused');
  stop();
});

test('runtime startup failure displays an accessible recovery state', () => {
  const page = pageOptions();
  page.selectors['#game-load-error'].hidden = true;
  page.options.createRuntime = () => {
    throw new Error('scene failed');
  };

  const stop = startMosslightPage(page.options);

  expect(page.selectors['#game-load-error'].hidden).toBe(false);
  expect(page.selectors['#game-status'].textContent).toContain(
    'could not start'
  );
  expect(page.callbacks).toHaveLength(0);
  stop();
});

test('runtime startup failure is safe when the recovery panel is absent', () => {
  const page = pageOptions();
  page.options.browser.documentObj.querySelector = selector =>
    selector === '#game-load-error' ? null : page.selectors[selector];
  page.options.createRuntime = () => {
    throw new Error('scene failed');
  };

  const stop = startMosslightPage(page.options);

  expect(page.selectors['#game-status'].textContent).toContain(
    'could not start'
  );
  expect(page.callbacks).toHaveLength(0);
  stop();
});

test('runtime binding failure displays the accessible recovery state', () => {
  const page = pageOptions();
  page.selectors['#game-load-error'].hidden = true;
  page.options.bindRuntime = () => {
    throw new Error('runtime binding failed');
  };

  const stop = startMosslightPage(page.options);

  expect(page.selectors['#game-load-error'].hidden).toBe(false);
  expect(page.selectors['#game-status'].textContent).toContain(
    'could not start'
  );
  expect(page.callbacks).toHaveLength(0);
  stop();
});

test('initial frame rendering failure displays the accessible recovery state', () => {
  const page = pageOptions();
  page.selectors['#game-load-error'].hidden = true;
  page.options.drawFrame = () => {
    throw new Error('frame failed');
  };

  const stop = startMosslightPage(page.options);

  expect(page.selectors['#game-load-error'].hidden).toBe(false);
  expect(page.selectors['#game-status'].textContent).toContain(
    'could not start'
  );
  expect(page.callbacks).toHaveLength(0);
  stop();
});

test('animation frame failure displays recovery and stops scheduling frames', () => {
  const page = pageOptions();
  page.selectors['#game-load-error'].hidden = true;
  let drawCount = 0;
  page.options.drawFrame = () => {
    drawCount += 1;
    if (drawCount > 1) throw new Error('later frame failed');
  };

  const stop = startMosslightPage(page.options);
  page.callbacks[0](16);

  expect(page.selectors['#game-load-error'].hidden).toBe(false);
  expect(page.selectors['#game-status'].textContent).toContain(
    'could not start'
  );
  expect(page.callbacks).toHaveLength(1);
  stop();
});

test('simulation step failure displays recovery and pauses the runtime', () => {
  const page = pageOptions();
  page.selectors['#game-load-error'].hidden = true;
  const runtime = {
    start: jest.fn(),
    getSlot: () => 0,
    frame: () => ({}),
    getSnapshot: () => ({
      tick: 0,
      world: { map: { name: 'Test' }, day: 1, time: 0 },
    }),
    isRunning: () => true,
    pause: jest.fn(),
    step: () => {
      throw new Error('simulation failed');
    },
  };
  page.options.createRuntime = () => runtime;
  page.options.drawFrame = () => {};

  const stop = startMosslightPage(page.options);
  page.callbacks[0](16);

  expect(page.selectors['#game-load-error'].hidden).toBe(false);
  expect(page.selectors['#game-status'].textContent).toContain(
    'could not start'
  );
  expect(runtime.pause).toHaveBeenCalled();
  expect(page.callbacks).toHaveLength(1);
  stop();
});

test('newly pressed input is acknowledged in the live status line', async () => {
  const page = pageOptions();
  page.options.describeInput = actions => `Input received · ${actions[0]}`;
  const stop = startMosslightPage(page.options);

  await page.documentObj.emit('keydown', {
    key: 'ArrowRight',
    preventDefault() {},
  });
  page.callbacks[0](0);

  expect(page.selectors['#game-status'].textContent).toContain(
    'Input received · right'
  );
  stop();
});

test('page-specific action allowlists reject keyboard, touch, and gamepad actions', async () => {
  const page = pageOptions();
  const accepted = [];
  let tick = 0;
  const runtime = {
    start() {},
    getSlot: () => 0,
    frame: () => ({}),
    getSnapshot: () => ({
      tick,
      world: { map: { name: 'Test' }, day: 1, time: 0 },
    }),
    isRunning: () => true,
    pause() {},
    resume() {},
    step(_delta, actions) {
      accepted.push(actions);
      if (actions.length) tick += 1;
    },
  };
  page.options.createRuntime = () => runtime;
  page.options.drawFrame = () => {};
  page.options.allowedActions = [
    'up',
    'down',
    'left',
    'right',
    'a',
    'b',
    'x',
    'y',
  ];
  page.options.browser.navigatorObj.getGamepads = () => [
    {
      axes: [],
      buttons: Array.from({ length: 5 }, (_, index) => ({
        pressed: index === 4,
      })),
    },
  ];

  const stop = startMosslightPage(page.options);
  page.callbacks[0](0);
  const preventDefault = jest.fn();
  await page.documentObj.emit('keydown', { key: 'e', preventDefault });
  await page.touchButtons[1].emit('pointerdown', {
    preventDefault: jest.fn(),
    pointerId: 8,
  });
  page.callbacks[0](16);

  expect(preventDefault).not.toHaveBeenCalled();
  expect(accepted.flat()).not.toContain('interact');

  const allowedKey = { key: 'ArrowRight', preventDefault: jest.fn() };
  await page.documentObj.emit('keydown', allowedKey);
  page.callbacks[0](32);
  expect(allowedKey.preventDefault).toHaveBeenCalled();
  expect(accepted.at(-1)).toContain('right');
  stop();
});

test.each(['export', 'import', 'fullscreen', 'unknown'])(
  'controller save utility %s reaches its browser adapter',
  command => {
    const page = pageOptions();
    const selector = {
      export: '#export-game',
      import: '#import-button',
      fullscreen: '#fullscreen-game',
    }[command];
    const clicked = selector
      ? jest.spyOn(page.selectors[selector], 'click')
      : null;
    seedSave(page, { ...createSimulation(), controllerCommand: command });
    const stop = startMosslightPage(page.options);
    page.callbacks[0](0);
    page.callbacks[0](16);
    page.callbacks[0](150);
    if (clicked) expect(clicked).toHaveBeenCalledTimes(1);
    stop();
  }
);

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
  const loadError = new FakeElement();
  const slot = new FakeElement();
  const importInput = new FakeElement();
  const selectors = {
    '#game-screen': canvas,
    '#game-status': status,
    '#game-load-error': loadError,
    '#save-slot': slot,
    '#import-game': importInput,
    '#save-game': new FakeElement(),
    '#reset-game': new FakeElement(),
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
  windowObj.confirm = jest.fn(() => false);
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
    browser: {
      documentObj,
      windowObj,
      navigatorObj: { maxTouchPoints: 1, getGamepads: () => [] },
    },
    animation: {
      requestFrame: callback => (callbacks.push(callback), callbacks.length),
      cancelFrame: jest.fn(),
    },
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

test('page reset confirmation cancels safely, clears held input and preserves the paused current slot', async () => {
  const page = pageOptions();
  const state = createSimulation();
  state.world.flags.memoryCount = 3;
  seedSave(page, state);
  const dispose = startMosslightPage(page.options);
  const before = page.storage.get('permanentData');
  await page.selectors['#reset-game'].emit('click');
  expect(page.storage.get('permanentData')).toBe(before);
  expect(page.windowObj.confirm).toHaveBeenCalledWith(
    expect.stringContaining('slot 01')
  );
  page.windowObj.confirm.mockReturnValue(true);
  await page.selectors['#pause-game'].emit('click');
  await page.documentObj.emit('keydown', {
    key: 'ArrowRight',
    preventDefault() {},
  });
  await page.touchButtons[0].emit('pointerdown', {
    preventDefault() {},
    pointerId: 1,
  });
  await page.selectors['#reset-game'].emit('click');
  const saved = JSON.parse(page.storage.get('permanentData'));
  expect(JSON.parse(saved['mosslight-valley-saves-v2'].slots[0]).state).toEqual(
    createSimulation()
  );
  expect(page.selectors['#game-status'].textContent).not.toContain('Paused');
  await page.selectors['#resume-game'].emit('click');
  page.callbacks[0](10);
  page.callbacks[0](160);
  const resumed = JSON.parse(page.storage.get('permanentData'));
  expect(
    JSON.parse(resumed['mosslight-valley-saves-v2'].slots[0]).state.world.player
      .x
  ).toBe(6);
  dispose();
});

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
  expect(page.options.animation.cancelFrame).toHaveBeenCalled();
});

test('page tolerates unavailable audio, malformed preferences, and absent frame handles', () => {
  const page = pageOptions();
  page.storage.set('permanentData', '{malformed');
  page.windowObj.AudioContext = null;
  page.windowObj.webkitAudioContext = undefined;
  page.options.animation.requestFrame = callback => (
    page.callbacks.push(callback), null
  );
  const dispose = startMosslightPage(page.options);
  page.setStorageFails(true);
  page.options.browser.navigatorObj.getGamepads = undefined;
  page.callbacks[0](0);
  page.callbacks[0](16);
  page.callbacks[0](140);
  page.documentObj.emit('keydown', { key: 'Unmapped', preventDefault() {} });
  dispose();
  expect(page.options.animation.cancelFrame).not.toHaveBeenCalled();
});

test('injected episode audio owns keyboard, touch and teardown without legacy beeps', () => {
  const page = pageOptions();
  const audio = { unlock: jest.fn(), dispose: jest.fn(), stop: jest.fn() };
  const dispose = startMosslightPage({ ...page.options, audio });
  page.documentObj.emit('keydown', { key: 'a', preventDefault() {} });
  page.touchButtons[0].emit('pointerdown', {
    pointerId: 9,
    preventDefault() {},
  });
  expect(audio.unlock).toHaveBeenCalledTimes(2);
  expect(page.audioFrequencies).toEqual([]);
  dispose();
  expect(audio.stop).toHaveBeenCalled();
  expect(audio.dispose).toHaveBeenCalledTimes(1);
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
  questPage.documentObj.emit('keydown', { key: 'a', preventDefault() {} });
  questPage.callbacks[0](16);
  questPage.callbacks[0](150);
  questPage.documentObj.emit('keydown', { key: 'a', preventDefault() {} });
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
  battlePage.documentObj.emit('keydown', { key: 'b', preventDefault() {} });
  battlePage.callbacks[0](16);
  battlePage.callbacks[0](150);
  expect(battlePage.audioFrequencies).toContain(180);
  stopBattlePage();
});

test('shares file controls across named save formats with accessible success and failure feedback', async () => {
  const page = pageOptions();
  const exportButton = new FakeElement();
  const importButton = new FakeElement();
  const input = new FakeElement();
  page.selectors['#export-campaign'] = exportButton;
  page.selectors['#import-campaign-button'] = importButton;
  page.selectors['#import-campaign'] = input;
  page.options.saveTransfers = [
    {
      exportSelector: '#export-campaign',
      importSelector: '#import-campaign-button',
      inputSelector: '#import-campaign',
      exportMethod: 'exportSave',
      importMethod: 'importSave',
      filename: 'campaign.json',
      successText: 'Campaign restored.',
      errorText: 'Campaign was kept.',
    },
  ];
  const dispose = startMosslightPage(page.options);
  exportButton.click();
  expect(page.didDownload()).toBe(true);
  importButton.click();
  input.files = [];
  await input.emit('change');
  input.files = [{ text: async () => '{' }];
  await input.emit('change');
  expect(page.selectors['#game-status'].textContent).toBe('Campaign was kept.');
  page.selectors['#save-game'].click();
  const value = JSON.parse(page.storage.get('permanentData'))[
    'mosslight-valley-saves-v2'
  ].slots['0'];
  input.files = [{ text: async () => value }];
  await input.emit('change');
  expect(page.selectors['#game-status'].textContent).toBe('Campaign restored.');
  expect(input.value).toBe('');
  page.windowObj.Blob = class {
    constructor() {
      throw new Error('download unavailable');
    }
  };
  exportButton.click();
  expect(page.selectors['#game-status'].textContent).toBe(
    'That backup could not be created.'
  );
  dispose();
});

test('groups browser adapters without ambient globals', () => {
  const options = {
    documentObj: {},
    windowObj: {},
    navigatorObj: {},
    requestFrame: jest.fn(),
    cancelFrame: jest.fn(),
  };
  expect(createMosslightPageEnvironment(options)).toEqual({
    browser: {
      documentObj: options.documentObj,
      windowObj: options.windowObj,
      navigatorObj: options.navigatorObj,
    },
    animation: {
      requestFrame: options.requestFrame,
      cancelFrame: options.cancelFrame,
    },
  });
});

test.each([false, true])(
  'save feedback respects reported unsaved progress (%s)',
  dirty => {
    const page = pageOptions();
    const runtime = {
      start: jest.fn(),
      getSlot: () => 0,
      frame: () => ({}),
      save: jest.fn(),
      getPersistenceStatus: () => ({ dirty }),
      getSnapshot: () => ({
        world: { map: { name: 'Test' }, day: 1, time: 0 },
      }),
      isRunning: () => true,
      pause: jest.fn(),
    };
    page.options.createRuntime = () => runtime;
    page.options.drawFrame = () => {};
    page.options.registerTools = () => () => {};
    const dispose = startMosslightPage(page.options);
    page.selectors['#save-game'].click();
    expect(page.selectors['#game-status'].textContent).toBe(
      dirty
        ? 'Progress is only in this open page. Back up before leaving.'
        : 'Saved on this device.'
    );
    dispose();
  }
);
