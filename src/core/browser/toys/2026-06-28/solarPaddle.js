import { parseJsonOrNull } from '../../../commonCore.js';
import { normalizePositiveInteger } from '../../common.js';

const STORAGE_KEY = 'SOLA1';
const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 240;
const DEFAULT_PADDLE_WIDTH = 52;
const DEFAULT_PADDLE_HEIGHT = 7;
const DEFAULT_PADDLE_SPEED = 4;
const DEFAULT_ORB_RADIUS = 4;
const DEFAULT_ORB_SPEED_X = 2;
const DEFAULT_ORB_SPEED_Y = -3;
const DEFAULT_LIVES = 3;
const DEFAULT_PANEL_ROWS = 3;
const DEFAULT_PANEL_COLS = 5;
const PANEL_GAP = 6;
const PANEL_TOP = 30;
const PANEL_LEFT = 28;
const PADDLE_Y_OFFSET = 18;
const EDGE_THRESHOLD = 0.4;

/**
 * @typedef {{ left: boolean, right: boolean, launch: boolean, pause: boolean, reset: boolean }} PaddleActions
 * @typedef {{ left: boolean, right: boolean, launchPressed: boolean, pausePressed: boolean, resetPressed: boolean }} PaddleEdgeActions
 * @typedef {{ keyboard: Record<string, boolean>, gamepad: PaddleGamepadState, actions: PaddleActions, edgeActions: PaddleEdgeActions, previousActions: PaddleActions }} PaddleInputState
 * @typedef {{ buttons: boolean[], axes: number[] }} PaddleGamepadState
 * @typedef {{ id: string, x: number, y: number, width: number, height: number, charge: boolean }} PaddlePanel
 * @typedef {{ x: number, y: number, vx: number, vy: number, radius: number, stuckToPaddle: boolean }} PaddleOrb
 * @typedef {{
 *   version: 1,
 *   width: number,
 *   height: number,
 *   frame: number,
 *   status: 'ready' | 'running' | 'paused' | 'won' | 'lost',
 *   score: number,
 *   lives: number,
 *   input: PaddleInputState,
 *   paddle: { x: number, y: number, width: number, height: number, speed: number },
 *   orb: PaddleOrb,
 *   panels: PaddlePanel[],
 * }} PaddleState
 */

/**
 * Build a Solar Paddle canvas payload from the current input and persisted state.
 * @param {string} input Raw JSON input payload.
 * @param {{ get?: (name: string) => unknown }} env Toy environment helpers.
 * @returns {string} JSON canvas payload for the canvas presenter.
 */
export function solarPaddle(input, env) {
  const storage = getStorageAccessor(env);
  const persisted = readPersistedState(storage);
  const parsed = parseInput(input);
  const state = buildNextState(persisted, parsed);
  persistState(storage, state);
  return JSON.stringify(toCanvasPayload(state));
}

function getStorageAccessor(env) {
  if (!env || typeof env.get !== 'function') {
    return null;
  }

  const setter = env.get('setLocalPermanentData');
  return typeof setter === 'function' ? setter : null;
}

function readPersistedState(storage) {
  if (!storage) {
    return null;
  }

  const stored = storage({});
  return normalizeState(stored?.[STORAGE_KEY]);
}

function parseInput(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    return null;
  }

  return parseObjectRecord(input);
}

function parseObjectRecord(value) {
  const parsed = parseJsonOrNull(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return /** @type {Record<string, unknown>} */ (parsed);
  }

  return null;
}

function buildNextState(persisted, input) {
  const seed = createSeedState(input, persisted);
  const base = persisted || seed;
  const shouldReset = input?.reset === true || !persisted;
  const merged = shouldReset ? seed : mergeSeedAndState(base, seed);
  const inputState = updateInputState(base.input, input);
  const withInput = {
    ...merged,
    input: inputState,
    frame: base.frame + 1,
  };

  applyGameplayInput(withInput, inputState);
  if (withInput.status === 'running') {
    stepSimulation(withInput);
  }
  if (inputState.edgeActions.resetPressed) {
    return createSeedState(input);
  }

  return withInput;
}

function mergeSeedAndState(base, seed) {
  return {
    ...base,
    width: seed.width,
    height: seed.height,
    paddle: {
      ...base.paddle,
      y: Math.max(0, seed.height - PADDLE_Y_OFFSET - base.paddle.height),
    },
    orb: {
      ...base.orb,
      radius: DEFAULT_ORB_RADIUS,
    },
    panels: seed.panels,
  };
}

function createSeedState(input, fallback) {
  const width = normalizePositiveInteger(
    input?.width,
    fallback?.width ?? DEFAULT_WIDTH
  );
  const height = normalizePositiveInteger(
    input?.height,
    fallback?.height ?? DEFAULT_HEIGHT
  );
  const paddleWidth = normalizePositiveInteger(
    input?.paddleWidth,
    DEFAULT_PADDLE_WIDTH
  );
  const paddleHeight = normalizePositiveInteger(
    input?.paddleHeight,
    DEFAULT_PADDLE_HEIGHT
  );
  const paddleSpeed = normalizePositiveInteger(
    input?.paddleSpeed,
    DEFAULT_PADDLE_SPEED
  );
  const orbRadius = normalizePositiveInteger(input?.orbRadius, DEFAULT_ORB_RADIUS);
  return createState({
    width,
    height,
    paddleWidth,
    paddleHeight,
    paddleSpeed,
    orbRadius,
    lives: normalizePositiveInteger(input?.lives, fallback?.lives ?? DEFAULT_LIVES),
    panels: normalizePanels(width, height),
  });
}

function createState(options) {
  const paddleY = Math.max(0, options.height - PADDLE_Y_OFFSET - options.paddleHeight);
  return {
    version: 1,
    width: options.width,
    height: options.height,
    frame: 0,
    status: 'ready',
    score: 0,
    lives: options.lives,
    input: createInitialInputState(),
    paddle: {
      x: Math.round((options.width - options.paddleWidth) / 2),
      y: paddleY,
      width: options.paddleWidth,
      height: options.paddleHeight,
      speed: options.paddleSpeed,
    },
    orb: {
      x: Math.round(options.width / 2),
      y: paddleY - options.orbRadius - 1,
      vx: DEFAULT_ORB_SPEED_X,
      vy: DEFAULT_ORB_SPEED_Y,
      radius: options.orbRadius,
      stuckToPaddle: true,
    },
    panels: options.panels,
  };
}

function createInitialInputState() {
  return {
    keyboard: {},
    gamepad: { buttons: [], axes: [] },
    actions: { left: false, right: false, launch: false, pause: false, reset: false },
    edgeActions: {
      left: false,
      right: false,
      launchPressed: false,
      pausePressed: false,
      resetPressed: false,
    },
    previousActions: { left: false, right: false, launch: false, pause: false, reset: false },
  };
}

function normalizeState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = /** @type {Record<string, unknown>} */ (value);
  if (candidate.version !== 1) {
    return null;
  }

  return {
    version: 1,
    width: normalizePositiveInteger(candidate.width, DEFAULT_WIDTH),
    height: normalizePositiveInteger(candidate.height, DEFAULT_HEIGHT),
    frame: normalizePositiveInteger(candidate.frame, 0),
    status: normalizeStatus(candidate.status),
    score: normalizePositiveInteger(candidate.score, 0),
    lives: normalizePositiveInteger(candidate.lives, DEFAULT_LIVES),
    input: normalizeInputState(candidate.input),
    paddle: normalizePaddle(candidate.paddle, candidate.height),
    orb: normalizeOrb(candidate.orb),
    panels: normalizePanelsFromState(candidate.panels),
  };
}

function normalizeStatus(value) {
  return ['ready', 'running', 'paused', 'won', 'lost'].includes(value)
    ? /** @type {PaddleState['status']} */ (value)
    : 'ready';
}

function normalizeInputState(value) {
  return {
    keyboard: normalizeBooleanRecord(value?.keyboard),
    gamepad: normalizeGamepadState(value?.gamepad),
    actions: normalizeActions(value?.actions),
    edgeActions: normalizeEdgeActions(value?.edgeActions),
    previousActions: normalizeActions(value?.previousActions),
  };
}

function normalizeBooleanRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  return Object.fromEntries(
    Object.entries(record).map(([key, next]) => [key, next === true])
  );
}

function normalizeGamepadState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { buttons: [], axes: [] };
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  return {
    buttons: Array.isArray(record.buttons)
      ? record.buttons.map(next => next === true)
      : [],
    axes: Array.isArray(record.axes)
      ? record.axes.map(next => Number(next) || 0)
      : [],
  };
}

function normalizeActions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { left: false, right: false, launch: false, pause: false, reset: false };
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  return {
    left: record.left === true,
    right: record.right === true,
    launch: record.launch === true,
    pause: record.pause === true,
    reset: record.reset === true,
  };
}

function normalizeEdgeActions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      left: false,
      right: false,
      launchPressed: false,
      pausePressed: false,
      resetPressed: false,
    };
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  return {
    left: record.left === true,
    right: record.right === true,
    launchPressed: record.launchPressed === true,
    pausePressed: record.pausePressed === true,
    resetPressed: record.resetPressed === true,
  };
}

function normalizePaddle(value, height) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createState(createSeedOptions()).paddle;
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  const seed = createSeedOptions();
  return {
    x: normalizePositiveInteger(record.x, seed.width / 2),
    y: Math.max(0, normalizePositiveInteger(record.y, height - PADDLE_Y_OFFSET)),
    width: normalizePositiveInteger(record.width, DEFAULT_PADDLE_WIDTH),
    height: normalizePositiveInteger(record.height, DEFAULT_PADDLE_HEIGHT),
    speed: normalizePositiveInteger(record.speed, DEFAULT_PADDLE_SPEED),
  };
}

function normalizeOrb(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createState(createSeedOptions()).orb;
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  return {
    x: Number(record.x) || Math.round(DEFAULT_WIDTH / 2),
    y: Number(record.y) || 0,
    vx: Number(record.vx) || DEFAULT_ORB_SPEED_X,
    vy: Number(record.vy) || DEFAULT_ORB_SPEED_Y,
    radius: normalizePositiveInteger(record.radius, DEFAULT_ORB_RADIUS),
    stuckToPaddle: record.stuckToPaddle === true,
  };
}

function createSeedOptions() {
  return {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    paddleWidth: DEFAULT_PADDLE_WIDTH,
    paddleHeight: DEFAULT_PADDLE_HEIGHT,
    paddleSpeed: DEFAULT_PADDLE_SPEED,
    orbRadius: DEFAULT_ORB_RADIUS,
    lives: DEFAULT_LIVES,
    panels: normalizePanels(DEFAULT_WIDTH, DEFAULT_HEIGHT),
  };
}

function normalizePanelsFromState(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return normalizePanels(DEFAULT_WIDTH, DEFAULT_HEIGHT);
  }

  return value
    .filter(panel => panel && typeof panel === 'object')
    .map((panel, index) => {
      const record = /** @type {Record<string, unknown>} */ (panel);
      return {
        id: typeof record.id === 'string' ? record.id : `p${index + 1}`,
        x: Number(record.x) || 0,
        y: Number(record.y) || 0,
        width: normalizePositiveInteger(record.width, 20),
        height: normalizePositiveInteger(record.height, 10),
        charge: record.charge === true,
      };
    });
}

function normalizePanels(width, height) {
  const totalWidth = width - PANEL_LEFT * 2 - PANEL_GAP * (DEFAULT_PANEL_COLS - 1);
  const panelWidth = Math.max(20, Math.floor(totalWidth / DEFAULT_PANEL_COLS));
  const panelHeight = 10;
  const startX = PANEL_LEFT;
  const panelRows = DEFAULT_PANEL_ROWS;
  const rowSpacing = panelHeight + PANEL_GAP;
  const colSpacing = panelWidth + PANEL_GAP;

  const panels = [];
  for (let row = 0; row < panelRows; row += 1) {
    for (let col = 0; col < DEFAULT_PANEL_COLS; col += 1) {
      panels.push({
        id: `p${row + 1}-${col + 1}`,
        x: startX + col * colSpacing,
        y: PANEL_TOP + row * rowSpacing,
        width: panelWidth,
        height: panelHeight,
        charge: false,
      });
    }
  }

  return panels;
}

function updateInputState(previous, input) {
  const nextKeyboard = { ...(previous?.keyboard || {}) };
  const nextGamepad = normalizeGamepadState(previous?.gamepad);
  const nextActions = deriveActions(input, nextKeyboard, nextGamepad);
  const previousActions = normalizeActions(previous?.actions);
  return {
    keyboard: nextKeyboard,
    gamepad: nextGamepad,
    actions: nextActions.actions,
    edgeActions: {
      left: nextActions.actions.left && !previousActions.left,
      right: nextActions.actions.right && !previousActions.right,
      launchPressed: nextActions.actions.launch && !previousActions.launch,
      pausePressed: nextActions.actions.pause && !previousActions.pause,
      resetPressed: nextActions.actions.reset && !previousActions.reset,
    },
    previousActions,
  };
}

function deriveActions(input, keyboard, gamepad) {
  if (input?.type === 'keydown' && typeof input.key === 'string') {
    keyboard[input.key] = true;
  }
  if (input?.type === 'keyup' && typeof input.key === 'string') {
    keyboard[input.key] = false;
  }
  if (input?.type === 'capture' && input.capturing === false) {
    return createActionsFromState(keyboard, gamepad);
  }
  if (input?.type === 'hid') {
    applyHidInput(input, gamepad);
    return createActionsFromState(keyboard, gamepad);
  }

  if (Array.isArray(input?.buttons)) {
    gamepad.buttons = input.buttons.map(next => next === true);
  }
  if (Array.isArray(input?.axes)) {
    gamepad.axes = input.axes.map(next => Number(next) || 0);
  }
  if (typeof input?.buttonIndex === 'number') {
    gamepad.buttons[input.buttonIndex] = input.pressed === true;
  }

  return createActionsFromState(keyboard, gamepad);
}

/**
 * Merge a WebHID-style payload into the normalized gamepad state.
 * @param {Record<string, unknown>} input Raw HID payload.
 * @param {PaddleGamepadState} gamepad Mutable normalized gamepad state.
 * @returns {void}
 */
function applyHidInput(input, gamepad) {
  if (Array.isArray(input.buttons)) {
    gamepad.buttons = input.buttons.map(next => next === true);
  }
  if (Array.isArray(input.axes)) {
    gamepad.axes = input.axes.map(next => Number(next) || 0);
  }
  if (typeof input.buttonIndex === 'number') {
    gamepad.buttons[input.buttonIndex] = input.pressed === true;
  }
  if (Array.isArray(input.reportBytes)) {
    const decoded = decodeHidReport(input.reportBytes);
    if (decoded.buttons.length > 0) {
      gamepad.buttons = decoded.buttons;
    }
    if (decoded.axes.length > 0) {
      gamepad.axes = decoded.axes;
    }
  }
}

/**
 * Decode a compact HID report into button and axis values.
 * @param {unknown[]} reportBytes Raw report bytes from a WebHID device.
 * @returns {{ buttons: boolean[], axes: number[] }} Normalized state.
 */
function decodeHidReport(reportBytes) {
  const bytes = reportBytes.map(byte => Number(byte) || 0);
  const buttons = bytes.length > 0 ? decodeHidButtons(bytes[0]) : [];
  const axes = bytes.length > 1 ? decodeHidAxes(bytes.slice(1, 3)) : [];
  return { buttons, axes };
}

/**
 * Decode the first byte as a compact button bitset.
 * @param {number} buttonByte Bitfield from a HID report.
 * @returns {boolean[]} Normalized button states.
 */
function decodeHidButtons(buttonByte) {
  return [
    Boolean(buttonByte & 0x01),
    Boolean(buttonByte & 0x02),
    Boolean(buttonByte & 0x04),
    Boolean(buttonByte & 0x08),
    Boolean(buttonByte & 0x10),
    Boolean(buttonByte & 0x20),
    Boolean(buttonByte & 0x40),
    Boolean(buttonByte & 0x80),
  ];
}

/**
 * Decode up to two axis bytes into normalized signed values.
 * @param {number[]} axisBytes Axis bytes from a HID report.
 * @returns {number[]} Normalized signed axis values in the -1..1 range.
 */
function decodeHidAxes(axisBytes) {
  return axisBytes.map(byte => {
    const normalized = clamp((byte - 128) / 128, -1, 1);
    return Math.abs(normalized) < EDGE_THRESHOLD ? 0 : normalized;
  });
}

function createActionsFromState(keyboard, gamepad) {
  const actions = {
    left: Boolean(keyboard.ArrowLeft || keyboard.a || keyboard.A || isAxisLeft(gamepad.axes[0])),
    right: Boolean(keyboard.ArrowRight || keyboard.d || keyboard.D || isAxisRight(gamepad.axes[0])),
    launch: Boolean(keyboard.Space || keyboard[' '] || keyboard.Button0 || gamepad.buttons[0]),
    pause: Boolean(keyboard.p || keyboard.P || keyboard.Button9 || gamepad.buttons[9]),
    reset: Boolean(keyboard.r || keyboard.R || keyboard.Button8 || gamepad.buttons[8]),
  };
  return {
    actions,
    edgeActions: {
      left: actions.left,
      right: actions.right,
      launchPressed: actions.launch,
      pausePressed: actions.pause,
      resetPressed: actions.reset,
    },
  };
}

function isAxisLeft(value) {
  return Number(value) < -EDGE_THRESHOLD;
}

function isAxisRight(value) {
  return Number(value) > EDGE_THRESHOLD;
}

function applyGameplayInput(state, inputState) {
  movePaddle(state, inputState.actions);
  if (state.status === 'ready' && inputState.edgeActions.launchPressed) {
    state.status = 'running';
    state.orb.stuckToPaddle = false;
  }
  if (state.status === 'running' && inputState.edgeActions.pausePressed) {
    state.status = 'paused';
  } else if (state.status === 'paused' && inputState.edgeActions.pausePressed) {
    state.status = 'running';
  }
  if (state.orb.stuckToPaddle) {
    stickOrbToPaddle(state);
  }
}

function movePaddle(state, actions) {
  const delta = (actions.right ? 1 : 0) - (actions.left ? 1 : 0);
  state.paddle.x = clamp(
    state.paddle.x + delta * state.paddle.speed,
    0,
    state.width - state.paddle.width
  );
}

function stepSimulation(state) {
  if (!state.orb.stuckToPaddle) {
    state.orb.x += state.orb.vx;
    state.orb.y += state.orb.vy;
    resolveWalls(state);
    resolvePaddle(state);
    resolvePanels(state);
    resolveBottom(state);
    resolveWinLoss(state);
  }
}

function stickOrbToPaddle(state) {
  state.orb.x = state.paddle.x + Math.round(state.paddle.width / 2);
  state.orb.y = state.paddle.y - state.orb.radius - 1;
}

function resolveWalls(state) {
  if (state.orb.x - state.orb.radius <= 0) {
    state.orb.x = state.orb.radius;
    state.orb.vx = Math.abs(state.orb.vx);
  }
  if (state.orb.x + state.orb.radius >= state.width) {
    state.orb.x = state.width - state.orb.radius;
    state.orb.vx = -Math.abs(state.orb.vx);
  }
  if (state.orb.y - state.orb.radius <= 0) {
    state.orb.y = state.orb.radius;
    state.orb.vy = Math.abs(state.orb.vy);
  }
}

function resolvePaddle(state) {
  const paddle = state.paddle;
  const orb = state.orb;
  const withinHorizontal =
    orb.x + orb.radius >= paddle.x && orb.x - orb.radius <= paddle.x + paddle.width;
  const withinVertical =
    orb.y + orb.radius >= paddle.y && orb.y + orb.radius <= paddle.y + paddle.height + 6;
  if (orb.vy > 0 && withinHorizontal && withinVertical) {
    const hitOffset =
      (orb.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2 || 1);
    orb.y = paddle.y - orb.radius - 1;
    orb.vy = -Math.abs(orb.vy);
    orb.vx = clamp(orb.vx + hitOffset * 2, -5, 5) || DEFAULT_ORB_SPEED_X;
  }
}

function resolvePanels(state) {
  for (const panel of state.panels) {
    if (panel.charge) {
      continue;
    }
    if (circleIntersectsPanel(state.orb, panel)) {
      panel.charge = true;
      state.score += 1;
      state.orb.vy = -state.orb.vy;
      break;
    }
  }
}

function circleIntersectsPanel(orb, panel) {
  const closestX = clamp(orb.x, panel.x, panel.x + panel.width);
  const closestY = clamp(orb.y, panel.y, panel.y + panel.height);
  const dx = orb.x - closestX;
  const dy = orb.y - closestY;
  return dx * dx + dy * dy <= orb.radius * orb.radius;
}

function resolveBottom(state) {
  if (state.orb.y + state.orb.radius <= state.height) {
    return;
  }

  state.lives -= 1;
  if (state.lives <= 0) {
    state.status = 'lost';
    return;
  }
  resetOrbToPaddle(state);
}

function resolveWinLoss(state) {
  if (state.panels.every(panel => panel.charge)) {
    state.status = 'won';
  }
  if (state.lives <= 0) {
    state.status = 'lost';
  }
}

function resetOrbToPaddle(state) {
  state.status = 'ready';
  state.orb.stuckToPaddle = true;
  state.orb.vx = DEFAULT_ORB_SPEED_X;
  state.orb.vy = DEFAULT_ORB_SPEED_Y;
  stickOrbToPaddle(state);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toCanvasPayload(state) {
  const shapes = [
    { type: 'rect', x: 0, y: 0, width: state.width, height: state.height, fill: '#0b1220' },
    { type: 'rect', x: 14, y: 14, width: state.width - 28, height: state.height - 28, fill: '#10233f' },
    ...state.panels.map(panel => ({
      type: 'rect',
      x: panel.x,
      y: panel.y,
      width: panel.width,
      height: panel.height,
      fill: panel.charge ? '#1d4ed8' : '#7dd3fc',
    })),
    {
      type: 'rect',
      x: state.paddle.x,
      y: state.paddle.y,
      width: state.paddle.width,
      height: state.paddle.height,
      fill: '#cbd5e1',
    },
    {
      type: 'circle',
      x: Math.round(state.orb.x),
      y: Math.round(state.orb.y),
      radius: state.orb.radius,
      fill: state.status === 'lost' ? '#f87171' : '#fbbf24',
    },
    {
      type: 'rect',
      x: 18,
      y: state.height - 12,
      width: Math.max(8, Math.min(state.width - 36, state.score * 10 + 20)),
      height: 4,
      fill: '#34d399',
    },
  ];

  return {
    width: state.width,
    height: state.height,
    shapes,
  };
}

function persistState(storage, state) {
  storage?.({ [STORAGE_KEY]: state });
}
