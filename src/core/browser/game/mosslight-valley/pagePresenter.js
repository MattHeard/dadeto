// @ts-nocheck -- browser objects are injected by the static-page entrypoint.
import { createMosslightRuntime } from './runtime.js';
import { updateInput, gamepadActions } from './input.js';
import { drawGameFrame } from './renderer.js';
import { registerMosslightTools } from './webmcp.js';
import { resetSavePrompt } from './save.js';

/**
 * Mount the shared RPG in a responsive page and return its lifecycle disposer.
 * @param {object} options - Injected browser APIs and animation-frame functions.
 * @returns {Function} A function that stops the page game loop and listeners.
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
  let frameId = null;
  let lastTime = 0;
  let disposed = false;
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
  const setPermanent = update => {
    const next = { ...permanent(), ...update };
    try {
      windowObj.localStorage.setItem('permanentData', JSON.stringify(next));
    } catch {
      status.textContent =
        'Browser storage is unavailable; export your save to keep it.';
    }
    return next;
  };
  const env = new Map([
    ['setLocalPermanentData', setPermanent],
    ['playAudioCue', cue => playCue(cue)],
  ]);
  const runtime = createMosslightRuntime({
    env,
    onControllerCommand: command => {
      const selector = {
        export: '#export-game',
        import: '#import-button',
        fullscreen: '#fullscreen-game',
      }[command];
      if (selector) documentObj.querySelector(selector).click();
    },
  });
  runtime.start();

  /**
   *
   * @param {unknown} cue - The cue argument.
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
    drawGameFrame(context, runtime.frame());
    const world = runtime.getSnapshot().world;
    const clock = `${world.map.name} · Day ${world.day} · ${Math.floor(world.time)}:00`;
    status.textContent =
      runtime.isRunning() && runtime.getSnapshot().menu?.page !== 'paused'
        ? clock
        : `${clock} · Paused · resume when ready.`;
  }
  /**
   *
   * @returns {unknown} The computed result.
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
   * @param {unknown} time - The time argument.
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
      touchPulse.clear();
    }
    draw();
    frameId = requestFrame(loop);
  }
  /**
   *
   * @param {unknown} event - The event argument.
   */
  function onKeyDown(event) {
    const next = updateInput(keys, { type: 'keydown', key: event.key });
    keys.held = next.held;
    keys.pressed = next.pressed;
    if (keys.held.size && !runtime.isRunning()) runtime.resume();
    if (keys.held.size) event.preventDefault();
    if (!audioContext) playCue('wake');
  }
  /**
   *
   * @param {unknown} event - The event argument.
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
    touchPulse.clear();
  }
  /**
   *
   */
  function onVisibility() {
    if (documentObj.hidden) {
      runtime.pause();
      resetTouch();
    } else {
      runtime.resume();
      lastTime = 0;
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
    runtime.resume();
    lastTime = 0;
  }
  bindTouchControls(documentObj, touch, touchPulse, () => runtime.resume());
  const disposeAgentTools = registerMosslightTools({
    modelContext: documentObj.modelContext,
    runtime,
    redraw: draw,
  });
  windowObj.addEventListener('pointerup', releaseTouch);
  windowObj.addEventListener('pointercancel', releaseTouch);
  bindUtilityControls({
    documentObj,
    windowObj,
    runtime,
    status,
    draw,
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
  };
}

/**
 *
 * @param {unknown} value - The value argument.
 * @param {unknown} name - The name argument.
 * @param {unknown} windowObj - The windowObj argument.
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
 * @param {object} documentObj - Page document containing action buttons.
 * @param {Set<string>} touch - Held pointer actions.
 * @param {Set<string>} touchPulse - One-tick pointer actions.
 * @param {Function} resume Resume a paused agent session from a physical press.
 */
function bindTouchControls(documentObj, touch, touchPulse, resume) {
  for (const button of documentObj.querySelectorAll('[data-action]')) {
    const action = button.dataset.action;
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      resume();
      touch.add(action);
      touchPulse.add(action);
      try {
        button.setPointerCapture?.(event.pointerId);
      } catch {
        /* Older mobile browsers may not support capture. */
      }
    });
    const release = () => touch.delete(action);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('click', release);
  }
}

/**
 * Connect save slots and page utility actions to the shared runtime.
 * @param {object} options - Page elements and game runtime dependencies.
 */
function bindUtilityControls(options) {
  const { documentObj, windowObj, runtime, status, draw, onResume, onReset } =
    options;
  const listen = (selector, event, handler) =>
    documentObj.querySelector(selector).addEventListener(event, handler);
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
    download(runtime.exportSave(), 'mosslight-valley-save.json', windowObj)
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
