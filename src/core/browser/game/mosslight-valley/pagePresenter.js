import { createMosslightRuntime } from './runtime.js';
import { updateInput, gamepadActions } from './input.js';
import { drawGameFrame } from './renderer.js';
import { registerMosslightTools } from './webmcp.js';
import { resetSavePrompt } from './save.js';

/**
 * Group browser and animation APIs for the shared page presenter.
 * @param {Record<string, any>} options Flat browser dependencies from page entrypoints.
 * @returns {{browser: {documentObj: any, windowObj: any, navigatorObj: any}, animation: {requestFrame: Function, cancelFrame: Function}}} Presenter adapters.
 */
export function createMosslightPageEnvironment(options) {
  return {
    browser: {
      documentObj: options.documentObj,
      windowObj: options.windowObj,
      navigatorObj: options.navigatorObj,
    },
    animation: {
      requestFrame: options.requestFrame,
      cancelFrame: options.cancelFrame,
    },
  };
}

/**
 * Keep only actions supported by the current page, preserving first-seen order.
 * @param {string[]} actions Active keyboard, touch, or gamepad actions.
 * @param {string[]|undefined} allowedActions Optional page-specific action set.
 * @returns {string[]} Accepted actions.
 */
function filterAllowedActions(actions, allowedActions) {
  const uniqueActions = [...new Set(actions)];
  return allowedActions
    ? uniqueActions.filter(action => allowedActions.includes(action))
    : uniqueActions;
}

/**
 * Check whether one normalized action belongs to the current page's controls.
 * @param {string|undefined} action Normalized input action.
 * @param {string[]|undefined} allowedActions Optional page-specific action set.
 * @returns {boolean} Whether the input should be handled.
 */
function isActionAllowed(action, allowedActions) {
  return (
    typeof action === 'string' &&
    (!allowedActions || allowedActions.includes(action))
  );
}

/**
 * Mount the shared RPG in a responsive page and return its lifecycle disposer.
 * @param {any} options Injected browser APIs and animation-frame functions.
 * @returns {() => void} Function that stops the page game loop and listeners.
 */
export function startMosslightPage(options) {
  const { browser, animation } = options;
  const { documentObj, windowObj, navigatorObj } = browser;
  const { requestFrame, cancelFrame } = animation;
  const { context, status, loadError } = pageCanvasElements(documentObj);
  const keys = { held: new Set(), pressed: new Set() };
  const touch = new Set();
  const touchPulse = new Set();
  /** @type {number | null} */
  let frameId = null;
  let lastTime = 0;
  let disposed = false;
  let failed = false;
  let inputFeedback = '';
  let inputFeedbackUntil = 0;
  let disposePageBindings = () => {};
  /** @type {any} */
  let audioContext = null;
  const permanent = () => {
    try {
      return JSON.parse(
        windowObj.localStorage.getItem('permanentData') || '{}'
      );
    } catch {
      return {};
    }
  };
  const setPermanent = (/** @type {Record<string, any>} */ update) => {
    const next = { ...permanent(), ...update };
    try {
      windowObj.localStorage.setItem('permanentData', JSON.stringify(next));
    } catch {
      status.textContent =
        'Browser storage is unavailable; export your save to keep it.';
    }
    return next;
  };
  const env = /** @type {Map<string, (...args: any[]) => any>} */ (
    new Map([
      [
        'setLocalPermanentData',
        /** @type {(...args: any[]) => any} */ (setPermanent),
      ],
      [
        'playAudioCue',
        /** @type {(...args: any[]) => any} */ (
          (/** @type {string} */ cue) => playCue(cue)
        ),
      ],
    ])
  );
  const runtimeFactory = options.createRuntime || createMosslightRuntime;
  const showLoadError = () => {
    failed = true;
    status.textContent = 'The game could not start. Use the recovery link.';
    if (loadError) loadError.hidden = false;
  };
  const runtime = startPageRuntime(runtimeFactory, env, options, documentObj);
  if (!runtime) {
    showLoadError();
    return () => {};
  }

  /**
   *
   * @param {string} cue Audio cue identifier.
   */
  function playCue(cue) {
    try {
      const AudioCtor = windowObj.AudioContext || windowObj.webkitAudioContext;
      if (!AudioCtor || cue === 'stop') return;
      audioContext ||= new AudioCtor();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = cue.includes('quest')
        ? 660
        : cue.includes('battle')
          ? 180
          : 330;
      gain.gain.setValueAtTime(0.035, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.12
      );
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.13);
    } catch {
      /* Audio is optional and mobile browsers may defer it until a gesture. */
    }
  }
  /**
   * Draw the current game frame.
   * @param {number} time Animation frame timestamp.
   */
  function draw(/** @type {number} */ time = 0) {
    try {
      documentObj.querySelector('#save-slot').value = String(runtime.getSlot());
      (options.drawFrame || drawGameFrame)(context, runtime.frame());
      const world = runtime.getSnapshot().world;
      const clock = `${world.map.name} · Day ${world.day} · ${Math.floor(world.time)}:00`;
      status.textContent =
        inputFeedback && time < inputFeedbackUntil
          ? `${inputFeedback} · ${clock}`
          : runtime.isRunning() && runtime.getSnapshot().menu?.page !== 'paused'
            ? clock
            : `${clock} · Paused · resume when ready.`;
    } catch {
      showLoadError();
      runtime.pause();
    }
  }
  try {
    disposePageBindings =
      options.bindRuntime?.({ runtime, documentObj, draw, status }) ||
      (() => {});
  } catch {
    showLoadError();
  }
  /**
   *
   * @returns {string[]} Current keyboard, touch, and gamepad actions.
   */
  function actions() {
    const current = [
      ...keys.held,
      ...keys.pressed,
      ...touch,
      ...touchPulse,
      ...gamepadActions(navigatorObj.getGamepads?.() || []),
    ];
    return filterAllowedActions(current, options.allowedActions);
  }
  /**
   *
   * @param {number} time Animation frame timestamp.
   */
  function loop(time) {
    if (disposed || failed) return;
    const delta = lastTime ? time - lastTime : 16;
    const previousTick = runtime.getSnapshot().tick;
    const frameActions = actions();
    if (frameActions.length && !documentObj.hidden && !runtime.isRunning())
      runtime.resume();
    const newlyPressed = filterAllowedActions(
      [...keys.pressed, ...touchPulse],
      options.allowedActions
    );
    if (newlyPressed.length) {
      inputFeedback = options.describeInput?.([...new Set(newlyPressed)]) || '';
      inputFeedbackUntil = time + 1500;
    }
    try {
      runtime.step(delta, frameActions);
    } catch {
      showLoadError();
      runtime.pause();
      return;
    }
    lastTime = time;
    if (runtime.getSnapshot().tick > previousTick) {
      keys.pressed.clear();
      clearTouchPulse();
    }
    draw(time);
    if (failed) return;
    frameId = requestFrame(loop);
  }
  /**
   *
   * @param {{key: string, preventDefault: () => void}} event Keyboard event.
   */
  function onKeyDown(event) {
    const action = updateInput(
      { held: new Set(), pressed: new Set() },
      { type: 'keydown', key: event.key }
    )
      .pressed.values()
      .next().value;
    if (!isActionAllowed(action, options.allowedActions)) return;
    const next = updateInput(keys, { type: 'keydown', key: event.key });
    keys.held = next.held;
    keys.pressed = next.pressed;
    if (keys.held.size && !runtime.isRunning()) runtime.resume();
    if (keys.held.size) event.preventDefault();
    if (options.audio) options.audio.unlock();
    else if (!audioContext) playCue('wake');
  }
  /**
   *
   * @param {{key: string}} event Keyboard event.
   */
  function onKeyUp(event) {
    const next = updateInput(keys, { type: 'keyup', key: event.key });
    keys.held = new Set(
      filterAllowedActions([...next.held], options.allowedActions)
    );
    keys.pressed = new Set(
      filterAllowedActions([...next.pressed], options.allowedActions)
    );
  }
  /**
   *
   */
  function releaseTouch() {
    touch.clear();
  }
  /**
   * Clear held touch buttons and pending taps when focus is lost.
   */
  function resetTouch() {
    releaseTouch();
    clearTouchPulse();
  }
  /**
   * Clear one-frame touch actions.
   * @returns {void}
   */
  function clearTouchPulse() {
    touchPulse.clear();
  }
  /**
   * Resume the game clock from a fresh frame after focus returns.
   */
  function resumeAfterFocus() {
    runtime.resume();
    lastTime = 0;
  }
  /**
   *
   */
  function onVisibility() {
    if (documentObj.hidden) {
      runtime.pause();
      resetTouch();
    } else {
      resumeAfterFocus();
    }
  }
  /**
   *
   */
  function onBlur() {
    if (!documentObj.hidden) {
      keys.held.clear();
      keys.pressed.clear();
      resetTouch();
      return;
    }
    runtime.pause();
    keys.held.clear();
    keys.pressed.clear();
    resetTouch();
  }
  /**
   *
   */
  function onFocus() {
    resumeAfterFocus();
  }
  const disposePageControls = bindPageControls({
    documentObj,
    windowObj,
    runtime,
    options,
    closeAudio: () => audioContext?.close?.(),
    status,
    draw,
    keys,
    touch,
    touchPulse,
    releaseTouch,
    onKeyDown,
    onKeyUp,
    onVisibility,
    onBlur,
    onFocus,
    resetTouch,
    resetFocus: () => {
      lastTime = 0;
    },
  });
  draw();
  if (failed) showLoadError();
  else frameId = requestFrame(loop);
  return () => {
    disposed = true;
    disposePageControls();
    if (frameId !== null) cancelFrame(frameId);
    disposePageBindings();
    runtime.pause();
    options.audio?.dispose();
  };
}

/**
 * Bind keyboard, touch, tool, and utility controls for the page lifecycle.
 * @param {any} options Presenter dependencies and event handlers.
 * @returns {() => void} Remove installed listeners and page tools.
 */
function bindPageControls(options) {
  const pageOptions = options.options;
  bindTouchControls(
    options.documentObj,
    options.touch,
    options.touchPulse,
    () => {
      pageOptions.audio?.unlock();
      options.runtime.resume();
    }
  );
  const registerTools = pageOptions.registerTools || registerMosslightTools;
  const disposeAgentTools = registerTools({
    modelContext: options.documentObj.modelContext,
    runtime: options.runtime,
    redraw: options.draw,
  });
  options.windowObj.addEventListener('pointerup', options.releaseTouch);
  options.windowObj.addEventListener('pointercancel', options.releaseTouch);
  bindUtilityControls({
    browser: {
      documentObj: options.documentObj,
      windowObj: options.windowObj,
    },
    runtime: options.runtime,
    page: {
      status: options.status,
      draw: options.draw,
      onReset: () => {
        options.keys.held.clear();
        options.keys.pressed.clear();
        options.resetTouch();
        options.resetFocus();
      },
      onResume: () => {
        options.runtime.resume();
        options.resetFocus();
        options.draw();
      },
    },
    saveFilename: pageOptions.saveFilename || 'mosslight-valley-save.json',
    saveTransfers: pageOptions.saveTransfers || [],
  });
  options.documentObj.addEventListener('keydown', options.onKeyDown);
  options.documentObj.addEventListener('keyup', options.onKeyUp);
  options.documentObj.addEventListener(
    'visibilitychange',
    options.onVisibility
  );
  options.windowObj.addEventListener('blur', options.onBlur);
  options.windowObj.addEventListener('focus', options.onFocus);
  return () => {
    disposeAgentTools();
    options.documentObj.removeEventListener('keydown', options.onKeyDown);
    options.documentObj.removeEventListener('keyup', options.onKeyUp);
    options.documentObj.removeEventListener(
      'visibilitychange',
      options.onVisibility
    );
    options.windowObj.removeEventListener('blur', options.onBlur);
    options.windowObj.removeEventListener('focus', options.onFocus);
    options.windowObj.removeEventListener('pointerup', options.releaseTouch);
    options.windowObj.removeEventListener(
      'pointercancel',
      options.releaseTouch
    );
    options.closeAudio();
  };
}

/**
 * Resolve the canvas drawing context and status element for a game page.
 * @param {any} documentObj Page document adapter.
 * @returns {{context: any, status: any, loadError: any}} Drawing and status elements.
 */
function pageCanvasElements(documentObj) {
  const canvas = documentObj.querySelector('#game-screen');
  return {
    context: canvas.getContext('2d'),
    status: documentObj.querySelector('#game-status'),
    loadError: documentObj.querySelector('#game-load-error'),
  };
}

/**
 * Create and start the page runtime, returning null if startup throws.
 * @param {Function} runtimeFactory Runtime constructor.
 * @param {Map<string, (...args: any[]) => any>} env Runtime environment.
 * @param {any} options Page options.
 * @param {any} documentObj Page document adapter.
 * @returns {any|null} Started runtime or null after a startup failure.
 */
function startPageRuntime(runtimeFactory, env, options, documentObj) {
  try {
    const runtime = runtimeFactory({
      env,
      audio: options.audio,
      onControllerCommand: (/** @type {string} */ command) => {
        const selector = /** @type {Record<string, string>} */ ({
          export: '#export-game',
          import: '#import-button',
          fullscreen: '#fullscreen-game',
        })[command];
        if (selector) documentObj.querySelector(selector).click();
      },
    });
    runtime.start();
    return runtime;
  } catch {
    return null;
  }
}

/**
 *
 * @param {string} value Serialized save data.
 * @param {string} name Download filename.
 * @param {any} windowObj Browser window adapter.
 */
function download(value, name, windowObj) {
  const blob = new windowObj.Blob([value], { type: 'application/json' });
  const url = windowObj.URL.createObjectURL(blob);
  const link = windowObj.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  windowObj.URL.revokeObjectURL(url);
}

/**
 * Bind pointer controls so taps and holds both reach the fixed-step game loop.
 * @param {any} documentObj Page document containing action buttons.
 * @param {Set<string>} touch - Held pointer actions.
 * @param {Set<string>} touchPulse - One-tick pointer actions.
 * @param {() => void} resume Resume a paused agent session from a physical press.
 */
function bindTouchControls(documentObj, touch, touchPulse, resume) {
  for (const button of documentObj.querySelectorAll('[data-action]')) {
    const action = button.dataset.action;
    button.addEventListener(
      'pointerdown',
      (
        /** @type {{preventDefault: () => void, pointerId: number}} */ event
      ) => {
        event.preventDefault();
        resume();
        touch.add(action);
        touchPulse.add(action);
        try {
          button.setPointerCapture?.(event.pointerId);
        } catch {
          /* Older mobile browsers may not support capture. */
        }
      }
    );
    const release = () => touch.delete(action);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('click', release);
  }
}

/**
 * Connect save slots and page utility actions to the shared runtime.
 * @param {any} options Page elements and game runtime dependencies.
 */
function bindUtilityControls(options) {
  const { browser, runtime, page, saveFilename } = options;
  const { status, draw, onResume, onReset } = page;
  const { documentObj, windowObj } = browser;
  const listen = (
    /** @type {string} */ selector,
    /** @type {string} */ event,
    /** @type {(event: any) => void} */ handler
  ) => documentObj.querySelector(selector).addEventListener(event, handler);
  const slotPicker = documentObj.querySelector('#save-slot');
  slotPicker.value = String(runtime.getSlot());
  slotPicker.addEventListener('change', () => {
    runtime.loadSlot(Number(slotPicker.value));
    draw();
  });
  listen('#save-game', 'click', () => {
    runtime.save();
    status.textContent = describeSavePersistence(runtime);
  });
  listen('#reset-game', 'click', () => {
    if (!windowObj.confirm(resetSavePrompt(runtime.getSlot()))) return;
    runtime.resetSave();
    onReset();
    draw();
  });
  const transfers = [
    {
      exportSelector: '#export-game',
      importSelector: '#import-button',
      inputSelector: '#import-game',
      exportMethod: 'exportSave',
      importMethod: 'importSave',
      filename: saveFilename,
      errorText: 'That save could not be read.',
    },
    ...options.saveTransfers,
  ];
  for (const transfer of transfers) {
    bindExportControl(
      documentObj.querySelector(transfer.exportSelector),
      () =>
        download(
          runtime[transfer.exportMethod](),
          transfer.filename,
          windowObj
        ),
      status
    );
    bindImportControl(documentObj, runtime, transfer, {
      onImport: () => {
        slotPicker.value = String(runtime.getSlot());
        draw();
      },
      status,
    });
  }
  listen('#pause-game', 'click', () => {
    runtime.pause();
    status.textContent = 'Paused · resume when ready.';
  });
  listen('#resume-game', 'click', onResume);
  listen('#fullscreen-game', 'click', () =>
    Promise.resolve(documentObj.documentElement.requestFullscreen?.()).catch(
      () => {}
    )
  );
}

/**
 * Bind a named export action with accessible failure feedback.
 * @param {any} button Export button.
 * @param {() => void} exportFile Bound file creation operation.
 * @param {any} status Accessible status element.
 * @returns {void}
 */
function bindExportControl(button, exportFile, status) {
  button.addEventListener('click', () => {
    try {
      exportFile();
    } catch {
      status.textContent = 'That backup could not be created.';
    }
  });
}

/**
 * Bind a named import format to shared file-reading and status behavior.
 * @param {any} documentObj Injected page document.
 * @param {any} runtime Save operations.
 * @param {any} transfer Named file format descriptor.
 * @param {any} page Import callback and accessible status element.
 * @returns {void}
 */
function bindImportControl(documentObj, runtime, transfer, page) {
  const input = documentObj.querySelector(transfer.inputSelector);
  documentObj
    .querySelector(transfer.importSelector)
    .addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      runtime[transfer.importMethod](await file.text());
      page.onImport();
      if (transfer.successText) page.status.textContent = transfer.successText;
    } catch {
      page.status.textContent = transfer.errorText;
    } finally {
      input.value = '';
    }
  });
}

/**
 * Report whether the runtime could persist the requested save.
 * @param {any} runtime Game exposing optional persistence feedback.
 * @returns {string} Accessible save result.
 */
function describeSavePersistence(runtime) {
  if (runtime.getPersistenceStatus?.().dirty)
    return 'Progress is only in this open page. Back up before leaving.';
  return 'Saved on this device.';
}
