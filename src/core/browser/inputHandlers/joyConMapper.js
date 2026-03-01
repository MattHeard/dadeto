import * as browserCore from '../browser-core.js';
import { createManagedFormShell } from './createDendriteHandler.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{ pressed: boolean, value: number }} ButtonSnapshot */
/** @typedef {{ buttons: ButtonSnapshot[], axes: number[] }} GamepadSnapshot */
/** @typedef {{ key: string, label: string, type: 'button' | 'axis', direction?: 'negative' | 'positive' }} MapperControl */

const MAPPER_STORAGE_KEY = 'JOYMAP1';
const PERMANENT_DATA_KEY = 'permanentData';
const DENDRITE_FORM_CLASS = browserCore.DENDRITE_FORM_SELECTOR.slice(1);
const AUTO_SUBMIT_CHECKBOX_SELECTOR = '.auto-submit-checkbox';
const AXIS_THRESHOLD = 0.55;
const AXIS_DELTA_THRESHOLD = 0.18;
const BUTTON_THRESHOLD = 0.65;

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
  { key: 'stick_left', label: 'Stick Left', type: 'axis', direction: 'negative' },
  { key: 'stick_right', label: 'Stick Right', type: 'axis', direction: 'positive' },
  { key: 'stick_up', label: 'Stick Up', type: 'axis', direction: 'negative' },
  { key: 'stick_down', label: 'Stick Down', type: 'axis', direction: 'positive' },
]);

function getClosestArticle(container) {
  return container.closest?.('article.entry') ?? null;
}

function getAutoSubmitCheckbox(container, dom) {
  const article = getClosestArticle(container);
  if (!article) {
    return null;
  }

  return /** @type {HTMLInputElement | null} */ (
    dom.querySelector(article, AUTO_SUBMIT_CHECKBOX_SELECTOR)
  );
}

function dispatchChangeEvent(checkbox) {
  checkbox.dispatchEvent(new Event('change'));
}

function enableAutoSubmit(autoSubmitCheckbox) {
  if (!autoSubmitCheckbox) {
    return;
  }

  autoSubmitCheckbox.checked = true;
  dispatchChangeEvent(autoSubmitCheckbox);
}

function syncToyInput({ dom, textInput, autoSubmitCheckbox, payload }) {
  const serialised = JSON.stringify(payload);
  dom.setValue(textInput, serialised);
  browserCore.setInputValue(textInput, serialised);
  enableAutoSubmit(autoSubmitCheckbox);
}

function currentPad() {
  return Array.from(navigator.getGamepads?.() ?? []).find(Boolean) ?? null;
}

function snapshotButton(button) {
  return {
    pressed: button.pressed,
    value: button.value,
  };
}

function snapshotGamepad(gamepad) {
  if (!gamepad) {
    return null;
  }

  return {
    buttons: Array.from(gamepad.buttons, snapshotButton),
    axes: Array.from(gamepad.axes, value => Number(value.toFixed(4))),
  };
}

function createElement(dom, tag, className, text) {
  const element = dom.createElement(tag);
  if (className) {
    dom.setClassName(element, className);
  }
  if (typeof text === 'string') {
    dom.setTextContent(element, text);
  }
  return element;
}

function describeCapture(mapping) {
  if (!mapping) {
    return 'optional';
  }

  if (mapping.type === 'button') {
    return `button ${mapping.index}`;
  }

  return `axis ${mapping.axis} ${mapping.direction === 'negative' ? '-' : '+'}`;
}

function readStoredMapperState() {
  try {
    const root = JSON.parse(globalThis.localStorage?.getItem(PERMANENT_DATA_KEY) ?? '{}');
    const stored = root?.[MAPPER_STORAGE_KEY];
    if (!stored || typeof stored !== 'object') {
      return { mappings: {}, skippedControls: [] };
    }
    return {
      mappings: stored.mappings && typeof stored.mappings === 'object' ? stored.mappings : {},
      skippedControls: Array.isArray(stored.skippedControls) ? stored.skippedControls : [],
    };
  } catch {
    return { mappings: {}, skippedControls: [] };
  }
}

function firstPendingIndex(state) {
  return CONTROLS.findIndex(control => {
    return !state.stored.mappings[control.key] &&
      !state.stored.skippedControls.includes(control.key);
  });
}

function detectButtonCapture(previous, current) {
  if (!previous || !current) {
    return null;
  }

  let best = null;
  current.buttons.forEach((button, index) => {
    const oldButton = previous.buttons[index] ?? { pressed: false, value: 0 };
    const becamePressed = button.pressed && !oldButton.pressed;
    const crossedThreshold = button.value >= BUTTON_THRESHOLD && oldButton.value < BUTTON_THRESHOLD;
    if (!becamePressed && !crossedThreshold) {
      return;
    }

    if (!best || button.value > best.value) {
      best = { type: 'button', index, value: button.value };
    }
  });

  return best;
}

function detectAxisCapture(previous, current, expectedDirection) {
  if (!previous || !current) {
    return null;
  }

  let best = null;
  current.axes.forEach((value, axis) => {
    const oldValue = previous.axes[axis] ?? 0;
    const delta = value - oldValue;
    const directionMatches = expectedDirection === 'positive'
      ? value >= AXIS_THRESHOLD
      : value <= -AXIS_THRESHOLD;
    const directionalDelta = expectedDirection === 'positive' ? delta : -delta;
    if (!directionMatches || directionalDelta <= AXIS_DELTA_THRESHOLD) {
      return;
    }

    const magnitude = Math.abs(value);
    if (!best || magnitude > best.magnitude) {
      best = { type: 'axis', axis, direction: expectedDirection, magnitude };
    }
  });

  return best;
}

function buildPayload(action, state, extra = {}) {
  return {
    toy: MAPPER_STORAGE_KEY,
    action,
    currentControlKey: state.currentControl?.key ?? null,
    ...extra,
  };
}

function renderMapperList(state) {
  domRemoveAllChildren(state.dom, state.list);

  CONTROLS.forEach((control, index) => {
    const row = createElement(state.dom, 'div', 'joycon-mapper-row');
    const isDone = Boolean(state.stored.mappings[control.key]);
    const isSkipped = state.stored.skippedControls.includes(control.key);
    const isActive = state.started &&
      state.currentIndex === index &&
      !isDone &&
      !isSkipped;

    if (isDone) {
      row.classList.add('done');
    }
    if (isSkipped) {
      row.classList.add('skipped');
    }
    if (isActive) {
      row.classList.add('active');
    }

    const name = createElement(state.dom, 'div', 'joycon-mapper-name', control.label);
    const value = createElement(
      state.dom,
      'div',
      'joycon-mapper-value',
      isDone
        ? describeCapture(state.stored.mappings[control.key])
        : isSkipped
          ? 'skipped'
          : isActive
            ? 'listening...'
            : 'optional'
    );
    state.dom.appendChild(row, name);
    state.dom.appendChild(row, value);
    state.dom.appendChild(state.list, row);
  });
}

function domRemoveAllChildren(dom, node) {
  dom.removeAllChildren(node);
}

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
  state.dom.setTextContent(
    state.subprompt,
    control.type === 'button'
      ? 'The next newly pressed gamepad button will be saved for this control, or click Skip Current.'
      : 'Move the stick in the highlighted direction until the mapper captures it, or click Skip Current.'
  );
}

function renderMeta(state) {
  const gamepad = currentPad();
  state.dot.classList.toggle('connected', Boolean(gamepad));
  state.dom.setTextContent(state.statusText, gamepad ? 'Gamepad detected' : 'Waiting for gamepad');
  state.dom.setTextContent(state.metaIndex, `Index: ${gamepad ? String(gamepad.index) : '-'}`);
  state.dom.setTextContent(state.metaId, `ID: ${gamepad ? gamepad.id : '-'}`);
}

function refreshStoredState(state) {
  state.stored = readStoredMapperState();
  if (!state.started) {
    const pending = firstPendingIndex(state);
    state.currentIndex = pending === -1 ? CONTROLS.length : pending;
  }
  state.currentControl = CONTROLS[state.currentIndex] ?? null;
}

function render(state) {
  refreshStoredState(state);
  renderMeta(state);
  renderPrompt(state);
  renderMapperList(state);
}

function advanceToNextControl(state) {
  const nextIndex = CONTROLS.findIndex((control, index) => {
    return index > state.currentIndex &&
      !state.stored.mappings[control.key] &&
      !state.stored.skippedControls.includes(control.key);
  });

  state.currentIndex = nextIndex === -1 ? CONTROLS.length : nextIndex;
  state.currentControl = CONTROLS[state.currentIndex] ?? null;
}

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

function registerClick(dom, element, handler, disposers) {
  dom.addEventListener(element, 'click', handler);
  disposers.push(() => dom.removeEventListener(element, 'click', handler));
}

function injectStyles(dom, form) {
  const style = createElement(dom, 'style', '', `
    .${DENDRITE_FORM_CLASS}.joycon-mapper-form { display:grid; gap:12px; }
    .joycon-mapper-hero { display:grid; gap:10px; padding:14px; border:1px solid #30445b; border-radius:14px; background:#172231; color:#f3f7fb; }
    .joycon-mapper-status { display:flex; align-items:center; gap:8px; font-weight:700; color:#ffd166; }
    .joycon-mapper-dot { width:10px; height:10px; border-radius:999px; background:#ff7a59; }
    .joycon-mapper-dot.connected { background:#52d273; box-shadow:0 0 0 8px rgba(82,210,115,0.12); }
    .joycon-mapper-prompt { font-size:1.4rem; font-weight:800; line-height:1; }
    .joycon-mapper-subprompt { color:#9cb0c3; }
    .joycon-mapper-actions { display:flex; flex-wrap:wrap; gap:8px; }
    .joycon-mapper-actions button { border:1px solid #30445b; border-radius:999px; padding:8px 14px; background:#223246; color:#f3f7fb; cursor:pointer; }
    .joycon-mapper-actions .primary { background:#ffd166; color:#111923; font-weight:700; }
    .joycon-mapper-meta { display:grid; gap:6px; color:#9cb0c3; font-size:0.92rem; }
    .joycon-mapper-list { display:grid; gap:8px; }
    .joycon-mapper-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; padding:10px 12px; border:1px solid #30445b; border-radius:12px; background:#0f1824; }
    .joycon-mapper-row.active { border-color:#7ed9ff; background:rgba(126,217,255,0.12); }
    .joycon-mapper-row.done { border-color:#52d273; }
    .joycon-mapper-row.skipped { border-color:#5e7389; opacity:0.9; }
    .joycon-mapper-name { font-weight:700; color:#f3f7fb; }
    .joycon-mapper-value { color:#9cb0c3; font-family:monospace; }
  `);
  dom.appendChild(form, style);
}

export function joyConMapperHandler(dom, container, textInput) {
  browserCore.hideAndDisable(textInput, dom);
  const disposers = [];
  const form = createManagedFormShell({ dom, container, textInput, disposers });
  form.classList.add('joycon-mapper-form');
  injectStyles(dom, form);

  const hero = createElement(dom, 'div', 'joycon-mapper-hero');
  const status = createElement(dom, 'div', 'joycon-mapper-status');
  const dot = createElement(dom, 'span', 'joycon-mapper-dot');
  const statusText = createElement(dom, 'span', '', 'Waiting for gamepad');
  dom.appendChild(status, dot);
  dom.appendChild(status, statusText);

  const prompt = createElement(dom, 'div', 'joycon-mapper-prompt', 'Connect a gamepad to begin');
  const subprompt = createElement(dom, 'div', 'joycon-mapper-subprompt', 'The mapper will resume as soon as the left Joy-Con appears.');
  const actions = createElement(dom, 'div', 'joycon-mapper-actions');
  const startButton = /** @type {HTMLButtonElement} */ (createElement(dom, 'button', 'primary', 'Start Mapping'));
  const skipButton = /** @type {HTMLButtonElement} */ (createElement(dom, 'button', '', 'Skip Current'));
  const resetButton = /** @type {HTMLButtonElement} */ (createElement(dom, 'button', '', 'Reset Mapping'));
  [startButton, skipButton, resetButton].forEach(button => dom.appendChild(actions, button));

  const meta = createElement(dom, 'div', 'joycon-mapper-meta');
  const metaIndex = createElement(dom, 'div', '', 'Index: -');
  const metaId = createElement(dom, 'div', '', 'ID: -');
  dom.appendChild(meta, metaIndex);
  dom.appendChild(meta, metaId);

  const list = createElement(dom, 'div', 'joycon-mapper-list');
  [status, prompt, subprompt, actions, meta, list].forEach(element => dom.appendChild(hero, element));
  dom.appendChild(form, hero);

  const state = {
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
  };

  registerClick(dom, startButton, () => {
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
  }, disposers);

  registerClick(dom, skipButton, () => {
    if (!state.started) {
      state.started = true;
    }
    const skippedControl = state.currentControl;
    syncToyInput({
      dom,
      textInput,
      autoSubmitCheckbox: state.autoSubmitCheckbox,
      payload: buildPayload('skip', state, { skippedControlKey: skippedControl?.key ?? null }),
    });
    advanceToNextControl(state);
    render(state);
  }, disposers);

  registerClick(dom, resetButton, () => {
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
  }, disposers);

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
