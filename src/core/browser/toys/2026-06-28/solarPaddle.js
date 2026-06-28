// @ts-nocheck
/* eslint-disable jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns, no-ternary, complexity, no-unused-vars */
// jscpd:ignore-start
import { parseJsonOrNull } from '../../../commonCore.js';
import { normalizePositiveInteger } from '../../common.js';

const STORAGE_KEY = 'SOLA1';
const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 240;
const DEFAULT_PADDLE_WIDTH = 52;
const DEFAULT_PADDLE_HEIGHT = 7;
const DEFAULT_PADDLE_SPEED = 4;
const DEFAULT_ORB_RADIUS = 4;
const DEFAULT_ORB_SPEED_X = 1;
const DEFAULT_ORB_SPEED_Y = -2;
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

/**
 *
 * @param env
 */
function getStorageAccessor(env) {
  if (!env || typeof env.get !== 'function') {
    return null;
  }

  const setter = env.get('setLocalPermanentData');
  return typeof setter === 'function' ? setter : null;
}

/**
 *
 * @param storage
 */
function readPersistedState(storage) {
  if (!storage) {
    return null;
  }

  const stored = storage({});
  return normalizeState(stored?.[STORAGE_KEY]);
}

/**
 *
 * @param input
 */
function parseInput(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    return null;
  }

  return parseObjectRecord(input);
}

/**
 *
 * @param value
 */
function parseObjectRecord(value) {
  const parsed = parseJsonOrNull(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return /** @type {Record<string, unknown>} */ (parsed);
  }

  return null;
}

/**
 *
 * @param persisted
 * @param input
 */
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
    return createSeedState({
      ...input,
      layoutSeed: (persisted?.layoutSeed ?? 0) + 1,
    },
    persisted
      ? {
          width: persisted.width,
          height: persisted.height,
          lives: persisted.lives,
          layoutSeed: persisted.layoutSeed,
        }
      : undefined);
  }

  return withInput;
}

/**
 *
 * @param base
 * @param seed
 */
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

/**
 *
 * @param input
 * @param fallback
 */
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
  const orbRadius = normalizePositiveInteger(
    input?.orbRadius,
    DEFAULT_ORB_RADIUS
  );
  const orbSpeedX = normalizeNumber(input?.orbSpeedX, DEFAULT_ORB_SPEED_X);
  const orbSpeedY = normalizeNumber(input?.orbSpeedY, DEFAULT_ORB_SPEED_Y);
  const layoutSeed = normalizePositiveInteger(
    input?.layoutSeed,
    fallback?.layoutSeed ?? 1
  );
  return createState({
    width,
    height,
    paddleWidth,
    paddleHeight,
    paddleSpeed,
    orbRadius,
    orbSpeedX,
    orbSpeedY,
    layoutSeed,
    lives: normalizePositiveInteger(
      input?.lives,
      fallback?.lives ?? DEFAULT_LIVES
    ),
    panels: normalizePanels(width, height, layoutSeed),
  });
}

/**
 *
 * @param options
 */
function createState(options) {
  const paddleY = Math.max(
    0,
    options.height - PADDLE_Y_OFFSET - options.paddleHeight
  );
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
      vx: options.orbSpeedX,
      vy: options.orbSpeedY,
      radius: options.orbRadius,
      stuckToPaddle: true,
    },
    panels: options.panels,
  };
}

/**
 *
 */
function createInitialInputState() {
  return {
    keyboard: {},
    gamepad: { buttons: [], axes: [] },
    actions: {
      left: false,
      right: false,
      launch: false,
      pause: false,
      reset: false,
    },
    edgeActions: {
      left: false,
      right: false,
      launchPressed: false,
      pausePressed: false,
      resetPressed: false,
    },
    previousActions: {
      left: false,
      right: false,
      launch: false,
      pause: false,
      reset: false,
    },
  };
}

/**
 *
 * @param value
 */
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
    layoutSeed: normalizePositiveInteger(candidate.layoutSeed, 1),
    input: normalizeInputState(candidate.input),
    paddle: normalizePaddle(candidate.paddle, candidate.height),
    orb: normalizeOrb(candidate.orb),
    panels: normalizePanelsFromState(candidate.panels),
  };
}

/**
 *
 * @param value
 */
function normalizeStatus(value) {
  return ['ready', 'running', 'paused', 'won', 'lost'].includes(value)
    ? /** @type {PaddleState['status']} */ (value)
    : 'ready';
}

/**
 *
 * @param value
 */
function normalizeInputState(value) {
  return {
    keyboard: normalizeBooleanRecord(value?.keyboard),
    gamepad: normalizeGamepadState(value?.gamepad),
    actions: normalizeActions(value?.actions),
    edgeActions: normalizeEdgeActions(value?.edgeActions),
    previousActions: normalizeActions(value?.previousActions),
  };
}

/**
 *
 * @param value
 */
function normalizeBooleanRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  return Object.fromEntries(
    Object.entries(record).map(([key, next]) => [key, next === true])
  );
}

/**
 *
 * @param value
 */
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

/**
 *
 * @param value
 */
function normalizeActions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      left: false,
      right: false,
      launch: false,
      pause: false,
      reset: false,
    };
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

/**
 *
 * @param value
 */
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

/**
 *
 * @param value
 * @param height
 */
function normalizePaddle(value, height) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createState(createSeedOptions()).paddle;
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  const seed = createSeedOptions();
  return {
    x: normalizeNonNegativeInteger(record.x, seed.width / 2),
    y: Math.max(
      0,
      normalizePositiveInteger(record.y, height - PADDLE_Y_OFFSET)
    ),
    width: normalizePositiveInteger(record.width, DEFAULT_PADDLE_WIDTH),
    height: normalizePositiveInteger(record.height, DEFAULT_PADDLE_HEIGHT),
    speed: normalizePositiveInteger(record.speed, DEFAULT_PADDLE_SPEED),
  };
}

/**
 *
 * @param value
 * @param fallback
 */
function normalizeNonNegativeInteger(value, fallback) {
  const next = Number(value);
  if (Number.isFinite(next) && next >= 0) {
    return Math.round(next);
  }

  return fallback;
}

/**
 *
 * @param value
 */
function normalizeOrb(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createState(createSeedOptions()).orb;
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  return {
    x: Number(record.x) || Math.round(DEFAULT_WIDTH / 2),
    y: Number(record.y) || 0,
    vx: normalizeNumber(record.vx, DEFAULT_ORB_SPEED_X),
    vy: normalizeNumber(record.vy, DEFAULT_ORB_SPEED_Y),
    radius: normalizePositiveInteger(record.radius, DEFAULT_ORB_RADIUS),
    stuckToPaddle: record.stuckToPaddle === true,
  };
}

/**
 *
 * @param value
 * @param fallback
 */
function normalizeNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) && next !== 0 ? next : fallback;
}

/**
 *
 */
function createSeedOptions() {
  return {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    paddleWidth: DEFAULT_PADDLE_WIDTH,
    paddleHeight: DEFAULT_PADDLE_HEIGHT,
    paddleSpeed: DEFAULT_PADDLE_SPEED,
    orbRadius: DEFAULT_ORB_RADIUS,
    orbSpeedX: DEFAULT_ORB_SPEED_X,
    orbSpeedY: DEFAULT_ORB_SPEED_Y,
    layoutSeed: 1,
    lives: DEFAULT_LIVES,
    panels: normalizePanels(DEFAULT_WIDTH, DEFAULT_HEIGHT, 1),
  };
}

/**
 *
 * @param value
 */
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

/**
 *
 * @param width
 * @param height
 */
function normalizePanels(width, height, seed = 1) {
  const panelWidth = 28;
  const panelHeight = 10;
  const positions = shufflePositions(
    buildPanelPositions(width, height, panelWidth, panelHeight),
    seed
  );
  const counts = [3, 5, 4];
  const rows = [];
  let index = 0;
  counts.forEach((count, rowIndex) => {
    for (let col = 0; col < count; col += 1) {
      const position = positions[index++];
      rows.push({
        id: `p${rowIndex + 1}-${col + 1}`,
        x: position.x,
        y: position.y,
        width: panelWidth,
        height: panelHeight,
        charge: false,
      });
    }
  });
  return rows;
}

function buildPanelPositions(width, height, panelWidth, panelHeight) {
  const yPositions = [PANEL_TOP, PANEL_TOP + 16, PANEL_TOP + 32];
  const xPositions = [
    PANEL_LEFT,
    Math.max(PANEL_LEFT + 20, Math.round(width * 0.2)),
    Math.max(PANEL_LEFT + 40, Math.round(width * 0.38)),
    Math.max(PANEL_LEFT + 60, Math.round(width * 0.56)),
    Math.max(PANEL_LEFT + 80, Math.round(width * 0.72)),
  ];
  return yPositions.flatMap((y, rowIndex) =>
    xPositions.map((x, colIndex) => ({
      x: clamp(
        x + (rowIndex === 1 ? 12 : rowIndex === 2 ? -8 : 0) + (colIndex % 2 === 0 ? 0 : 6),
        PANEL_LEFT,
        width - panelWidth - PANEL_LEFT
      ),
      y: clamp(y + (colIndex % 3 === 0 ? 0 : 2), PANEL_TOP, height - panelHeight - 60),
    }))
  );
}

function shufflePositions(positions, seed) {
  const items = positions.slice();
  let state = seed || 1;
  for (let i = items.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 *
 * @param previous
 * @param input
 */
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

/**
 *
 * @param input
 * @param keyboard
 * @param gamepad
 */
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
 *
 * @param keyboard
 * @param gamepad
 */
function createActionsFromState(keyboard, gamepad) {
  const actions = {
    left: Boolean(
      keyboard.ArrowLeft ||
        keyboard.a ||
        keyboard.A ||
        isAxisLeft(gamepad.axes[0])
    ),
    right: Boolean(
      keyboard.ArrowRight ||
        keyboard.d ||
        keyboard.D ||
        isAxisRight(gamepad.axes[0])
    ),
    launch: Boolean(
      keyboard.Space || keyboard[' '] || keyboard.Button0 || gamepad.buttons[0]
    ),
    pause: Boolean(
      keyboard.p || keyboard.P || keyboard.Button9 || gamepad.buttons[9]
    ),
    reset: Boolean(
      keyboard.r || keyboard.R || keyboard.Button8 || gamepad.buttons[8]
    ),
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

/**
 *
 * @param value
 */
function isAxisLeft(value) {
  return Number(value) < -EDGE_THRESHOLD;
}

/**
 *
 * @param value
 */
function isAxisRight(value) {
  return Number(value) > EDGE_THRESHOLD;
}

/**
 *
 * @param state
 * @param inputState
 */
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

/**
 *
 * @param state
 * @param actions
 */
function movePaddle(state, actions) {
  const delta = (actions.right ? 1 : 0) - (actions.left ? 1 : 0);
  state.paddle.x = Math.round(
    clamp(
      state.paddle.x + delta * state.paddle.speed,
      0,
      state.width - state.paddle.width
    )
  );
}

/**
 *
 * @param state
 */
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

/**
 *
 * @param state
 */
function stickOrbToPaddle(state) {
  state.orb.x = state.paddle.x + Math.round(state.paddle.width / 2);
  state.orb.y = state.paddle.y - state.orb.radius - 1;
}

/**
 *
 * @param state
 */
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

/**
 *
 * @param state
 */
function resolvePaddle(state) {
  const paddle = state.paddle;
  const orb = state.orb;
  const withinHorizontal =
    orb.x + orb.radius >= paddle.x &&
    orb.x - orb.radius <= paddle.x + paddle.width;
  const withinVertical =
    orb.y + orb.radius >= paddle.y &&
    orb.y + orb.radius <= paddle.y + paddle.height + 6;
  if (orb.vy > 0 && withinHorizontal && withinVertical) {
    const hitOffset =
      (orb.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2 || 1);
    orb.y = paddle.y - orb.radius - 1;
    orb.vy = -Math.abs(orb.vy);
    orb.vx = clamp(orb.vx + hitOffset * 2, -5, 5) || DEFAULT_ORB_SPEED_X;
  }
}

/**
 *
 * @param state
 */
function resolvePanels(state) {
  for (const panel of state.panels) {
    if (panel.charge) {
      continue;
    }
    if (circleIntersectsPanel(state.orb, panel)) {
      const collisionAxis = getPanelCollisionAxis(state.orb, panel);
      separateOrbFromPanel(state.orb, panel, collisionAxis);
      panel.charge = true;
      state.score += 1;
      reflectOrbVelocityFromPanel(state.orb, collisionAxis);
      break;
    }
  }
}

/**
 *
 * @param orb
 * @param panel
 */
function getPanelCollisionAxis(orb, panel) {
  const panelCenterX = panel.x + panel.width / 2;
  const panelCenterY = panel.y + panel.height / 2;
  const dx = orb.x - panelCenterX;
  const dy = orb.y - panelCenterY;
  const overlapX = orb.radius + panel.width / 2 - Math.abs(dx);
  const overlapY = orb.radius + panel.height / 2 - Math.abs(dy);

  return overlapX < overlapY ? 'x' : 'y';
}

/**
 *
 * @param orb
 * @param panel
 * @param collisionAxis
 */
function separateOrbFromPanel(orb, panel, collisionAxis) {
  const panelCenterX = panel.x + panel.width / 2;
  const panelCenterY = panel.y + panel.height / 2;
  const dx = orb.x - panelCenterX;
  const dy = orb.y - panelCenterY;

  if (collisionAxis === 'x') {
    orb.x =
      panelCenterX + Math.sign(dx || 1) * (panel.width / 2 + orb.radius + 0.5);
    return;
  }

  orb.y =
    panelCenterY + Math.sign(dy || 1) * (panel.height / 2 + orb.radius + 0.5);
}

/**
 *
 * @param orb
 * @param collisionAxis
 */
function reflectOrbVelocityFromPanel(orb, collisionAxis) {
  if (collisionAxis === 'x') {
    orb.vx = -orb.vx;
    return;
  }

  orb.vy = -orb.vy;
}

/**
 *
 * @param orb
 * @param panel
 */
function circleIntersectsPanel(orb, panel) {
  const closestX = clamp(orb.x, panel.x, panel.x + panel.width);
  const closestY = clamp(orb.y, panel.y, panel.y + panel.height);
  const dx = orb.x - closestX;
  const dy = orb.y - closestY;
  return dx * dx + dy * dy <= orb.radius * orb.radius;
}

/**
 *
 * @param state
 */
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

/**
 *
 * @param state
 */
function resolveWinLoss(state) {
  if (state.panels.every(panel => panel.charge)) {
    state.status = 'won';
  }
  if (state.lives <= 0) {
    state.status = 'lost';
  }
}

/**
 *
 * @param state
 */
function resetOrbToPaddle(state) {
  state.status = 'ready';
  state.orb.stuckToPaddle = true;
  state.orb.vx = DEFAULT_ORB_SPEED_X;
  state.orb.vy = DEFAULT_ORB_SPEED_Y;
  stickOrbToPaddle(state);
}

/**
 *
 * @param value
 * @param min
 * @param max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 *
 * @param state
 */
function toCanvasPayload(state) {
  const shapes = [
    {
      type: 'rect',
      x: 0,
      y: 0,
      width: state.width,
      height: state.height,
      fill: '#0b1220',
    },
    {
      type: 'rect',
      x: 14,
      y: 14,
      width: state.width - 28,
      height: state.height - 28,
      fill: '#10233f',
    },
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

/**
 *
 * @param storage
 * @param state
 */
function persistState(storage, state) {
  storage?.({ [STORAGE_KEY]: state });
}
// jscpd:ignore-end
