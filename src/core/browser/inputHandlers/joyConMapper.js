import * as browserCore from '../browser-core.js';
import { createManagedFormShell } from './createDendriteHandler.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{ pressed: boolean, value: number }} ButtonSnapshot */
/** @typedef {{ buttons: ButtonSnapshot[], axes: number[] }} GamepadSnapshot */
/** @typedef {{ key: string, label: string, type: 'button' | 'axis', direction?: 'negative' | 'positive' }} MapperControl */
/** @typedef {{ mappings: Record<string, unknown>, skippedControls: string[] }} StoredMapperState */
/** @typedef {{ type: 'button', index: number, value: number } | { type: 'axis', axis: number, direction: 'negative' | 'positive', magnitude: number }} CaptureResult */
/** @typedef {{ dom: DOMHelpers, textInput: HTMLInputElement, autoSubmitCheckbox: HTMLInputElement | null, started: boolean, currentIndex: number, currentControl: MapperControl | null, previousSnapshot: GamepadSnapshot | null, stored: StoredMapperState, list: HTMLElement, prompt: HTMLElement, subprompt: HTMLElement, dot: HTMLElement, statusText: HTMLElement, metaIndex: HTMLElement, metaId: HTMLElement }} MapperState */
/** @typedef {{ className?: string, text?: string }} ElementOptions */

const MAPPER_STORAGE_KEY = 'JOYMAP1';
const PERMANENT_DATA_KEY = 'permanentData';
const DENDRITE_FORM_CLASS = browserCore.DENDRITE_FORM_SELECTOR.slice(1);
const AUTO_SUBMIT_CHECKBOX_SELECTOR = '.auto-submit-checkbox';
const AXIS_THRESHOLD = 0.55;
const AXIS_DELTA_THRESHOLD = 0.18;
const BUTTON_THRESHOLD = 0.65;
const EMPTY_MAPPER_STATE = { mappings: {}, skippedControls: [] };

const CONTROLS = /** @type {MapperControl[]} */ ([
  { key: 'l', label: 'L', type: 'button' },
  { key: 'zl', label: 'ZL', type: 'button' },
  { key: 'minus', label: 'Minus', type: 'button' },
  { key: 'capture', label: 'Capture', type: 'button' },
  { key: 'stick_press', label: 'Stick Press', type: 'button' },
  { key: 'dpad_up', label: 'D-Pad Up', type: 'button' },
  { key: 'dpad_down', label: 'D-Pad Down', type: 'button' },
  { key: 'dpad_left', label: 'D-Pad Left', type: 'button' },
  { key: 'dpad_right', label: 'D-Pad Right', type: 'button' },
  {
    key: 'stick_left',
    label: 'Stick Left',
    type: 'axis',
    direction: 'negative',
  },
  {
    key: 'stick_right',
    label: 'Stick Right',
    type: 'axis',
    direction: 'positive',
  },
  { key: 'stick_up', label: 'Stick Up', type: 'axis', direction: 'negative' },
  {
    key: 'stick_down',
    label: 'Stick Down',
    type: 'axis',
    direction: 'positive',
  },
]);

/**
 * Finds the article wrapper that owns the mapper UI.
 * @param {Element} container
 *   Mapper root container.
 * @returns {Element | null}
 *   Closest article entry, if present.
 */
function getClosestArticle(container) {
  const closest = container.closest;
  if (typeof closest !== 'function') {
    return null;
  }

  return closest.call(container, 'article.entry');
}

/**
 * Reads the article-level auto-submit checkbox used by the toy shell.
 * @param {Element} container
 *   Mapper root container.
 * @param {DOMHelpers} dom
 *   DOM helper facade for queries and writes.
 * @returns {HTMLInputElement | null}
 *   Auto-submit checkbox for the current article.
 */
function getAutoSubmitCheckbox(container, dom) {
  const article = getClosestArticle(container);
  if (!article) {
    return null;
  }

  return /** @type {HTMLInputElement | null} */ (
    dom.querySelector(article, AUTO_SUBMIT_CHECKBOX_SELECTOR)
  );
}

/**
 * @param {HTMLInputElement} checkbox
 *   Checkbox to notify after the checked state changes.
 * @returns {void}
 */
function dispatchChangeEvent(checkbox) {
  checkbox.dispatchEvent(new Event('change'));
}

/**
 * @param {HTMLInputElement | null} autoSubmitCheckbox
 *   Optional auto-submit checkbox associated with the mapper toy.
 * @returns {void}
 */
function enableAutoSubmit(autoSubmitCheckbox) {
  if (!autoSubmitCheckbox) {
    return;
  }

  autoSubmitCheckbox.checked = true;
  dispatchChangeEvent(autoSubmitCheckbox);
}

/**
 * @param {{ dom: DOMHelpers, textInput: HTMLInputElement, autoSubmitCheckbox: HTMLInputElement | null, payload: Record<string, unknown> }} input
 *   Dependencies and payload required to sync the hidden toy input field.
 * @returns {void}
 */
function syncToyInput({ dom, textInput, autoSubmitCheckbox, payload }) {
  const serialised = JSON.stringify(payload);
  dom.setValue(textInput, serialised);
  browserCore.setInputValue(textInput, serialised);
  enableAutoSubmit(autoSubmitCheckbox);
}

/**
 * @returns {Gamepad | null}
 *   First connected gamepad exposed by the browser, if any.
 */
function currentPad() {
  const getGamepads = navigator.getGamepads;
  if (typeof getGamepads !== 'function') {
    return null;
  }

  return Array.from(getGamepads.call(navigator)).find(Boolean) ?? null;
}

/**
 * @param {GamepadButton} button
 *   Raw browser gamepad button state.
 * @returns {ButtonSnapshot}
 *   Serializable pressed/value pair for later comparisons.
 */
function snapshotButton(button) {
  return {
    pressed: button.pressed,
    value: button.value,
  };
}

/**
 * @param {Gamepad | null | undefined} gamepad
 *   Live browser gamepad object to snapshot.
 * @returns {GamepadSnapshot | null}
 *   Serializable copy of button and axis values.
 */
function snapshotGamepad(gamepad) {
  if (!gamepad) {
    return null;
  }

  return {
    buttons: Array.from(gamepad.buttons, snapshotButton),
    axes: Array.from(gamepad.axes, value => Number(value.toFixed(4))),
  };
}

/**
 * @param {DOMHelpers} dom
 *   DOM helper facade for element construction.
 * @param {string} tag
 *   Tag name for the new element.
 * @param {ElementOptions} [options]
 *   Optional class and text content to apply.
 * @returns {HTMLElement}
 *   Newly created DOM element.
 */
function createElement(dom, tag, options = {}) {
  const { className = '', text } = options;
  const element = dom.createElement(tag);
  applyElementClassName(dom, element, className);
  applyElementText(dom, element, text);
  return element;
}

/**
 * @param {DOMHelpers} dom
 *   DOM helper facade for element construction.
 * @param {HTMLElement} element
 *   Element being configured.
 * @param {string} className
 *   Optional class name to assign.
 * @returns {void}
 */
function applyElementClassName(dom, element, className) {
  if (!className) {
    return;
  }

  dom.setClassName(element, className);
}

/**
 * @param {DOMHelpers} dom
 *   DOM helper facade for element construction.
 * @param {HTMLElement} element
 *   Element being configured.
 * @param {string | undefined} text
 *   Optional text content to assign.
 * @returns {void}
 */
function applyElementText(dom, element, text) {
  if (typeof text !== 'string') {
    return;
  }

  dom.setTextContent(element, text);
}

/**
 * @param {CaptureResult | null | undefined} mapping
 *   Stored capture metadata for one mapper control.
 * @returns {string}
 *   Human-readable label used in the mapper list.
 */
function describeCapture(mapping) {
  if (!mapping) {
    return 'optional';
  }

  if (mapping.type === 'button') {
    return `button ${mapping.index}`;
  }

  return describeAxisCapture(mapping);
}

/**
 * @param {{ axis: number, direction: 'negative' | 'positive' }} mapping
 *   Axis capture metadata for one mapper control.
 * @returns {string}
 *   Human-readable axis mapping label.
 */
function describeAxisCapture(mapping) {
  if (mapping.direction === 'negative') {
    return `axis ${mapping.axis} -`;
  }

  return `axis ${mapping.axis} +`;
}

/**
 * @returns {StoredMapperState}
 *   Persisted mappings and skipped controls from local storage.
 */
function readStoredMapperState() {
  try {
    const root = JSON.parse(
      globalThis.localStorage?.getItem(PERMANENT_DATA_KEY) ?? '{}'
    );
    const stored = root?.[MAPPER_STORAGE_KEY];
    if (!stored || typeof stored !== 'object') {
      return EMPTY_MAPPER_STATE;
    }
    return {
      mappings: normalizeStoredMappings(stored.mappings),
      skippedControls: normalizeSkippedControls(stored.skippedControls),
    };
  } catch {
    return EMPTY_MAPPER_STATE;
  }
}

/**
 * @param {unknown} mappings
 *   Candidate stored mappings payload.
 * @returns {Record<string, unknown>}
 *   Normalized stored mappings object.
 */
function normalizeStoredMappings(mappings) {
  if (!mappings || typeof mappings !== 'object') {
    return {};
  }

  return /** @type {Record<string, unknown>} */ (mappings);
}

/**
 * @param {unknown} skippedControls
 *   Candidate stored skipped-controls payload.
 * @returns {string[]}
 *   Normalized skipped-controls list.
 */
function normalizeSkippedControls(skippedControls) {
  if (!Array.isArray(skippedControls)) {
    return [];
  }

  return skippedControls;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {number}
 *   Index of the first unmapped, unskipped control or `-1`.
 */
function firstPendingIndex(state) {
  return CONTROLS.findIndex(control => {
    return (
      !state.stored.mappings[control.key] &&
      !state.stored.skippedControls.includes(control.key)
    );
  });
}

/**
 * @param {GamepadSnapshot | null} previous
 *   Previous gamepad snapshot.
 * @param {GamepadSnapshot | null} current
 *   Current gamepad snapshot.
 * @returns {CaptureResult | null}
 *   Strongest newly pressed button capture, if detected.
 */
function detectButtonCapture(previous, current) {
  if (!previous || !current) {
    return null;
  }

  let best = null;
  current.buttons.forEach((button, index) => {
    const oldButton = previous.buttons[index] ?? { pressed: false, value: 0 };
    const becamePressed = button.pressed && !oldButton.pressed;
    const crossedThreshold =
      button.value >= BUTTON_THRESHOLD && oldButton.value < BUTTON_THRESHOLD;
    if (!becamePressed && !crossedThreshold) {
      return;
    }

    if (!best || button.value > best.value) {
      best = { type: 'button', index, value: button.value };
    }
  });

  return best;
}

/**
 * @param {number} value
 *   Current axis value.
 * @param {'negative' | 'positive'} expectedDirection
 *   Direction the active control expects.
 * @returns {boolean}
 *   Whether the axis currently points far enough in the expected direction.
 */
function axisMatchesDirection(value, expectedDirection) {
  if (expectedDirection === 'positive') {
    return value >= AXIS_THRESHOLD;
  }

  return value <= -AXIS_THRESHOLD;
}

/**
 * @param {number} delta
 *   Difference between the current and previous axis value.
 * @param {'negative' | 'positive'} expectedDirection
 *   Direction the active control expects.
 * @returns {number}
 *   Direction-aware delta magnitude.
 */
function directionalDelta(delta, expectedDirection) {
  if (expectedDirection === 'positive') {
    return delta;
  }

  return -delta;
}

/**
 * @param {GamepadSnapshot | null} previous
 *   Previous gamepad snapshot.
 * @param {GamepadSnapshot | null} current
 *   Current gamepad snapshot.
 * @param {'negative' | 'positive'} expectedDirection
 *   Direction the active control expects.
 * @returns {CaptureResult | null}
 *   Strongest axis movement capture, if detected.
 */
function detectAxisCapture(previous, current, expectedDirection) {
  if (!previous || !current) {
    return null;
  }

  let best = null;
  current.axes.forEach((value, axis) => {
    const oldValue = previous.axes[axis] ?? 0;
    const delta = value - oldValue;
    const directionMatches = axisMatchesDirection(value, expectedDirection);
    const nextDirectionalDelta = directionalDelta(delta, expectedDirection);
    if (!directionMatches || nextDirectionalDelta <= AXIS_DELTA_THRESHOLD) {
      return;
    }

    const magnitude = Math.abs(value);
    if (!best || magnitude > best.magnitude) {
      best = { type: 'axis', axis, direction: expectedDirection, magnitude };
    }
  });

  return best;
}

/**
 * @param {string} action
 *   Mapper action name written into the hidden toy input.
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @param {Record<string, unknown>} [extra]
 *   Additional payload properties for the action.
 * @returns {Record<string, unknown>}
 *   Serialized action payload for the toy runtime.
 */
function buildPayload(action, state, extra = {}) {
  const payload = { action, ...extra };
  const currentControlKey = getCurrentControlKey(state);
  if (currentControlKey) {
    payload.currentControlKey = currentControlKey;
  }

  return payload;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {string | null}
 *   Active control key, if present.
 */
function getCurrentControlKey(state) {
  return state.currentControl?.key ?? null;
}

/**
 * @param {MapperControl} control
 *   Control currently being rendered.
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @param {number} index
 *   Control index within the ordered list.
 * @returns {string}
 *   Row value label for mapped, skipped, active, or optional states.
 */
function getRowValueText(control, state, index) {
  const isDone = Boolean(state.stored.mappings[control.key]);
  if (isDone) {
    return describeCapture(
      /** @type {CaptureResult} */ (state.stored.mappings[control.key])
    );
  }

  const isSkipped = state.stored.skippedControls.includes(control.key);
  if (isSkipped) {
    return 'skipped';
  }

  const isActive = state.started && state.currentIndex === index;
  if (isActive) {
    return 'listening...';
  }

  return 'optional';
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {void}
 */
function renderMapperList(state) {
  domRemoveAllChildren(state.dom, state.list);

  CONTROLS.forEach((control, index) => {
    const row = createElement(state.dom, 'div', {
      className: 'joycon-mapper-row',
    });
    const isDone = Boolean(state.stored.mappings[control.key]);
    const isSkipped = state.stored.skippedControls.includes(control.key);
    const isActive =
      state.started && state.currentIndex === index && !isDone && !isSkipped;

    if (isDone) {
      row.classList.add('done');
    }
    if (isSkipped) {
      row.classList.add('skipped');
    }
    if (isActive) {
      row.classList.add('active');
    }

    const name = createElement(state.dom, 'div', {
      className: 'joycon-mapper-name',
      text: control.label,
    });
    const value = createElement(state.dom, 'div', {
      className: 'joycon-mapper-value',
      text: getRowValueText(control, state, index),
    });
    state.dom.appendChild(row, name);
    state.dom.appendChild(row, value);
    state.dom.appendChild(state.list, row);
  });
}

/**
 * @param {DOMHelpers} dom
 *   DOM helper facade for element mutation.
 * @param {Element} node
 *   Parent node whose children should be removed.
 * @returns {void}
 */
function domRemoveAllChildren(dom, node) {
  dom.removeAllChildren(node);
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {void}
 */
function renderPrompt(state) {
  const control = state.currentControl;
  const complete = state.currentIndex >= CONTROLS.length;
  const gamepad = currentPad();

  if (!gamepad) {
    state.dom.setTextContent(state.prompt, 'Connect a gamepad to begin');
    state.dom.setTextContent(
      state.subprompt,
      'The mapper will resume as soon as the left Joy-Con appears.'
    );
    return;
  }

  if (!state.started) {
    state.dom.setTextContent(state.prompt, 'Ready to map the left Joy-Con');
    state.dom.setTextContent(
      state.subprompt,
      'Press Start Mapping. Every control is optional and can be skipped.'
    );
    return;
  }

  if (complete || !control) {
    state.dom.setTextContent(state.prompt, 'Mapping complete');
    state.dom.setTextContent(
      state.subprompt,
      'The saved mapping is persisted locally and shown in the output panel.'
    );
    return;
  }

  state.dom.setTextContent(state.prompt, `Press ${control.label}`);
  state.dom.setTextContent(state.subprompt, getActivePromptText(control));
}

/**
 * @param {MapperControl} control
 *   Active mapper control.
 * @returns {string}
 *   Prompt text for the current control type.
 */
function getActivePromptText(control) {
  if (control.type === 'button') {
    return 'The next newly pressed gamepad button will be saved for this control, or click Skip Current.';
  }

  return 'Move the stick in the highlighted direction until the mapper captures it, or click Skip Current.';
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {void}
 */
function renderMeta(state) {
  const gamepad = currentPad();
  state.dot.classList.toggle('connected', Boolean(gamepad));
  state.dom.setTextContent(state.statusText, getGamepadStatusText(gamepad));
  state.dom.setTextContent(state.metaIndex, getGamepadIndexText(gamepad));
  state.dom.setTextContent(state.metaId, getGamepadIdText(gamepad));
}

/**
 * @param {Gamepad | null} gamepad
 *   Connected gamepad, if present.
 * @returns {string}
 *   UI status text for gamepad presence.
 */
function getGamepadStatusText(gamepad) {
  if (gamepad) {
    return 'Gamepad detected';
  }

  return 'Waiting for gamepad';
}

/**
 * @param {Gamepad | null} gamepad
 *   Connected gamepad, if present.
 * @returns {string}
 *   UI metadata line for gamepad index.
 */
function getGamepadIndexText(gamepad) {
  if (!gamepad) {
    return 'Index: -';
  }

  return `Index: ${String(gamepad.index)}`;
}

/**
 * @param {Gamepad | null} gamepad
 *   Connected gamepad, if present.
 * @returns {string}
 *   UI metadata line for gamepad id.
 */
function getGamepadIdText(gamepad) {
  if (!gamepad) {
    return 'ID: -';
  }

  return `ID: ${gamepad.id}`;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {void}
 */
function refreshStoredState(state) {
  state.stored = readStoredMapperState();
  if (!state.started) {
    state.currentIndex = normalizePendingIndex(firstPendingIndex(state));
  }
  state.currentControl = CONTROLS[state.currentIndex] ?? null;
}

/**
 * @param {number} pendingIndex
 *   Candidate pending control index.
 * @returns {number}
 *   Normalized pending index or completion marker.
 */
function normalizePendingIndex(pendingIndex) {
  if (pendingIndex === -1) {
    return CONTROLS.length;
  }

  return pendingIndex;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {void}
 */
function render(state) {
  refreshStoredState(state);
  renderMeta(state);
  renderPrompt(state);
  renderMapperList(state);
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {void}
 */
function advanceToNextControl(state) {
  const nextIndex = CONTROLS.findIndex((control, index) => {
    return (
      index > state.currentIndex &&
      !state.stored.mappings[control.key] &&
      !state.stored.skippedControls.includes(control.key)
    );
  });

  state.currentIndex = normalizePendingIndex(nextIndex);
  state.currentControl = CONTROLS[state.currentIndex] ?? null;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @param {CaptureResult} capture
 *   Captured button or axis mapping for the active control.
 * @returns {void}
 */
function captureCurrentControl(state, capture) {
  if (!state.currentControl) {
    return;
  }

  syncToyInput({
    dom: state.dom,
    textInput: state.textInput,
    autoSubmitCheckbox: state.autoSubmitCheckbox,
    payload: buildPayload('capture', state, { capture }),
  });
  advanceToNextControl(state);
  render(state);
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {void}
 */
function maybeCapture(state) {
  if (!state.started || !state.currentControl) {
    return;
  }

  const gamepad = currentPad();
  const snapshot = snapshotGamepad(gamepad);
  let capture = null;

  if (state.currentControl.type === 'button') {
    capture = detectButtonCapture(state.previousSnapshot, snapshot);
  } else {
    capture = detectAxisCapture(
      state.previousSnapshot,
      snapshot,
      /** @type {'negative' | 'positive'} */ (state.currentControl.direction)
    );
  }

  if (capture) {
    captureCurrentControl(state, capture);
  }

  state.previousSnapshot = snapshot;
}

/**
 * @param {DOMHelpers} dom
 *   DOM helper facade for listener registration.
 * @param {HTMLElement} element
 *   Click target element.
 * @param {(event: Event) => void} handler
 *   Click handler to register.
 * @param {Array<() => void>} disposers
 *   Cleanup callbacks collected for the form lifecycle.
 * @returns {void}
 */
function registerClick(dom, element, handler, disposers) {
  dom.addEventListener(element, 'click', handler);
  disposers.push(() => dom.removeEventListener(element, 'click', handler));
}

/**
 * @param {DOMHelpers} dom
 *   DOM helper facade for style injection.
 * @param {HTMLElement} form
 *   Form shell that owns the mapper UI.
 * @returns {void}
 */
function injectStyles(dom, form) {
  const style = createElement(dom, 'style', {
    text: `
    .${DENDRITE_FORM_CLASS}.joycon-mapper-form {
      display: grid;
      gap: 0.75em;
      width: 100%;
      margin: 0.25em 0 0;
    }
    .joycon-mapper-hero {
      display: grid;
      gap: 0.5em;
      color: inherit;
    }
    .joycon-mapper-status {
      display: flex;
      align-items: center;
      gap: 0.5em;
      color: #33ccff;
      font-weight: 700;
      text-transform: lowercase;
    }
    .joycon-mapper-dot {
      width: 0.65em;
      height: 0.65em;
      border-radius: 999px;
      background: #ff00ff;
      flex: 0 0 auto;
    }
    .joycon-mapper-dot.connected {
      background: #00ff00;
    }
    .joycon-mapper-prompt {
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .joycon-mapper-subprompt {
      color: #cccccc;
      line-height: 1.2;
    }
    .joycon-mapper-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5em;
    }
    .joycon-mapper-actions button {
      border: 1px solid #33ccff;
      border-radius: 0;
      padding: 0.3em 0.6em;
      background: #1a1a1a;
      color: #00ffff;
      cursor: pointer;
      font: inherit;
      line-height: 1;
    }
    .joycon-mapper-actions .primary {
      background: #00ffff;
      color: #121212;
      font-weight: 700;
    }
    .joycon-mapper-meta {
      display: grid;
      gap: 0.2em;
      color: #33ccff;
      font-size: 0.95em;
    }
    .joycon-mapper-list {
      display: grid;
      border-top: 1px solid #333333;
      border-bottom: 1px solid #333333;
    }
    .joycon-mapper-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1em;
      border-top: 1px solid #222222;
      align-items: baseline;
    }
    .joycon-mapper-row:first-child {
      border-top: 0;
    }
    .joycon-mapper-row.active {
      background: rgba(0, 255, 255, 0.08);
      color: #ffffff;
    }
    .joycon-mapper-row.done .joycon-mapper-value {
      color: #00ff00;
    }
    .joycon-mapper-row.skipped .joycon-mapper-value {
      color: #999999;
    }
    .joycon-mapper-name {
      font-weight: 700;
      color: inherit;
    }
    .joycon-mapper-value {
      color: #cccccc;
      font-family: inherit;
      text-transform: lowercase;
    }
  `,
  });
  dom.appendChild(form, style);
}

/**
 * @param {DOMHelpers} dom
 *   DOM helper facade for UI creation and updates.
 * @param {Element} container
 *   Host element for the mapper control.
 * @param {HTMLInputElement} textInput
 *   Hidden toy input synchronized with mapper actions.
 * @returns {void}
 */
export function joyConMapperHandler(dom, container, textInput) {
  browserCore.hideAndDisable(textInput, dom);
  const disposers = [];
  const form = createManagedFormShell({ dom, container, textInput, disposers });
  form.classList.add('joycon-mapper-form');
  injectStyles(dom, form);

  const hero = createElement(dom, 'div', { className: 'joycon-mapper-hero' });
  const status = createElement(dom, 'div', {
    className: 'joycon-mapper-status',
  });
  const dot = createElement(dom, 'span', { className: 'joycon-mapper-dot' });
  const statusText = createElement(dom, 'span', {
    text: 'Waiting for gamepad',
  });
  dom.appendChild(status, dot);
  dom.appendChild(status, statusText);

  const prompt = createElement(dom, 'div', {
    className: 'joycon-mapper-prompt',
    text: 'Connect a gamepad to begin',
  });
  const subprompt = createElement(dom, 'div', {
    className: 'joycon-mapper-subprompt',
    text: 'The mapper will resume as soon as the left Joy-Con appears.',
  });
  const actions = createElement(dom, 'div', {
    className: 'joycon-mapper-actions',
  });
  const startButton = /** @type {HTMLButtonElement} */ (
    createElement(dom, 'button', {
      className: 'primary',
      text: 'Start Mapping',
    })
  );
  const skipButton = /** @type {HTMLButtonElement} */ (
    createElement(dom, 'button', { text: 'Skip Current' })
  );
  const resetButton = /** @type {HTMLButtonElement} */ (
    createElement(dom, 'button', { text: 'Reset Mapping' })
  );
  [startButton, skipButton, resetButton].forEach(button =>
    dom.appendChild(actions, button)
  );

  const meta = createElement(dom, 'div', { className: 'joycon-mapper-meta' });
  const metaIndex = createElement(dom, 'div', { text: 'Index: -' });
  const metaId = createElement(dom, 'div', { text: 'ID: -' });
  dom.appendChild(meta, metaIndex);
  dom.appendChild(meta, metaId);

  const list = createElement(dom, 'div', { className: 'joycon-mapper-list' });
  [status, prompt, subprompt, actions, meta, list].forEach(element =>
    dom.appendChild(hero, element)
  );
  dom.appendChild(form, hero);

  const state = /** @type {MapperState} */ ({
    dom,
    textInput,
    autoSubmitCheckbox: getAutoSubmitCheckbox(container, dom),
    started: false,
    currentIndex: 0,
    currentControl: /** @type {MapperControl | null} */ (CONTROLS[0] ?? null),
    previousSnapshot: snapshotGamepad(currentPad()),
    stored: readStoredMapperState(),
    list,
    prompt,
    subprompt,
    dot,
    statusText,
    metaIndex,
    metaId,
  });

  registerClick(
    dom,
    startButton,
    () => {
      state.started = true;
      const pending = firstPendingIndex(state);
      state.currentIndex = pending === -1 ? CONTROLS.length : pending;
      state.currentControl = CONTROLS[state.currentIndex] ?? null;
      state.previousSnapshot = snapshotGamepad(currentPad());
      syncToyInput({
        dom,
        textInput,
        autoSubmitCheckbox: state.autoSubmitCheckbox,
        payload: buildPayload('initialize', state),
      });
      render(state);
    },
    disposers
  );

  registerClick(
    dom,
    skipButton,
    () => {
      if (!state.started) {
        state.started = true;
      }
      const skippedControl = state.currentControl;
      syncToyInput({
        dom,
        textInput,
        autoSubmitCheckbox: state.autoSubmitCheckbox,
        payload: buildPayload('skip', state, {
          skippedControlKey: skippedControl?.key ?? null,
        }),
      });
      advanceToNextControl(state);
      render(state);
    },
    disposers
  );

  registerClick(
    dom,
    resetButton,
    () => {
      state.started = false;
      state.currentIndex = 0;
      state.currentControl = CONTROLS[0] ?? null;
      state.previousSnapshot = snapshotGamepad(currentPad());
      syncToyInput({
        dom,
        textInput,
        autoSubmitCheckbox: state.autoSubmitCheckbox,
        payload: buildPayload('reset', state),
      });
      render(state);
    },
    disposers
  );

  const intervalId = globalThis.setInterval(() => maybeCapture(state), 50);
  disposers.push(() => globalThis.clearInterval(intervalId));
  form._dispose = () => disposers.forEach(dispose => dispose());

  render(state);

  globalThis.requestAnimationFrame?.(() => {
    syncToyInput({
      dom,
      textInput,
      autoSubmitCheckbox: state.autoSubmitCheckbox,
      payload: buildPayload('initialize', state),
    });
  });
}
