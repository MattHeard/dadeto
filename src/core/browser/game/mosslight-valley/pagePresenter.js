import { createMosslightRuntime } from './runtime.js';
import { updateInput, gamepadActions } from './input.js';
import { drawGameFrame } from './renderer.js';
import { registerMosslightTools } from './webmcp.js';
import { resetSavePrompt } from './save.js';

/**
 * Mount the shared RPG in a responsive page and return its lifecycle disposer.
 * @param {any} options Injected browser APIs and animation-frame functions.
 * @returns {() => void} Function that stops the page game loop and listeners.
 */
export function startMosslightPage(options) {
  const { documentObj, windowObj, navigatorObj, requestFrame, cancelFrame } =
    options;
  const canvas = documentObj.querySelector('#game-screen');
  const context = canvas.getContext('2d');
  const status = documentObj.querySelector('#game-status');
  const keys = { held: new Set(), pressed: new Set() };
  const touch = new Set();
  const touchPulse = new Set();
  /** @type {number | null} */
  let frameId = null;
  let lastTime = 0;
  let disposed = false;
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
   *
   */
  function draw() {
    documentObj.querySelector('#save-slot').value = String(runtime.getSlot());
    (options.drawFrame || drawGameFrame)(context, runtime.frame());
    const world = runtime.getSnapshot().world;
    const clock = `${world.map.name} · Day ${world.day} · ${Math.floor(world.time)}:00`;
    status.textContent =
      runtime.isRunning() && runtime.getSnapshot().menu?.page !== 'paused'
        ? clock
        : `${clock} · Paused · resume when ready.`;
  }
  /**
   *
   * @returns {string[]} Current keyboard, touch, and gamepad actions.
   */
  function actions() {
    return [
      ...keys.held,
      ...keys.pressed,
      ...touch,
      ...touchPulse,
      ...gamepadActions(navigatorObj.getGamepads?.() || []),
    ];
  }
  /**
   *
   * @param {number} time Animation frame timestamp.
   */
  function loop(time) {
    if (disposed) return;
    const delta = lastTime ? time - lastTime : 16;
    const previousTick = runtime.getSnapshot().tick;
    const frameActions = actions();
    if (frameActions.length && !documentObj.hidden && !runtime.isRunning())
      runtime.resume();
    runtime.step(delta, frameActions);
    lastTime = time;
    if (runtime.getSnapshot().tick > previousTick) {
      keys.pressed.clear();
      clearTouchPulse();
    }
    draw();
    frameId = requestFrame(loop);
  }
  /**
   *
   * @param {{key: string, preventDefault: () => void}} event Keyboard event.
   */
  function onKeyDown(event) {
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
    keys.held = next.held;
    keys.pressed = next.pressed;
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
  bindTouchControls(documentObj, touch, touchPulse, () => {
    options.audio?.unlock();
    runtime.resume();
  });
  const registerTools = options.registerTools || registerMosslightTools;
  const disposeAgentTools = registerTools({
    modelContext: documentObj.modelContext,
    runtime,
    redraw: draw,
  });
  windowObj.addEventListener('pointerup', releaseTouch);
  windowObj.addEventListener('pointercancel', releaseTouch);
  bindUtilityControls({
    browser: { documentObj, windowObj },
    runtime,
    status,
    draw,
    saveFilename: options.saveFilename || 'mosslight-valley-save.json',
    onReset: () => {
      keys.held.clear();
      keys.pressed.clear();
      resetTouch();
      lastTime = 0;
    },
    onResume: () => {
      runtime.resume();
      lastTime = 0;
      draw();
    },
  });
  documentObj.addEventListener('keydown', onKeyDown);
  documentObj.addEventListener('keyup', onKeyUp);
  documentObj.addEventListener('visibilitychange', onVisibility);
  windowObj.addEventListener('blur', onBlur);
  windowObj.addEventListener('focus', onFocus);
  draw();
  frameId = requestFrame(loop);
  return () => {
    disposed = true;
    disposeAgentTools();
    if (frameId !== null) cancelFrame(frameId);
    runtime.pause();
    documentObj.removeEventListener('keydown', onKeyDown);
    documentObj.removeEventListener('keyup', onKeyUp);
    documentObj.removeEventListener('visibilitychange', onVisibility);
    windowObj.removeEventListener('blur', onBlur);
    windowObj.removeEventListener('focus', onFocus);
    windowObj.removeEventListener('pointerup', releaseTouch);
    windowObj.removeEventListener('pointercancel', releaseTouch);
    audioContext?.close?.();
    options.audio?.dispose();
  };
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
  const { browser, runtime, status, draw, onResume, onReset, saveFilename } =
    options;
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
    status.textContent = 'Saved on this device.';
  });
  listen('#reset-game', 'click', () => {
    if (!windowObj.confirm(resetSavePrompt(runtime.getSlot()))) return;
    runtime.resetSave();
    onReset();
    draw();
  });
  listen('#export-game', 'click', () =>
    download(runtime.exportSave(), saveFilename, windowObj)
  );
  const importInput = documentObj.querySelector('#import-game');
  listen('#import-button', 'click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      runtime.importSave(await file.text());
      slotPicker.value = String(runtime.getSlot());
      draw();
    } catch {
      status.textContent = 'That save could not be read.';
    }
  });
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
