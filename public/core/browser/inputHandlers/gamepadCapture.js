import * as browserCore from '../browser-core.js';
import captureLifecycleDeps from './captureLifecycleDeps.js';
import { updateCaptureButtonLabel } from './captureLifecycleShared.js';
import { isEscapeKeydown } from './escapeKey.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} GamepadDOMHelpers */
/** @typedef {(globalThis: typeof globalThis) => void} CleanupFn */
/** @typedef {{ pressed: boolean, value: number }} ButtonSnapshot */
/** @typedef {{ buttons: ButtonSnapshot[], axes: number[] }} GamepadSnapshot */
/** @typedef {{ capturing: boolean, animationFrameId: number | null, snapshots: Record<number, GamepadSnapshot> }} CaptureState */
/** @typedef {{ button: HTMLButtonElement, dom: GamepadDOMHelpers, textInput: HTMLInputElement, autoSubmitCheckbox: HTMLInputElement | null, state: CaptureState }} HandlerOptions */
/** @typedef {import('./captureFormShared.js').CaptureFormContext} CaptureFormContext */
/** @typedef {CaptureFormContext & { form: HTMLElement }} GamepadCaptureFormBuilderContext */
const GAMEPAD_FORM_CLASS = browserCore.GAMEPAD_CAPTURE_FORM_SELECTOR.slice(1);
const CAPTURE_BUTTON_LABEL = 'Capture gamepad';
const RELEASE_BUTTON_LABEL = 'Release gamepad';
const AXIS_EPSILON = 0.01;
const GAMEPAD_CONNECTED_EVENT = 'gamepadconnected';
const GAMEPAD_DISCONNECTED_EVENT = 'gamepaddisconnected';

/**
 * Update the capture button label.
 * @param {GamepadDOMHelpers} dom - DOM helper bucket.
 * @param {HTMLButtonElement} button - Capture toggle button.
 * @param {boolean} isCapturing - Whether capture is currently active.
 * @returns {void}
 */
function updateCaptureButton(dom, button, isCapturing) {
  updateCaptureButtonLabel(
    dom,
    button,
    isCapturing,
    CAPTURE_BUTTON_LABEL,
    RELEASE_BUTTON_LABEL
  );
}

/**
 * Normalize an axis value before comparing or serializing it.
 * @param {number} value - Raw axis value from the browser Gamepad API.
 * @returns {number} Rounded axis value.
 */
function normalizeAxisValue(value) {
  return Number(value.toFixed(4));
}

/**
 * Convert a button object into a serializable snapshot.
 * @param {{ pressed: boolean, value: number }} button - Raw button state.
 * @returns {ButtonSnapshot} Snapshot of the button state.
 */
function snapshotButton(button) {
  return {
    pressed: button.pressed,
    value: button.value,
  };
}

/**
 * Capture the current button and axis state for a gamepad.
 * @param {Gamepad} gamepad - Browser gamepad object.
 * @returns {GamepadSnapshot} Snapshot used for diffing future polls.
 */
function snapshotGamepad(gamepad) {
  return {
    buttons: Array.from(gamepad.buttons, snapshotButton),
    axes: Array.from(gamepad.axes, normalizeAxisValue),
  };
}

/**
 * Build the common metadata shared by all emitted gamepad events.
 * @param {Gamepad} gamepad - Browser gamepad object.
 * @returns {Record<string, unknown>} Shared metadata fields.
 */
function buildGamepadMetadata(gamepad) {
  return {
    gamepadIndex: gamepad.index,
    gamepadId: gamepad.id,
    mapping: gamepad.mapping,
    connected: gamepad.connected,
    timestamp: gamepad.timestamp,
  };
}

/**
 * Build the standard button list used in connection payloads.
 * @param {Gamepad} gamepad - Browser gamepad object.
 * @returns {ButtonSnapshot[]} Serializable button details.
 */
function buildConnectionButtons(gamepad) {
  return Array.from(gamepad.buttons, snapshotButton);
}

/**
 * Resolve a gamepad from a browser event-like object.
 * @param {GamepadEvent | { gamepad?: Gamepad }} event - Connection or disconnection event.
 * @returns {Gamepad | null} Attached gamepad when present.
 */
function getEventGamepad(event) {
  if (event.gamepad) {
    return event.gamepad;
  }

  return null;
}

/**
 * Build a connection-style payload from a browser gamepad event.
 * @param {GamepadEvent | { gamepad?: Gamepad }} event - Connection or disconnection event.
 * @param {string} type - Payload type to emit.
 * @returns {Record<string, unknown> | null} Serialized payload data when a gamepad exists.
 */
function buildConnectionPayload(event, type) {
  const gamepad = getEventGamepad(event);
  if (gamepad === null) {
    return null;
  }

  return {
    type,
    ...buildGamepadMetadata(gamepad),
    axes: Array.from(gamepad.axes, normalizeAxisValue),
    buttons: buildConnectionButtons(gamepad),
  };
}

/**
 * Determine whether two axis values differ enough to emit an event.
 * @param {number} previous - Previously captured axis value.
 * @param {number} current - Newly observed axis value.
 * @returns {boolean} True when the axis moved far enough to matter.
 */
function didAxisChange(previous, current) {
  return Math.abs(previous - current) >= AXIS_EPSILON;
}

/**
 * Forward a payload only when one exists.
 * @param {{
 *   dom: GamepadDOMHelpers,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   payload: Record<string, unknown> | null,
 * }} options - DOM and payload dependencies.
 * @returns {void}
 */
function syncIfPayload(options) {
  const { dom, textInput, autoSubmitCheckbox, payload } = options;
  if (payload === null) {
    return;
  }

  emitToyPayload({
    dom,
    textInput,
    autoSubmitCheckbox,
    payload,
  });
}

/**
 * Send a payload to the toy synchronously.
 * @param {{
 *   dom: GamepadDOMHelpers,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   payload: Record<string, unknown> | null,
 * }} options - Payload delivery dependencies.
 * @returns {void}
 */
function emitToyPayload(options) {
  const { dom, textInput, autoSubmitCheckbox, payload } = options;
  captureLifecycleDeps.syncToyInput({
    dom,
    textInput,
    autoSubmitCheckbox,
    payload,
  });
}

/**
 * Reset polling snapshots when capture ends.
 * @param {CaptureState} state - Mutable handler state.
 * @returns {void}
 */
function resetSnapshots(state) {
  state.snapshots = {};
}

/**
 * Determine whether a frame id can be cancelled.
 * @param {number | null} value - Candidate frame id.
 * @returns {boolean} True when the value is a valid animation frame id.
 */
function isFrameId(value) {
  if (value === null) {
    return false;
  }

  return Number.isInteger(value);
}

/**
 * Cancel a queued poll frame when one exists.
 * @param {CaptureState} state - Mutable handler state.
 * @param {typeof globalThis.cancelAnimationFrame} cancelAnimationFrame - Browser frame canceler.
 * @returns {void}
 */
function cancelPoll(state, cancelAnimationFrame) {
  const frameId = state.animationFrameId;
  if (!isFrameId(frameId)) {
    return;
  }

  cancelAnimationFrame(/** @type {number} */ (frameId));
  state.animationFrameId = null;
}

/**
 * Determine whether the handler should schedule another poll frame.
 * @param {CaptureState} state - Mutable handler state.
 * @returns {boolean} True when polling should continue.
 */
function shouldQueuePoll(state) {
  if (!state.capturing) {
    return false;
  }

  return state.animationFrameId === null;
}

/**
 * Resolve the current `navigator.getGamepads` function when available.
 * @returns {(() => (Gamepad | null)[]) | null} Bound API getter when supported.
 */
function getGamepadsReader() {
  const navigatorObject = globalThis.navigator;
  if (!navigatorObject) {
    return null;
  }

  return bindGamepadsReader(navigatorObject);
}

/**
 * Bind the `navigator.getGamepads` function when the API exists.
 * @param {{ getGamepads?: () => (Gamepad | null)[] }} navigatorObject - Browser navigator object.
 * @returns {(() => (Gamepad | null)[]) | null} Bound API getter when supported.
 */
function bindGamepadsReader(navigatorObject) {
  const { getGamepads } = navigatorObject;
  if (typeof getGamepads !== 'function') {
    return null;
  }

  return getGamepads.bind(navigatorObject);
}

/**
 * Read all currently connected gamepads from the browser.
 * @returns {Gamepad[]} Connected gamepads only.
 */
function getConnectedGamepads() {
  const readGamepads = getGamepadsReader();
  if (readGamepads === null) {
    return [];
  }

  return toConnectedGamepads(readGamepads());
}

/**
 * Convert a raw gamepad list into connected gamepads only.
 * @param {(Gamepad | null)[] | null | undefined} gamepads - Raw browser gamepad list.
 * @returns {Gamepad[]} Connected gamepads only.
 */
function toConnectedGamepads(gamepads) {
  return Array.from(gamepads ?? []).filter(isPresentGamepad);
}

/**
 * @param {Gamepad | null} gamepad - Candidate gamepad entry.
 * @returns {gamepad is Gamepad} True when the entry is a connected gamepad object.
 */
function isPresentGamepad(gamepad) {
  return gamepad !== null;
}

/**
 * Schedule the next gamepad poll.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @returns {void}
 */
function queuePoll(options) {
  if (!shouldQueuePoll(options.state)) {
    return;
  }

  options.state.animationFrameId = requestPollFrame(options);
}

/**
 * Request the next poll frame when the browser API exists.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @returns {number | null} Requested animation frame id.
 */
function requestPollFrame(options) {
  const requestAnimationFrame = globalThis.requestAnimationFrame;
  if (typeof requestAnimationFrame !== 'function') {
    return null;
  }

  return requestAnimationFrame(() => runQueuedPoll(options));
}

/**
 * Run one queued poll and immediately schedule the next one when needed.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @returns {void}
 */
function runQueuedPoll(options) {
  options.state.animationFrameId = null;
  pollGamepads(options);
  queuePoll(options);
}

/**
 * Compare a previous button snapshot with a current button state.
 * @param {ButtonSnapshot | undefined} previousButton - Previously captured button state.
 * @param {{ pressed: boolean, value: number }} currentButton - Current button state.
 * @returns {boolean} True when the button changed.
 */
function didButtonChange(previousButton, currentButton) {
  if (previousButton === undefined) {
    return true;
  }

  return hasButtonValueChanged(previousButton, currentButton);
}

/**
 * Compare the concrete values of two button snapshots.
 * @param {ButtonSnapshot} previousButton - Previously captured button state.
 * @param {{ pressed: boolean, value: number }} currentButton - Current button state.
 * @returns {boolean} True when either field changed.
 */
function hasButtonValueChanged(previousButton, currentButton) {
  if (previousButton.pressed !== currentButton.pressed) {
    return true;
  }

  return previousButton.value !== currentButton.value;
}

/**
 * Find the first changed button index.
 * @param {Gamepad} gamepad - Browser gamepad object.
 * @param {GamepadSnapshot | undefined} previousSnapshot - Previous polled snapshot.
 * @returns {number} Index of the first changed button or `-1`.
 */
function findChangedButtonIndex(gamepad, previousSnapshot) {
  const previousButtons = getPreviousButtons(previousSnapshot);
  return gamepad.buttons.findIndex((button, index) =>
    didButtonChange(previousButtons[index], button)
  );
}

/**
 * Resolve the previous button snapshot array.
 * @param {GamepadSnapshot | undefined} previousSnapshot - Previous polled snapshot.
 * @returns {ButtonSnapshot[]} Previous button states.
 */
function getPreviousButtons(previousSnapshot) {
  if (previousSnapshot === undefined) {
    return [];
  }

  return previousSnapshot.buttons;
}

/**
 * Build a button payload when any button changed.
 * @param {Gamepad} gamepad - Browser gamepad object.
 * @param {GamepadSnapshot | undefined} previousSnapshot - Previous polled snapshot.
 * @returns {Record<string, unknown> | null} Button event payload when a button changed.
 */
function getButtonPayload(gamepad, previousSnapshot) {
  const changedIndex = findChangedButtonIndex(gamepad, previousSnapshot);
  if (changedIndex === -1) {
    return null;
  }

  const button = gamepad.buttons[changedIndex];
  return {
    type: 'button',
    ...buildGamepadMetadata(gamepad),
    buttonIndex: changedIndex,
    pressed: button.pressed,
    value: button.value,
  };
}

/**
 * Compare a previous axis value with a current axis value.
 * @param {number | undefined} previousAxis - Previously captured axis value.
 * @param {number} currentAxis - Current axis value.
 * @returns {boolean} True when the axis changed enough to emit an event.
 */
function didTrackedAxisChange(previousAxis, currentAxis) {
  if (previousAxis === undefined) {
    return didAxisChange(0, currentAxis);
  }

  return didAxisChange(previousAxis, currentAxis);
}

/**
 * Find the first changed axis index.
 * @param {Gamepad} gamepad - Browser gamepad object.
 * @param {GamepadSnapshot | undefined} previousSnapshot - Previous polled snapshot.
 * @returns {number} Index of the first changed axis or `-1`.
 */
function findChangedAxisIndex(gamepad, previousSnapshot) {
  const previousAxes = getPreviousAxes(previousSnapshot);
  return gamepad.axes.findIndex((axis, index) =>
    didTrackedAxisChange(previousAxes[index], normalizeAxisValue(axis))
  );
}

/**
 * Resolve the previous axis snapshot array.
 * @param {GamepadSnapshot | undefined} previousSnapshot - Previous polled snapshot.
 * @returns {number[]} Previous axis values.
 */
function getPreviousAxes(previousSnapshot) {
  if (previousSnapshot === undefined) {
    return [];
  }

  return previousSnapshot.axes;
}

/**
 * Build an axis payload when any axis changed.
 * @param {Gamepad} gamepad - Browser gamepad object.
 * @param {GamepadSnapshot | undefined} previousSnapshot - Previous polled snapshot.
 * @returns {Record<string, unknown> | null} Axis event payload when an axis changed.
 */
function getAxisPayload(gamepad, previousSnapshot) {
  const changedIndex = findChangedAxisIndex(gamepad, previousSnapshot);
  if (changedIndex === -1) {
    return null;
  }

  return {
    type: 'axis',
    ...buildGamepadMetadata(gamepad),
    axisIndex: changedIndex,
    value: normalizeAxisValue(gamepad.axes[changedIndex]),
  };
}

/**
 * Pick the highest-priority payload for a polled gamepad change.
 * @param {Gamepad} gamepad - Browser gamepad object.
 * @param {GamepadSnapshot | undefined} previousSnapshot - Previous polled snapshot.
 * @returns {Record<string, unknown> | null} Button payload first, axis payload second.
 */
function getPollPayload(gamepad, previousSnapshot) {
  const buttonPayload = getButtonPayload(gamepad, previousSnapshot);
  if (buttonPayload) {
    return buttonPayload;
  }

  return getAxisPayload(gamepad, previousSnapshot);
}

/**
 * Poll connected gamepads for button and axis changes.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @returns {void}
 */
function pollGamepads(options) {
  if (!options.state.capturing) {
    return;
  }

  getConnectedGamepads().forEach(gamepad => {
    const previousSnapshot = options.state.snapshots[gamepad.index];
    const payload = getPollPayload(gamepad, previousSnapshot);
    options.state.snapshots[gamepad.index] = snapshotGamepad(gamepad);
    syncIfPayload({
      dom: options.dom,
      textInput: options.textInput,
      autoSubmitCheckbox: options.autoSubmitCheckbox,
      payload,
    });
  });
}

/**
 * Release capture and clear snapshots.
 * @param {CaptureState} state - Mutable handler state.
 * @param {typeof globalThis.cancelAnimationFrame} cancelAnimationFrame - Browser frame canceler.
 * @returns {void}
 */
function stopCaptureSideEffects(state, cancelAnimationFrame) {
  resetSnapshots(state);
  cancelPoll(state, cancelAnimationFrame);
}

/**
 * Release capture, clear snapshots, and notify the toy.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @param {typeof globalThis.cancelAnimationFrame} cancelAnimationFrame - Browser frame canceler.
 * @returns {void}
 */
function releaseCapture(options, cancelAnimationFrame) {
  options.state.capturing = false;
  stopCaptureSideEffects(options.state, cancelAnimationFrame);
  captureLifecycleDeps.emitCaptureState(
    {
      dom: options.dom,
      button: options.button,
      textInput: options.textInput,
      autoSubmitCheckbox: options.autoSubmitCheckbox,
      updateButtonLabel: updateCaptureButton,
      emitPayload: ({ dom, textInput, autoSubmitCheckbox }, payload) =>
        captureLifecycleDeps.syncToyInput({
          dom,
          textInput,
          autoSubmitCheckbox,
          payload,
        }),
    },
    false
  );
}

/**
 * Determine whether an escape event should be ignored.
 * @param {CaptureState} state - Mutable handler state.
 * @param {KeyboardEvent} event - Browser keyboard event.
 * @returns {boolean} True when no release should happen.
 */
function shouldIgnoreEscapeEvent(state, event) {
  if (!state.capturing) {
    return true;
  }

  return !isEscapeKeydown(event);
}

/**
 * Prevent the browser default action when possible.
 * @param {{ preventDefault?: () => void }} event - Browser event.
 * @returns {void}
 */
function preventDefault(event) {
  const callPreventDefault = event.preventDefault;
  if (typeof callPreventDefault !== 'function') {
    return;
  }

  callPreventDefault.call(event);
}

/**
 * Determine whether connection handlers should emit events.
 * @param {CaptureState} state - Mutable handler state.
 * @returns {boolean} True when capture is active.
 */
function shouldHandleConnectionEvent(state) {
  return state.capturing;
}

/**
 * Store the latest snapshot for a connected gamepad.
 * @param {CaptureState} state - Mutable handler state.
 * @param {Gamepad} gamepad - Connected gamepad.
 * @returns {void}
 */
function storeSnapshot(state, gamepad) {
  state.snapshots[gamepad.index] = snapshotGamepad(gamepad);
}

/**
 * Delete any stored snapshot for a disconnected gamepad.
 * @param {CaptureState} state - Mutable handler state.
 * @param {Gamepad | null} gamepad - Disconnected gamepad when present.
 * @returns {void}
 */
function removeSnapshot(state, gamepad) {
  delete state.snapshots[gamepad.index];
}

/**
 * Build the browser `gamepadconnected` event handler.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @returns {(event: GamepadEvent | { gamepad?: Gamepad }) => void} Connection handler.
 */
function createConnectionHandler(options) {
  return event => {
    handleConnectionEvent(options, event);
  };
}

/**
 * Handle a browser `gamepadconnected` event.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @param {GamepadEvent | { gamepad?: Gamepad }} event - Connection event.
 * @returns {void}
 */
function handleConnectionEvent(options, event) {
  const payload = getHandledConnectionPayload(options.state, event);
  if (payload === null) {
    return;
  }

  const gamepad = /** @type {Gamepad} */ (getEventGamepad(event));
  storeSnapshot(options.state, gamepad);
  emitToyPayload({
    dom: options.dom,
    textInput: options.textInput,
    autoSubmitCheckbox: options.autoSubmitCheckbox,
    payload,
  });
  queuePoll(options);
}

/**
 * Build the browser `gamepaddisconnected` event handler.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @returns {(event: GamepadEvent | { gamepad?: Gamepad }) => void} Disconnection handler.
 */
function createDisconnectHandler(options) {
  return event => {
    handleDisconnectEvent(options, event);
  };
}

/**
 * Handle a browser `gamepaddisconnected` event.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @param {GamepadEvent | { gamepad?: Gamepad }} event - Disconnection event.
 * @returns {void}
 */
function handleDisconnectEvent(options, event) {
  const payload = getHandledDisconnectionPayload(options.state, event);
  if (payload === null) {
    return;
  }

  removeSnapshot(options.state, getEventGamepad(event));
  emitToyPayload({
    dom: options.dom,
    textInput: options.textInput,
    autoSubmitCheckbox: options.autoSubmitCheckbox,
    payload,
  });
}

/**
 * Build a handled connection payload only when capture is active.
 * @param {CaptureState} state - Mutable handler state.
 * @param {GamepadEvent | { gamepad?: Gamepad }} event - Connection event.
 * @returns {Record<string, unknown> | null} Payload ready for syncing.
 */
function getHandledConnectionPayload(state, event) {
  if (!shouldHandleConnectionEvent(state)) {
    return null;
  }

  return buildConnectionPayload(event, GAMEPAD_CONNECTED_EVENT);
}

/**
 * Build a handled disconnection payload only when capture is active.
 * @param {CaptureState} state - Mutable handler state.
 * @param {GamepadEvent | { gamepad?: Gamepad }} event - Disconnection event.
 * @returns {Record<string, unknown> | null} Payload ready for syncing.
 */
function getHandledDisconnectionPayload(state, event) {
  if (!shouldHandleConnectionEvent(state)) {
    return null;
  }

  return buildConnectionPayload(event, GAMEPAD_DISCONNECTED_EVENT);
}

/**
 * Build the stop-capture hook used by the capture lifecycle toggle.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @returns {(globalThisArg: typeof globalThis) => void} Stop handler for the lifecycle toggle.
 */
function createStopCaptureHandler(options) {
  return globalThisArg => stopCaptureSideEffects(
    options.state,
    globalThisArg.cancelAnimationFrame
  );
}

/**
 * Build the shared capture lifecycle toggle options for gamepad capture.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @returns {import('./captureLifecycleToggle.js').CaptureLifecycleToggleOptions} Toggle handler options.
 */
function createGamepadToggleOptions(options) {
  return {
    dom: options.dom,
    button: options.button,
    textInput: options.textInput,
    autoSubmitCheckbox: options.autoSubmitCheckbox,
    state: options.state,
    updateButtonLabel: updateCaptureButton,
    emitPayload: (input, payload) =>
      captureLifecycleDeps.syncToyInput({ ...input, payload }),
    onStart: () => queuePoll(options),
    onStop: createStopCaptureHandler(options),
  };
}

/**
 * Build the cleanup handler for gamepad capture disposal.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @returns {(globalThisArg: typeof globalThis) => void} Cleanup handler.
 */
function createGamepadCleanupHandler(options) {
  return globalThisArg => {
    const cancelAnimationFrame = globalThisArg.cancelAnimationFrame;
    if (typeof cancelAnimationFrame === 'function') {
      cancelPoll(options.state, cancelAnimationFrame);
    } else {
      options.state.animationFrameId = null;
    }
    resetSnapshots(options.state);
  };
}

/**
 * Build the escape-key handler for gamepad capture.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @returns {(event: KeyboardEvent) => void} Escape handler.
 */
function createGamepadEscapeHandler(options) {
  return event => {
    if (shouldIgnoreEscapeEvent(options.state, event)) {
      return;
    }

    preventDefault(event);
    const cancelAnimationFrame = globalThis.cancelAnimationFrame;
    if (typeof cancelAnimationFrame === 'function') {
      releaseCapture(options, cancelAnimationFrame);
      return;
    }

    releaseCapture(options, () => {});
  };
}

/**
 * Register all global listeners used by the handler.
 * @param {HandlerOptions} options - Shared handler dependencies.
 * @param {CleanupFn[]} cleanupFns - Cleanup callbacks collected for disposal.
 * @returns {void}
 */
function registerGamepadListeners(options, cleanupFns) {
  const handleToggle = captureLifecycleDeps.createCaptureLifecycleToggleHandler(
    createGamepadToggleOptions(options)
  );
  const handleEscape = createGamepadEscapeHandler(options);
  const handleConnect = createConnectionHandler(options);
  const handleDisconnect = createDisconnectHandler(options);

  options.dom.addEventListener(options.button, 'click', handleToggle);
  captureLifecycleDeps.registerGlobalListener({
    cleanupFns,
    type: 'keydown',
    handler: /** @type {EventListener} */ (handleEscape),
  });
  captureLifecycleDeps.registerGlobalListener({
    cleanupFns,
    type: GAMEPAD_CONNECTED_EVENT,
    handler: /** @type {EventListener} */ (handleConnect),
  });
  captureLifecycleDeps.registerGlobalListener({
    cleanupFns,
    type: GAMEPAD_DISCONNECTED_EVENT,
    handler: /** @type {EventListener} */ (handleDisconnect),
  });

  cleanupFns.push(createGamepadCleanupHandler(options));
  cleanupFns.push(() =>
    options.dom.removeEventListener(options.button, 'click', handleToggle)
  );
}

/**
 * Prepare the listener context after the shared form is ready.
 * @param {CaptureFormContext} options - Shared capture form context provided by the builder.
 * @returns {void}
 */
function initializeGamepadCaptureFormContext(options) {
  const { button, cleanupFns, container, dom, textInput } = options;
  registerGamepadListeners(
    {
      button,
      dom,
      textInput,
      autoSubmitCheckbox: captureLifecycleDeps.getAutoSubmitCheckbox(
        container,
        dom
      ),
      state: {
        capturing: false,
        animationFrameId: null,
        snapshots: {},
      },
    },
    cleanupFns
  );
}

/**
 * Bridge the shared capture context into the gamepad listener wiring.
 * @param {GamepadCaptureFormBuilderContext} options - Context provided by `captureLifecycleDeps.makeCaptureFormBuilder`.
 * @returns {void}
 */
function handleGamepadCaptureFormContext(options) {
  captureLifecycleDeps.withCaptureFormContext(
    options,
    updateCaptureButton,
    initializeGamepadCaptureFormContext
  );
}

/**
 * Build and insert the gamepad capture form UI.
 * @param {{ dom: GamepadDOMHelpers, container: HTMLElement, textInput: HTMLInputElement }} options - Form dependencies.
 * @returns {HTMLElement} Inserted form element.
 */
const buildGamepadCaptureForm = captureLifecycleDeps.makeCaptureFormBuilder(
  GAMEPAD_FORM_CLASS,
  handleGamepadCaptureFormContext
);

/**
 * Switch the toy input UI to the gamepad capture mode.
 * @param {GamepadDOMHelpers} dom - DOM helper bucket.
 * @param {HTMLElement} container - Toy input container element.
 * @param {HTMLInputElement} textInput - Hidden text input used for toy submission.
 * @returns {void}
 */
export function gamepadCaptureHandler(dom, container, textInput) {
  captureLifecycleDeps.prepareCaptureHandler({ dom, container, textInput });
  buildGamepadCaptureForm({ dom, container, textInput });
}
