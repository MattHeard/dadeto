// @ts-nocheck
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
 * Solar Paddle.
 * @param {unknown} input Parameter.
 * @param {unknown} env Parameter.
 * @returns {unknown} Return value.
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
 * Get Storage Accessor.
 * @param {unknown} env Parameter.
 * @returns {unknown} Return value.
 */
function getStorageAccessor(env) {
  if (!env || typeof env.get !== 'function') {
    return null;
  }

  const setter = env.get('setLocalPermanentData');
  return typeof setter === 'function' ? setter : null;
}

/**
 * Read the persisted paddle state from storage.
 * @param {unknown} storage Storage accessor.
 * @returns {unknown} Normalized persisted state or null.
 */
function readPersistedState(storage) {
  if (!storage) {
    return null;
  }

  const stored = storage({});
  return normalizeState(stored?.[STORAGE_KEY]);
}

/**
 * Parse an input payload string into a record.
 * @param {unknown} input Input payload.
 * @returns {unknown} Parsed record or null.
 */
function parseInput(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    return null;
  }

  return parseObjectRecord(input);
}

/**
 * Parse an object-like JSON value.
 * @param {unknown} value Raw JSON input.
 * @returns {unknown} Parsed record or null.
 */
function parseObjectRecord(value) {
  const parsed = parseJsonOrNull(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return /** @type {Record<string, unknown>} */ (parsed);
  }

  return null;
}

/**
 * Build the next simulation state.
 * @param {unknown} persisted Persisted state.
 * @param {unknown} input Parsed input.
 * @returns {unknown} Next state.
 */
function buildNextState(persisted, input) {
  const seed = createSeedState(input, persisted);
  const base = persisted || seed;
  const shouldReset = input?.reset === true || !persisted;
  const merged = shouldReset ? seed : mergeSeedAndState(base, seed);
  const inputState = updateInputState(base.input, input);
  const withInput = finalizeNextState(merged, base.frame, inputState);

  if (inputState.edgeActions.resetPressed) {
    return createResetSeedState(input, persisted);
  }

  return withInput;
}

/**
 * Finalize the next state after merging and input updates.
 * @param {PaddleState} merged Merged base state.
 * @param {number} frame Previous frame number.
 * @param {PaddleInputState} inputState Updated input state.
 * @returns {PaddleState} Finalized next state.
 */
function finalizeNextState(merged, frame, inputState) {
  const withInput = {
    ...merged,
    input: inputState,
    frame: frame + 1,
  };

  applyGameplayInput(withInput, inputState);
  if (withInput.status === 'running') {
    stepSimulation(withInput);
  }
  return withInput;
}

/**
 * Build the reset seed state after a reset press.
 * @param {unknown} input Parsed input.
 * @param {PaddleState | null} persisted Persisted state.
 * @returns {unknown} Reset seed state.
 */
function createResetSeedState(input, persisted) {
  const layoutSeed = (persisted?.layoutSeed ?? 0) + 1;
  const fallback = persisted
    ? {
        width: persisted.width,
        height: persisted.height,
        lives: persisted.lives,
        layoutSeed: persisted.layoutSeed,
      }
    : undefined;
  return createSeedState({ ...input, layoutSeed }, fallback);
}

/**
 * Merge seed values into an existing state.
 * @param {unknown} base Existing state.
 * @param {unknown} seed Seed state.
 * @returns {unknown} Merged state.
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
 * Create a new seed state from input and fallback values.
 * @param {unknown} input Input values.
 * @param {unknown} fallback Fallback values.
 * @returns {unknown} Seed state.
 */
function createSeedState(input, fallback) {
  const defaults = createSeedDefaults();
  const seed = normalizeSeedValues(input, fallback, defaults);
  return createState({
    width: seed.width,
    height: seed.height,
    paddleWidth: seed.paddleWidth,
    paddleHeight: seed.paddleHeight,
    paddleSpeed: seed.paddleSpeed,
    orbRadius: seed.orbRadius,
    orbSpeedX: seed.orbSpeedX,
    orbSpeedY: seed.orbSpeedY,
    layoutSeed: seed.layoutSeed,
    lives: seed.lives,
    panels: normalizePanels(seed.width, seed.height, seed.layoutSeed),
  });
}

/**
 * Normalize seed values from input and fallback state.
 * @param {unknown} input Input values.
 * @param {unknown} fallback Fallback values.
 * @param {ReturnType<typeof createSeedDefaults>} defaults Seed defaults.
 * @returns {{
 *   width: number,
 *   height: number,
 *   paddleWidth: number,
 *   paddleHeight: number,
 *   paddleSpeed: number,
 *   orbRadius: number,
 *   orbSpeedX: number,
 *   orbSpeedY: number,
 *   layoutSeed: number,
 *   lives: number,
 * }} Normalized seed values.
 */
function normalizeSeedValues(input, fallback, defaults) {
  return {
    width: normalizePositiveInteger(input?.width, defaults.width(fallback)),
    height: normalizePositiveInteger(input?.height, defaults.height(fallback)),
    paddleWidth: normalizePositiveInteger(
      input?.paddleWidth,
      defaults.paddleWidth
    ),
    paddleHeight: normalizePositiveInteger(
      input?.paddleHeight,
      defaults.paddleHeight
    ),
    paddleSpeed: normalizePositiveInteger(
      input?.paddleSpeed,
      defaults.paddleSpeed
    ),
    orbRadius: normalizePositiveInteger(input?.orbRadius, defaults.orbRadius),
    orbSpeedX: normalizeNumber(input?.orbSpeedX, defaults.orbSpeedX),
    orbSpeedY: normalizeNumber(input?.orbSpeedY, defaults.orbSpeedY),
    layoutSeed: normalizePositiveInteger(
      input?.layoutSeed,
      defaults.layoutSeed(fallback)
    ),
    lives: normalizePositiveInteger(input?.lives, defaults.lives(fallback)),
  };
}

/**
 * Build seed defaults and fallback resolvers.
 * @returns {{
 *   width: (fallback: unknown) => number,
 *   height: (fallback: unknown) => number,
 *   paddleWidth: number,
 *   paddleHeight: number,
 *   paddleSpeed: number,
 *   orbRadius: number,
 *   orbSpeedX: number,
 *   orbSpeedY: number,
 *   layoutSeed: (fallback: unknown) => number,
 *   lives: (fallback: unknown) => number,
 * }} Seed defaults.
 */
function createSeedDefaults() {
  return {
    width: fallback => fallback?.width ?? DEFAULT_WIDTH,
    height: fallback => fallback?.height ?? DEFAULT_HEIGHT,
    paddleWidth: DEFAULT_PADDLE_WIDTH,
    paddleHeight: DEFAULT_PADDLE_HEIGHT,
    paddleSpeed: DEFAULT_PADDLE_SPEED,
    orbRadius: DEFAULT_ORB_RADIUS,
    orbSpeedX: DEFAULT_ORB_SPEED_X,
    orbSpeedY: DEFAULT_ORB_SPEED_Y,
    layoutSeed: fallback => fallback?.layoutSeed ?? 1,
    lives: fallback => fallback?.lives ?? DEFAULT_LIVES,
  };
}

/**
 * Create an initial runtime state object.
 * @param {unknown} options State options.
 * @returns {unknown} New state.
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
 * Create the initial input state.
 * @returns {PaddleInputState} Initial input state.
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
 * Normalize a persisted state value.
 * @param {unknown} value Raw persisted value.
 * @returns {PaddleState | null} Normalized state or null.
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
 * Normalize a persisted status field.
 * @param {unknown} value Raw status value.
 * @returns {PaddleState['status']} Normalized status.
 */
function normalizeStatus(value) {
  return ['ready', 'running', 'paused', 'won', 'lost'].includes(value)
    ? /** @type {PaddleState['status']} */ (value)
    : 'ready';
}

/**
 * Normalize the input state container.
 * @param {unknown} value Raw input state.
 * @returns {PaddleInputState} Normalized input state.
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
 * Normalize a record of booleans.
 * @param {unknown} value Raw boolean record.
 * @returns {Record<string, boolean>} Boolean record.
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
 * Normalize browser gamepad state.
 * @param {unknown} value Raw gamepad state.
 * @returns {PaddleGamepadState} Normalized gamepad state.
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
 * Normalize action flags.
 * @param {unknown} value Raw actions.
 * @returns {PaddleActions} Normalized actions.
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
 * Normalize edge-trigger action flags.
 * @param {unknown} value Raw edge actions.
 * @returns {PaddleEdgeActions} Normalized edge actions.
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
 * Normalize a paddle record.
 * @param {unknown} value Raw paddle state.
 * @param {number} height Current board height.
 * @returns {PaddleState['paddle']} Normalized paddle.
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
 * Normalize a non-negative integer, falling back when invalid.
 * @param {unknown} value Raw numeric value.
 * @param {number} fallback Fallback value.
 * @returns {number} Rounded non-negative integer.
 */
function normalizeNonNegativeInteger(value, fallback) {
  const next = Number(value);
  if (Number.isFinite(next) && next >= 0) {
    return Math.round(next);
  }

  return fallback;
}

/**
 * Normalize an orb record.
 * @param {unknown} value Raw orb state.
 * @returns {PaddleState['orb']} Normalized orb.
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
 * Normalize a floating-point number with a fallback.
 * @param {unknown} value Raw numeric value.
 * @param {number} fallback Fallback value.
 * @returns {number} Normalized number.
 */
function normalizeNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) && next !== 0 ? next : fallback;
}

/**
 * Provide the default seed options.
 * @returns {{
 *   width: number,
 *   height: number,
 *   paddleWidth: number,
 *   paddleHeight: number,
 *   paddleSpeed: number,
 *   orbRadius: number,
 *   orbSpeedX: number,
 *   orbSpeedY: number,
 * }} Default seed options.
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
 * Normalize persisted panels.
 * @param {unknown} value Raw panel state.
 * @returns {PaddlePanel[]} Normalized panels.
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
 * Normalize panel layout for a board.
 * @param {number} width Board width.
 * @param {number} height Board height.
 * @param {number} seed Layout seed.
 * @returns {PaddlePanel[]} Generated panels.
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

/**
 * Build candidate panel positions for a board.
 * @param {number} width Board width.
 * @param {number} height Board height.
 * @param {number} panelWidth Panel width.
 * @param {number} panelHeight Panel height.
 * @returns {Array<{ x: number, y: number }>} Position candidates.
 */
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
    xPositions.map((x, colIndex) => {
      let rowOffset = 0;
      if (rowIndex === 1) {
        rowOffset = 12;
      } else if (rowIndex === 2) {
        rowOffset = -8;
      }

      return {
        x: clamp(
          x + rowOffset + (colIndex % 2 === 0 ? 0 : 6),
          PANEL_LEFT,
          width - panelWidth - PANEL_LEFT
        ),
        y: clamp(
          y + (colIndex % 3 === 0 ? 0 : 2),
          PANEL_TOP,
          height - panelHeight - 60
        ),
      };
    })
  );
}

/**
 * Shuffle positions with a seeded generator.
 * @param {Array<{ x: number, y: number }>} positions Positions to shuffle.
 * @param {number} seed Shuffle seed.
 * @returns {Array<{ x: number, y: number }>} Shuffled positions.
 */
function shufflePositions(positions, seed) {
  const items = positions.slice();
  let state = Math.max(1, seed);
  for (let i = items.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Update the input state from new input.
 * @param {PaddleInputState | undefined} previous Previous input state.
 * @param {unknown} input Incoming input.
 * @returns {PaddleInputState} Updated input state.
 */
function updateInputState(previous, input) {
  const nextKeyboard = { ...previous?.keyboard };
  const nextGamepad = normalizeGamepadState(previous?.gamepad);
  const nextActions = deriveActions(input, nextKeyboard, nextGamepad);
  const previousActions = normalizeActions(previous?.actions);
  return {
    keyboard: nextKeyboard,
    gamepad: nextGamepad,
    actions: nextActions.actions,
    edgeActions: createEdgeActions(nextActions.actions, previousActions),
    previousActions,
  };
}

/**
 * Create edge actions from current and previous action states.
 * @param {PaddleActions} actions Current actions.
 * @param {PaddleActions} previousActions Previous actions.
 * @returns {PaddleEdgeActions} Edge actions.
 */
function createEdgeActions(actions, previousActions) {
  return {
    left: actions.left && !previousActions.left,
    right: actions.right && !previousActions.right,
    launchPressed: actions.launch && !previousActions.launch,
    pausePressed: actions.pause && !previousActions.pause,
    resetPressed: actions.reset && !previousActions.reset,
  };
}

/**
 * Derive actions from keyboard and gamepad state.
 * @param {unknown} input Incoming input.
 * @param {Record<string, boolean>} keyboard Keyboard state.
 * @param {PaddleGamepadState} gamepad Gamepad state.
 * @returns {{ actions: PaddleActions, edgeActions: PaddleEdgeActions }} Derived actions.
 */
function deriveActions(input, keyboard, gamepad) {
  applyKeyboardInput(input, keyboard);
  applyGamepadInput(input, gamepad);
  return createActionsFromState(keyboard, gamepad);
}

/**
 * Apply keyboard-specific input events.
 * @param {unknown} input Incoming input.
 * @param {Record<string, boolean>} keyboard Keyboard state.
 * @returns {void}
 */
function applyKeyboardInput(input, keyboard) {
  if (input?.type === 'keydown' && typeof input.key === 'string') {
    keyboard[input.key] = true;
  }
  if (input?.type === 'keyup' && typeof input.key === 'string') {
    keyboard[input.key] = false;
  }
}

/**
 * Apply gamepad-specific input events.
 * @param {unknown} input Incoming input.
 * @param {PaddleGamepadState} gamepad Gamepad state.
 * @returns {void}
 */
function applyGamepadInput(input, gamepad) {
  if (Array.isArray(input?.buttons)) {
    gamepad.buttons = input.buttons.map(next => next === true);
  }
  if (Array.isArray(input?.axes)) {
    gamepad.axes = input.axes.map(next => Number(next) || 0);
  }
  if (typeof input?.buttonIndex === 'number') {
    gamepad.buttons[input.buttonIndex] = input.pressed === true;
  }
}

/**
 * Create actions from normalized controller state.
 * @param {Record<string, boolean>} keyboard Keyboard state.
 * @param {PaddleGamepadState} gamepad Gamepad state.
 * @returns {{ actions: PaddleActions, edgeActions: PaddleEdgeActions }} Actions and edge actions.
 */
function createActionsFromState(keyboard, gamepad) {
  const actions = {
    left: isLeftActionPressed(keyboard, gamepad),
    right: isRightActionPressed(keyboard, gamepad),
    launch: isLaunchActionPressed(keyboard, gamepad),
    pause: isPauseActionPressed(keyboard, gamepad),
    reset: isResetActionPressed(keyboard, gamepad),
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
 * Determine whether the left action is pressed.
 * @param {Record<string, boolean>} keyboard Keyboard state.
 * @param {PaddleGamepadState} gamepad Gamepad state.
 * @returns {boolean} True when left is pressed.
 */
function isLeftActionPressed(keyboard, gamepad) {
  return Boolean(
    keyboard.ArrowLeft ||
      keyboard.a ||
      keyboard.A ||
      isAxisLeft(gamepad.axes[0])
  );
}

/**
 * Determine whether the right action is pressed.
 * @param {Record<string, boolean>} keyboard Keyboard state.
 * @param {PaddleGamepadState} gamepad Gamepad state.
 * @returns {boolean} True when right is pressed.
 */
function isRightActionPressed(keyboard, gamepad) {
  return Boolean(
    keyboard.ArrowRight ||
      keyboard.d ||
      keyboard.D ||
      isAxisRight(gamepad.axes[0])
  );
}

/**
 * Determine whether the launch action is pressed.
 * @param {Record<string, boolean>} keyboard Keyboard state.
 * @param {PaddleGamepadState} gamepad Gamepad state.
 * @returns {boolean} True when launch is pressed.
 */
function isLaunchActionPressed(keyboard, gamepad) {
  return Boolean(
    keyboard.Space || keyboard[' '] || keyboard.Button0 || gamepad.buttons[0]
  );
}

/**
 * Determine whether the pause action is pressed.
 * @param {Record<string, boolean>} keyboard Keyboard state.
 * @param {PaddleGamepadState} gamepad Gamepad state.
 * @returns {boolean} True when pause is pressed.
 */
function isPauseActionPressed(keyboard, gamepad) {
  return Boolean(
    keyboard.p || keyboard.P || keyboard.Button9 || gamepad.buttons[9]
  );
}

/**
 * Determine whether the reset action is pressed.
 * @param {Record<string, boolean>} keyboard Keyboard state.
 * @param {PaddleGamepadState} gamepad Gamepad state.
 * @returns {boolean} True when reset is pressed.
 */
function isResetActionPressed(keyboard, gamepad) {
  return Boolean(
    keyboard.r || keyboard.R || keyboard.Button8 || gamepad.buttons[8]
  );
}

/**
 * Determine whether a value belongs on the left axis.
 * @param {unknown} value Axis value.
 * @returns {boolean} True when the value is leftward.
 */
function isAxisLeft(value) {
  return Number(value) < -EDGE_THRESHOLD;
}

/**
 * Determine whether a value belongs on the right axis.
 * @param {unknown} value Axis value.
 * @returns {boolean} True when the value is rightward.
 */
function isAxisRight(value) {
  return Number(value) > EDGE_THRESHOLD;
}

/**
 * Apply a gameplay input step to the current state.
 * @param {PaddleState} state Current state.
 * @param {PaddleInputState} inputState Current input state.
 * @returns {void}
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
 * Move the paddle according to current actions.
 * @param {PaddleState} state Current state.
 * @param {PaddleActions} actions Current actions.
 * @returns {void}
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
 * Advance the simulation by one tick.
 * @param {PaddleState} state Current state.
 * @returns {void}
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
 * Stick the orb to the paddle.
 * @param {PaddleState} state Current state.
 * @returns {void}
 */
function stickOrbToPaddle(state) {
  state.orb.x = state.paddle.x + Math.round(state.paddle.width / 2);
  state.orb.y = state.paddle.y - state.orb.radius - 1;
}

/**
 * Resolve wall collisions.
 * @param {PaddleState} state Current state.
 * @returns {void}
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
 * Resolve paddle collisions.
 * @param {PaddleState} state Current state.
 * @returns {void}
 */
export function resolvePaddle(state) {
  const paddle = state.paddle;
  const orb = state.orb;
  const halfWidth = Math.max(1, paddle.width / 2);
  const withinHorizontal =
    orb.x + orb.radius >= paddle.x &&
    orb.x - orb.radius <= paddle.x + paddle.width;
  const withinVertical =
    orb.y + orb.radius >= paddle.y &&
    orb.y + orb.radius <= paddle.y + paddle.height + 6;
  if (orb.vy > 0 && withinHorizontal && withinVertical) {
    const hitOffset = (orb.x - (paddle.x + halfWidth)) / halfWidth;
    orb.y = paddle.y - orb.radius - 1;
    orb.vy = -Math.abs(orb.vy);
    orb.vx = clamp(orb.vx + hitOffset * 2, -5, 5) || DEFAULT_ORB_SPEED_X;
  }
}

/**
 * Resolve panel collisions.
 * @param {PaddleState} state Current state.
 * @returns {void}
 */
function resolvePanels(state) {
  for (const panel of state.panels) {
    if (!panel.charge && circleIntersectsPanel(state.orb, panel)) {
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
 * Determine the primary collision axis for an orb and panel.
 * @param {PaddleOrb} orb Orb state.
 * @param {PaddlePanel} panel Panel state.
 * @returns {'x' | 'y'} Collision axis.
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
 * Separate an orb from a panel after a collision.
 * @param {PaddleOrb} orb Orb state.
 * @param {PaddlePanel} panel Panel state.
 * @param {'x' | 'y'} collisionAxis Collision axis.
 * @returns {void}
 */
export function separateOrbFromPanel(orb, panel, collisionAxis) {
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
 * Reflect orb velocity after a panel collision.
 * @param {PaddleOrb} orb Orb state.
 * @param {'x' | 'y'} collisionAxis Collision axis.
 * @returns {void}
 */
export function reflectOrbVelocityFromPanel(orb, collisionAxis) {
  if (collisionAxis === 'x') {
    orb.vx = -orb.vx;
    return;
  }

  orb.vy = -orb.vy;
}

/**
 * Test whether an orb intersects a panel.
 * @param {PaddleOrb} orb Orb state.
 * @param {PaddlePanel} panel Panel state.
 * @returns {boolean} True when the orb intersects the panel.
 */
function circleIntersectsPanel(orb, panel) {
  const closestX = clamp(orb.x, panel.x, panel.x + panel.width);
  const closestY = clamp(orb.y, panel.y, panel.y + panel.height);
  const dx = orb.x - closestX;
  const dy = orb.y - closestY;
  return dx * dx + dy * dy <= orb.radius * orb.radius;
}

/**
 * Resolve the orb falling below the board.
 * @param {PaddleState} state Current state.
 * @returns {void}
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
 * Resolve win/loss transitions.
 * @param {PaddleState} state Current state.
 * @returns {void}
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
 * Reset the orb to the paddle after a loss.
 * @param {PaddleState} state Current state.
 * @returns {void}
 */
function resetOrbToPaddle(state) {
  state.status = 'ready';
  state.orb.stuckToPaddle = true;
  state.orb.vx = DEFAULT_ORB_SPEED_X;
  state.orb.vy = DEFAULT_ORB_SPEED_Y;
  stickOrbToPaddle(state);
}

/**
 * Clamp a value within a range.
 * @param {number} value Value to clamp.
 * @param {number} min Minimum value.
 * @param {number} max Maximum value.
 * @returns {number} Clamped value.
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Convert the current state into a canvas payload.
 * @param {PaddleState} state Current state.
 * @returns {{ width: number, height: number, shapes: Array<Record<string, unknown>> }} Canvas payload.
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
 * Persist the current state.
 * @param {unknown} storage Storage accessor.
 * @param {PaddleState} state Current state.
 * @returns {void}
 */
function persistState(storage, state) {
  storage?.({ [STORAGE_KEY]: state });
}
