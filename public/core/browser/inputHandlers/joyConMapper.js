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

const EMPTY_ELEMENT_OPTIONS = Object.freeze({ className: '' });

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
  return readConnectedGamepads().find(Boolean) ?? null;
}

/**
 * @returns {Gamepad[]}
 *   Connected gamepads exposed by the browser, or an empty array when unsupported.
 */
function readConnectedGamepads() {
  const getGamepads = navigator.getGamepads;
  if (typeof getGamepads !== 'function') {
    return [];
  }

  return Array.from(getGamepads.call(navigator));
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
  const element = dom.createElement(tag);
  applyCreatedElementOptions(dom, element, options);
  return element;
}

/**
 * @param {DOMHelpers} dom
 *   DOM helper facade for element construction.
 * @param {HTMLElement} element
 *   Element being configured.
 * @param {ElementOptions | undefined} options
 *   Optional class and text content to apply.
 * @returns {void}
 *   Applies normalized options to the new element.
 */
function applyCreatedElementOptions(dom, element, options) {
  const normalizedOptions = options ?? EMPTY_ELEMENT_OPTIONS;
  applyElementClassName(dom, element, normalizedOptions.className);
  applyElementText(dom, element, normalizedOptions.text);
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

  return describeMappedCapture(mapping);
}

/**
 * @param {CaptureResult} mapping
 *   Stored capture metadata for one mapper control.
 * @returns {string}
 *   Human-readable label for button or axis mappings.
 */
function describeMappedCapture(mapping) {
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
    return normalizeStoredMapperState(
      readMapperStorageEntry(readStoredMapperRoot())
    );
  } catch {
    return EMPTY_MAPPER_STATE;
  }
}

/**
 * @returns {unknown}
 *   Parsed local-storage root payload for mapper state.
 */
function readStoredMapperRoot() {
  return parseStoredMapperRoot(
    globalThis.localStorage?.getItem(PERMANENT_DATA_KEY)
  );
}

/**
 * @param {string | null | undefined} serializedRoot
 *   Serialized local-storage root payload.
 * @returns {unknown}
 *   Parsed local-storage root payload for mapper state.
 */
function parseStoredMapperRoot(serializedRoot) {
  return JSON.parse(serializedRoot ?? '{}');
}

/**
 * @param {unknown} root
 *   Parsed local-storage root payload.
 * @returns {unknown}
 *   Mapper-specific storage payload, if present.
 */
function readMapperStorageEntry(root) {
  return root?.[MAPPER_STORAGE_KEY];
}

/**
 * @param {unknown} stored
 *   Candidate mapper-specific storage payload.
 * @returns {StoredMapperState}
 *   Normalized mapper storage state.
 */
function normalizeStoredMapperState(stored) {
  if (!isObjectLike(stored)) {
    return EMPTY_MAPPER_STATE;
  }

  return {
    mappings: normalizeStoredMappings(stored.mappings),
    skippedControls: normalizeSkippedControls(stored.skippedControls),
  };
}

/**
 * @param {unknown} value
 *   Candidate value that might be object-like.
 * @returns {value is object}
 *   Whether the value is an object.
 */
function isObjectLike(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * @param {unknown} mappings
 *   Candidate stored mappings payload.
 * @returns {Record<string, unknown>}
 *   Normalized stored mappings object.
 */
function normalizeStoredMappings(mappings) {
  if (!isObjectLike(mappings)) {
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
 * @param {MapperControl} control
 *   Candidate mapper control being evaluated.
 * @returns {boolean}
 *   Whether the control is still pending mapping.
 */
function isControlPending(state, control) {
  return (
    !state.stored.mappings[control.key] &&
    !state.stored.skippedControls.includes(control.key)
  );
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {number}
 *   Index of the first unmapped, unskipped control or `-1`.
 */
function firstPendingIndex(state) {
  return CONTROLS.findIndex(control => isControlPending(state, control));
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
  if (isMissingButtonSnapshots(previous, current)) {
    return null;
  }

  return current.buttons.reduce(makeButtonCaptureReducer(previous), null);
}

/**
 * @param {GamepadSnapshot | null} previous
 *   Previous gamepad snapshot.
 * @param {GamepadSnapshot | null} current
 *   Current gamepad snapshot.
 * @returns {boolean}
 *   Whether button capture cannot run because one snapshot is missing.
 */
function isMissingButtonSnapshots(previous, current) {
  return !previous || !current;
}

/**
 * @param {GamepadSnapshot} previous
 *   Previous gamepad snapshot.
 * @returns {(best: CaptureResult | null, button: ButtonSnapshot, index: number) => CaptureResult | null}
 *   Reducer for selecting the strongest button capture across all buttons.
 */
function makeButtonCaptureReducer(previous) {
  return (best, button, index) =>
    selectStrongerButtonCapture(
      best,
      getButtonCaptureCandidate(
        button,
        previous.buttons[index] ?? { pressed: false, value: 0 },
        index
      )
    );
}

/**
 * @param {ButtonSnapshot} button
 *   Current button snapshot.
 * @param {ButtonSnapshot} oldButton
 *   Previous button snapshot.
 * @returns {boolean}
 *   Whether the button became newly pressed.
 */
function becamePressed(button, oldButton) {
  return button.pressed && !oldButton.pressed;
}

/**
 * @param {ButtonSnapshot} button
 *   Current button snapshot.
 * @param {ButtonSnapshot} oldButton
 *   Previous button snapshot.
 * @returns {boolean}
 *   Whether the button crossed the configured capture threshold.
 */
function crossedButtonThreshold(button, oldButton) {
  return button.value >= BUTTON_THRESHOLD && oldButton.value < BUTTON_THRESHOLD;
}

/**
 * @param {ButtonSnapshot} button
 *   Current button snapshot.
 * @param {ButtonSnapshot} oldButton
 *   Previous button snapshot.
 * @returns {boolean}
 *   Whether the button should be considered a capture candidate.
 */
function hasButtonCaptureTransition(button, oldButton) {
  return (
    becamePressed(button, oldButton) ||
    crossedButtonThreshold(button, oldButton)
  );
}

/**
 * @param {ButtonSnapshot} button
 *   Current button snapshot.
 * @param {ButtonSnapshot} oldButton
 *   Previous button snapshot.
 * @param {number} index
 *   Current button index.
 * @returns {CaptureResult | null}
 *   Capture candidate for this button, if it qualifies.
 */
function getButtonCaptureCandidate(button, oldButton, index) {
  if (!hasButtonCaptureTransition(button, oldButton)) {
    return null;
  }

  return { type: 'button', index, value: button.value };
}

/**
 * @param {CaptureResult | null} best
 *   Current strongest capture.
 * @param {CaptureResult | null} candidate
 *   Candidate capture to compare.
 * @returns {CaptureResult | null}
 *   Stronger button capture.
 */
function selectStrongerButtonCapture(best, candidate) {
  if (!candidate) {
    return best;
  }

  return selectCapturedButton(best, candidate);
}

/**
 * @param {CaptureResult | null} best
 *   Current strongest capture.
 * @param {CaptureResult} candidate
 *   Candidate capture to compare.
 * @returns {CaptureResult}
 *   Stronger candidate capture.
 */
function selectCapturedButton(best, candidate) {
  if (!best) {
    return candidate;
  }

  return pickStrongerButtonCapture(candidate, best);
}

/**
 * @param {CaptureResult} candidate
 *   Candidate capture to compare.
 * @param {CaptureResult} best
 *   Current strongest capture.
 * @returns {boolean}
 *   Whether the candidate should replace the current best capture.
 */
function isStrongerButtonCapture(candidate, best) {
  return candidate.value > best.value;
}

/**
 * @param {CaptureResult} candidate
 *   Candidate capture to compare.
 * @param {CaptureResult} best
 *   Current strongest capture.
 * @returns {CaptureResult}
 *   Stronger of the two button captures.
 */
function pickStrongerButtonCapture(candidate, best) {
  if (isStrongerButtonCapture(candidate, best)) {
    return candidate;
  }

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
 * @returns {boolean}
 *   Whether both snapshots are available for axis comparison.
 */
function hasAxisSnapshots(previous, current) {
  return previous !== null && current !== null;
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
  if (!hasAxisSnapshots(previous, current)) {
    return null;
  }

  return findStrongestAxisCapture(current.axes, previous, expectedDirection);
}

/**
 * @param {number} oldValue
 *   Previous axis value.
 * @param {number} value
 *   Current axis value.
 * @param {'negative' | 'positive'} expectedDirection
 *   Direction the active control expects.
 * @returns {boolean}
 *   Whether the axis changed enough in the expected direction.
 */
function hasAxisCaptureDelta(oldValue, value, expectedDirection) {
  const delta = value - oldValue;
  return directionalDelta(delta, expectedDirection) > AXIS_DELTA_THRESHOLD;
}

/**
 * @param {number} value
 *   Current axis value.
 * @param {{ oldValue: number, expectedDirection: 'negative' | 'positive' }} context
 *   Previous axis value and direction context.
 * @returns {boolean}
 *   True when the axis still matches the expected direction and moved enough.
 */
function isAxisCaptureCandidate(value, context) {
  const { oldValue, expectedDirection } = context;
  return (
    axisMatchesDirection(value, expectedDirection) &&
    hasAxisCaptureDelta(oldValue, value, expectedDirection)
  );
}

/**
 * @param {number} value
 *   Current axis value.
 * @param {number} axis
 *   Current axis index.
 * @param {{ oldValue: number, expectedDirection: 'negative' | 'positive' }} context
 *   Previous axis value and direction context.
 * @returns {CaptureResult | null}
 *   Capture candidate for this axis, if it qualifies.
 */
function getAxisCaptureCandidate(value, axis, context) {
  if (!isAxisCaptureCandidate(value, context)) {
    return null;
  }

  const { expectedDirection } = context;
  return {
    type: 'axis',
    axis,
    direction: expectedDirection,
    magnitude: Math.abs(value),
  };
}

/**
 * @param {number[]} axes
 *   Current axis values.
 * @param {GamepadSnapshot} previous
 *   Previous gamepad snapshot.
 * @param {'negative' | 'positive'} expectedDirection
 *   Direction the active control expects.
 * @returns {CaptureResult | null}
 *   Strongest qualifying axis capture, if any.
 */
function findStrongestAxisCapture(axes, previous, expectedDirection) {
  return axes.reduce((best, value, axis) => {
    const oldValue = previous.axes[axis] ?? 0;
    const candidate = getAxisCaptureCandidate(value, axis, {
      oldValue,
      expectedDirection,
    });
    return mergeAxisCaptureCandidate(best, candidate);
  }, null);
}

/**
 * @param {CaptureResult | null} best
 *   Current strongest capture.
 * @param {CaptureResult | null} candidate
 *   Candidate capture to compare.
 * @returns {CaptureResult | null}
 *   Stronger capture after considering the candidate.
 */
function mergeAxisCaptureCandidate(best, candidate) {
  if (!candidate) {
    return best;
  }

  return selectStrongerAxisCapture(best, candidate);
}

/**
 * @param {CaptureResult | null} best
 *   Current strongest capture.
 * @param {CaptureResult} candidate
 *   Candidate capture to compare.
 * @returns {CaptureResult}
 *   Stronger axis capture.
 */
function selectStrongerAxisCapture(best, candidate) {
  return [best, candidate]
    .filter(Boolean)
    .sort((left, right) => right.magnitude - left.magnitude)[0];
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
  return attachCurrentControlKey({ action, ...extra }, state);
}

/**
 * @param {Record<string, unknown>} payload
 *   Partially built payload to mutate.
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {Record<string, unknown>}
 *   Payload augmented with the active control key, if any.
 */
function attachCurrentControlKey(payload, state) {
  const controlKey = getCurrentControlKey(state);
  if (!controlKey) {
    return payload;
  }

  payload.currentControlKey = controlKey;
  return payload;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {string | null}
 *   Active control key, if present.
 */
function getCurrentControlKey(state) {
  const control = state.currentControl;
  if (!control) {
    return null;
  }

  return control.key;
}

/**
 * @param {MapperControl} control
 *   Control currently being rendered.
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {CaptureResult | null}
 *   Stored capture mapping for the control, if present.
 */
function getStoredControlCapture(control, state) {
  const capture = state.stored.mappings[control.key];
  if (!capture) {
    return null;
  }

  return /** @type {CaptureResult} */ (capture);
}

const ROW_STATE_VALUE_TEXT = {
  active: 'listening...',
  optional: 'optional',
  skipped: 'skipped',
};

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @param {number} index
 *   Control index within the ordered list.
 * @returns {'active' | 'optional'}
 *   Active/optional row state for an unmapped control.
 */
function getPendingRowState(state, index) {
  if (!state.started) {
    return 'optional';
  }

  return getPendingRowStateForStarted(state, index);
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @param {number} index
 *   Control index within the ordered list.
 * @returns {'active' | 'optional'}
 *   State for an in-flight control after input capture has started.
 */
function getPendingRowStateForStarted(state, index) {
  if (state.currentIndex === index) {
    return 'active';
  }

  return 'optional';
}

/**
 * @param {MapperControl} control
 *   Control currently being rendered.
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @param {number} index
 *   Control index within the ordered list.
 * @returns {'skipped' | 'active' | 'optional'}
 *   Row state for an unmapped control.
 */
function getUnmappedRowState(control, state, index) {
  if (state.stored.skippedControls.includes(control.key)) {
    return 'skipped';
  }

  return getPendingRowState(state, index);
}

/**
 * @param {MapperControl} control
 *   Control currently being rendered.
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @param {number} index
 *   Control index within the ordered list.
 * @returns {'done' | 'skipped' | 'active' | 'optional'}
 *   Row state for class and value rendering.
 */
function getRowState(control, state, index) {
  if (getStoredControlCapture(control, state)) {
    return 'done';
  }

  return getUnmappedRowState(control, state, index);
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
  const capture = getStoredControlCapture(control, state);
  if (capture) {
    return describeCapture(capture);
  }

  const rowState = getRowState(control, state, index);
  return ROW_STATE_VALUE_TEXT[rowState];
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
    const rowState = getRowState(control, state, index);
    if (rowState !== 'optional') {
      row.classList.add(rowState);
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
 * @returns {{ prompt: string, subprompt: string }}
 *   Prompt copy for a disconnected gamepad state.
 */
function getDisconnectedPromptCopy() {
  return {
    prompt: 'Connect a gamepad to begin',
    subprompt: 'The mapper will resume as soon as the left Joy-Con appears.',
  };
}

/**
 * @returns {{ prompt: string, subprompt: string }}
 *   Prompt copy for a ready-to-start mapping state.
 */
function getReadyPromptCopy() {
  return {
    prompt: 'Ready to map the left Joy-Con',
    subprompt:
      'Press Start Mapping. Every control is optional and can be skipped.',
  };
}

/**
 * @returns {{ prompt: string, subprompt: string }}
 *   Prompt copy for a completed mapping state.
 */
function getCompletePromptCopy() {
  return {
    prompt: 'Mapping complete',
    subprompt:
      'The saved mapping is persisted locally and shown in the output panel.',
  };
}

/**
 * @param {MapperControl} control
 *   Active mapper control.
 * @returns {{ prompt: string, subprompt: string }}
 *   Prompt copy for the active control state.
 */
function getActivePromptCopy(control) {
  return {
    prompt: `Press ${control.label}`,
    subprompt: getActivePromptText(control),
  };
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {boolean}
 *   Whether all controls have been processed or no current control remains.
 */
function isPromptComplete(state) {
  if (state.currentIndex >= CONTROLS.length) {
    return true;
  }

  return state.currentControl === null;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {{ prompt: string, subprompt: string }}
 *   Prompt copy after mapping has started.
 */
function getStartedPromptCopy(state) {
  if (isPromptComplete(state)) {
    return getCompletePromptCopy();
  }

  return getActivePromptCopy(
    /** @type {MapperControl} */ (state.currentControl)
  );
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {{ prompt: string, subprompt: string }}
 *   Prompt copy when a gamepad is connected.
 */
function getConnectedPromptCopy(state) {
  if (!state.started) {
    return getReadyPromptCopy();
  }

  return getStartedPromptCopy(state);
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {void}
 */
function renderPrompt(state) {
  const gamepad = currentPad();
  let copy = getDisconnectedPromptCopy();
  if (gamepad) {
    copy = getConnectedPromptCopy(state);
  }

  state.dom.setTextContent(state.prompt, copy.prompt);
  state.dom.setTextContent(state.subprompt, copy.subprompt);
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
  state.currentIndex = getRefreshedCurrentIndex(state);
  state.currentControl = CONTROLS[state.currentIndex] ?? null;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {number}
 *   Current index that should be used after refreshing stored state.
 */
function getRefreshedCurrentIndex(state) {
  if (state.started) {
    return state.currentIndex;
  }

  return normalizePendingIndex(firstPendingIndex(state));
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
function syncCurrentControlFromIndex(state) {
  state.currentControl = CONTROLS[state.currentIndex] ?? null;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {void}
 */
function startMapping(state) {
  state.started = true;
  state.currentIndex = normalizePendingIndex(firstPendingIndex(state));
  syncCurrentControlFromIndex(state);
  state.previousSnapshot = snapshotGamepad(currentPad());
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {void}
 */
function ensureStarted(state) {
  if (state.started) {
    return;
  }

  state.started = true;
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
  const nextIndex = CONTROLS.findIndex((control, index) =>
    isPendingControlAfterIndex(state, control, index)
  );

  state.currentIndex = normalizePendingIndex(nextIndex);
  state.currentControl = CONTROLS[state.currentIndex] ?? null;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @param {MapperControl} control
 *   Candidate mapper control being evaluated.
 * @param {number} index
 *   Current control index.
 * @returns {boolean}
 *   Whether the control is pending and sits after the active index.
 */
function isPendingControlAfterIndex(state, control, index) {
  return index > state.currentIndex && isControlPending(state, control);
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
  if (shouldSkipCapture(state)) {
    return;
  }

  updateCaptureState(state, snapshotGamepad(currentPad()));
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @returns {boolean}
 *   Whether capture polling should be skipped.
 */
function shouldSkipCapture(state) {
  return !state.started || !state.currentControl;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @param {GamepadSnapshot | null} snapshot
 *   Current gamepad snapshot.
 * @returns {void}
 */
function updateCaptureState(state, snapshot) {
  const capture = detectCurrentControlCapture(state, snapshot);

  if (capture) {
    captureCurrentControl(state, capture);
  }

  state.previousSnapshot = snapshot;
}

/**
 * @param {MapperState} state
 *   Current Joy-Con mapper runtime state.
 * @param {GamepadSnapshot | null} snapshot
 *   Current gamepad snapshot.
 * @returns {CaptureResult | null}
 *   Capture for the active control, if one is present.
 */
function detectCurrentControlCapture(state, snapshot) {
  if (state.currentControl.type === 'button') {
    return detectButtonCapture(state.previousSnapshot, snapshot);
  }

  return detectAxisCapture(
    state.previousSnapshot,
    snapshot,
    /** @type {'negative' | 'positive'} */ (state.currentControl.direction)
  );
}

/**
 * @param {{
 *   dom: DOMHelpers,
 *   element: HTMLElement,
 *   handler: (event: Event) => void,
 *   disposers: Array<() => void>
 * }} options
 *   Click registration inputs.
 * @returns {void}
 */
function registerClick(options) {
  const { dom, element, handler, disposers } = options;
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
 * Append every child element to its parent using the DOM helper.
 * @param {DOMHelpers} dom DOM helper facade for element lifecycle.
 * @param {Element} parent Parent element that should receive the children.
 * @param {Element[]} children Children to append to the parent element.
 * @returns {void}
 */
function appendChildren(dom, parent, children) {
  children.forEach(child => dom.appendChild(parent, child));
}

/**
 * Invoke every registered disposer.
 * @param {Array<() => void>} disposers Callbacks to clean up when the mapper is disposed.
 * @returns {void}
 */
function disposeAll(disposers) {
  for (const dispose of disposers) {
    dispose();
  }
}

/**
 * Extract the key from a control if it still exists.
 * @param {MapperControl | null} control Control that was skipped.
 * @returns {string | null} The control key or null if no control was active.
 */
function getSkippedControlKey(control) {
  if (!control) {
    return null;
  }

  return control.key;
}

/**
 * Start the periodic capture loop and register the disposer.
 * @param {MapperState} state Mapper state that tracks the current capture session.
 * @param {Array<() => void>} disposers Cleanup callbacks that should clear the interval.
 * @returns {void} Ensures the capture interval is scheduled and cleared when disposed.
 */
function startJoyConCaptureLoop(state, disposers) {
  const intervalId = globalThis.setInterval(() => maybeCapture(state), 50);
  disposers.push(() => globalThis.clearInterval(intervalId));
}

/**
 * Schedule the initial payload sync using requestAnimationFrame when available.
 * @param {DOMHelpers} dom DOM helper facade for the mapper.
 * @param {HTMLInputElement} textInput Hidden input that mirrors mapper payloads.
 * @param {MapperState} state The mapper state whose payload should be sent.
 * @returns {void} Schedules the initial sync payload if the browser supports requestAnimationFrame.
 */
function queueJoyConInitialSync(dom, textInput, state) {
  if (typeof globalThis.requestAnimationFrame !== 'function') {
    return;
  }

  globalThis.requestAnimationFrame(() => {
    syncToyInput({
      dom,
      textInput,
      autoSubmitCheckbox: state.autoSubmitCheckbox,
      payload: buildPayload('initialize', state),
    });
  });
}

/**
 * Start mapping, sync the payload, and render the updated state.
 * @param {MapperState} state The mapper state shared between the buttons and capture loop.
 */
function handleJoyConMapperStart(state) {
  const { dom, textInput, autoSubmitCheckbox } = state;

  startMapping(state);
  syncToyInput({
    dom,
    textInput,
    autoSubmitCheckbox,
    payload: buildPayload('initialize', state),
  });
  render(state);
}

/**
 * Advance past the current control while syncing the skip payload.
 * @param {MapperState} state Mapper state to update for the pending control.
 */
function handleJoyConMapperSkip(state) {
  const { dom, textInput, autoSubmitCheckbox } = state;

  ensureStarted(state);
  syncToyInput({
    dom,
    textInput,
    autoSubmitCheckbox,
    payload: buildPayload('skip', state, {
      skippedControlKey: getSkippedControlKey(state.currentControl),
    }),
  });
  advanceToNextControl(state);
  render(state);
}

/**
 * Reset the mapper state to its initial baseline and re-render.
 * @param {MapperState} state Mapper state that should be rewound to the start.
 */
function handleJoyConMapperReset(state) {
  const { dom, textInput, autoSubmitCheckbox } = state;

  state.started = false;
  state.currentIndex = 0;
  state.currentControl = CONTROLS[0] ?? null;
  state.previousSnapshot = snapshotGamepad(currentPad());
  syncToyInput({
    dom,
    textInput,
    autoSubmitCheckbox,
    payload: buildPayload('reset', state),
  });
  render(state);
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
  appendChildren(dom, actions, [startButton, skipButton, resetButton]);

  const meta = createElement(dom, 'div', { className: 'joycon-mapper-meta' });
  const metaIndex = createElement(dom, 'div', { text: 'Index: -' });
  const metaId = createElement(dom, 'div', { text: 'ID: -' });
  dom.appendChild(meta, metaIndex);
  dom.appendChild(meta, metaId);

  const list = createElement(dom, 'div', { className: 'joycon-mapper-list' });
  appendChildren(dom, hero, [status, prompt, subprompt, actions, meta, list]);
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

  registerClick({
    dom,
    element: startButton,
    handler: () => handleJoyConMapperStart(state),
    disposers,
  });

  registerClick({
    dom,
    element: skipButton,
    handler: () => handleJoyConMapperSkip(state),
    disposers,
  });

  registerClick({
    dom,
    element: resetButton,
    handler: () => handleJoyConMapperReset(state),
    disposers,
  });

  startJoyConCaptureLoop(state, disposers);
  form._dispose = () => disposeAll(disposers);

  render(state);

  queueJoyConInitialSync(dom, textInput, state);
}
