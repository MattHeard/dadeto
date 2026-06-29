// @ts-nocheck
import { parseJsonOrNull } from '../../../commonCore.js';
import { normalizePositiveInteger } from '../../common.js';

const STORAGE_KEY = 'BATT4';
const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 240;
const DEFAULT_PADDLE_WIDTH = 48;
const DEFAULT_PADDLE_HEIGHT = 6;
const DEFAULT_PADDLE_SPEED = 4;
const DEFAULT_ORB_RADIUS = 4;
const DEFAULT_ORB_SPEED_X = 1;
const DEFAULT_ORB_SPEED_Y = -2;
const DEFAULT_LIVES = 3;
const DEFAULT_MAX_FAULTS = 3;
const DEFAULT_CELL_TARGET = 2;
const DEFAULT_CELL_MAX = 3;
const DEFAULT_OVERCHARGE_COOLDOWN = 120;
const CELL_TOP = 32;
const CELL_LEFT = 34;
const PADDLE_Y_OFFSET = 18;
const EDGE_THRESHOLD = 0.4;

/**
 * @typedef {{ moveLeft: boolean, moveRight: boolean, launchPressed: boolean, pausePressed: boolean, resetPressed: boolean }} BatteryActions
 * @typedef {{ keyboard: Record<string, boolean>, gamepad: BatteryGamepadState, actions: BatteryActions, previousActions: BatteryActions }} BatteryInputState
 * @typedef {{ buttons: boolean[], axes: number[] }} BatteryGamepadState
 * @typedef {{ id: string, x: number, y: number, width: number, height: number, charge: number, targetCharge: number, maxCharge: number, overchargeCooldown: number, state: 'empty' | 'charging' | 'stable' | 'overcharged' }} BatteryCell
 * @typedef {{ x: number, y: number, vx: number, vy: number, radius: number, stuckToPaddle: boolean }} BatteryOrb
 * @typedef {{ version: 1, width: number, height: number, frame: number, status: 'ready' | 'running' | 'paused' | 'won' | 'lost', score: number, lives: number, faults: number, input: BatteryInputState, paddle: { x: number, y: number, width: number, height: number, speed: number }, orb: BatteryOrb, cells: BatteryCell[] }} BatteryState
 */

/**
 * Battery Breakout.
 * @param {unknown} input Parameter.
 * @param {unknown} env Parameter.
 * @returns {unknown} Return value.
 */
export function batteryBreakout(input, env) {
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
  if (!env || typeof env.get !== 'function') return null;
  const setter = env.get('setLocalPermanentData');
  return typeof setter === 'function' ? setter : null;
}

/**
 * Read Persisted State.
 * @param {unknown} storage Parameter.
 * @returns {unknown} Return value.
 */
function readPersistedState(storage) {
  if (!storage) return null;
  const stored = storage({});
  return normalizeState(stored?.[STORAGE_KEY]);
}

/**
 * Parse Input.
 * @param {unknown} input Parameter.
 * @returns {unknown} Return value.
 */
function parseInput(input) {
  if (typeof input !== 'string' || input.trim() === '') return null;
  return parseObjectRecord(input);
}

/**
 * Parse Object Record.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function parseObjectRecord(value) {
  const parsed = parseJsonOrNull(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed;
  }
  return null;
}

/**
 * Build Next State.
 * @param {unknown} persisted Parameter.
 * @param {unknown} input Parameter.
 * @returns {unknown} Return value.
 */
export function buildNextState(persisted, input) {
  const seed = createSeedState(input, persisted);
  const base = persisted || seed;
  const shouldReset = input?.reset === true || !persisted;
  const merged = shouldReset ? seed : mergeSeedAndState(base, seed);
  const inputState = updateInputState(base.input, input);
  if (
    inputState.actions.resetPressed &&
    !inputState.previousActions.resetPressed
  ) {
    const resetState = createSeedState(
      {
        ...input,
        layoutSeed: (persisted?.layoutSeed ?? 0) + 1,
      },
      persisted
        ? {
            width: persisted.width,
            height: persisted.height,
            layoutSeed: persisted.layoutSeed,
          }
        : undefined
    );
    resetState.input = inputState;
    return resetState;
  }
  const withInput = { ...merged, input: inputState, frame: base.frame + 1 };
  applyGameplayInput(withInput, inputState);
  if (withInput.status === 'running') stepSimulation(withInput);
  return withInput;
}

/**
 * Merge Seed And State.
 * @param {unknown} base Parameter.
 * @param {unknown} seed Parameter.
 * @returns {unknown} Return value.
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
    orb: { ...base.orb, radius: DEFAULT_ORB_RADIUS },
    cells: base.cells,
  };
}

/**
 * Create Seed State.
 * @param {unknown} input Parameter.
 * @param {unknown} fallback Parameter.
 * @returns {unknown} Return value.
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
    faults: normalizePositiveInteger(input?.faults, 0),
    cells: normalizeCells(width, height, layoutSeed),
  });
}

/**
 * Create State.
 * @param {unknown} options Parameter.
 * @returns {unknown} Return value.
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
    faults: options.faults,
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
    cells: options.cells,
  };
}

/**
 * Create Initial Input State.
 * @returns {unknown} Return value.
 */
function createInitialInputState() {
  return {
    keyboard: {},
    gamepad: { buttons: [], axes: [] },
    actions: {
      moveLeft: false,
      moveRight: false,
      launchPressed: false,
      pausePressed: false,
      resetPressed: false,
    },
    previousActions: {
      moveLeft: false,
      moveRight: false,
      launchPressed: false,
      pausePressed: false,
      resetPressed: false,
    },
  };
}

/**
 * Normalize State.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function normalizeState(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value.version !== 1
  )
    return null;
  const candidate = value;
  return {
    version: 1,
    width: normalizePositiveInteger(candidate.width, DEFAULT_WIDTH),
    height: normalizePositiveInteger(candidate.height, DEFAULT_HEIGHT),
    frame: normalizePositiveInteger(candidate.frame, 0),
    status: normalizeStatus(candidate.status),
    score: normalizePositiveInteger(candidate.score, 0),
    lives: normalizePositiveInteger(candidate.lives, DEFAULT_LIVES),
    faults: normalizePositiveInteger(candidate.faults, 0),
    layoutSeed: normalizePositiveInteger(candidate.layoutSeed, 1),
    input: normalizeInputState(candidate.input),
    paddle: normalizePaddle(candidate.paddle, candidate.height),
    orb: normalizeOrb(candidate.orb),
    cells: normalizeCellsFromState(candidate.cells),
  };
}

/**
 * Normalize Status.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function normalizeStatus(value) {
  return ['ready', 'running', 'paused', 'won', 'lost'].includes(value)
    ? value
    : 'ready';
}

/**
 * Normalize Input State.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function normalizeInputState(value) {
  return {
    keyboard: normalizeBooleanRecord(value?.keyboard),
    gamepad: normalizeGamepadState(value?.gamepad),
    actions: normalizeActions(value?.actions),
    previousActions: normalizeActions(value?.previousActions),
  };
}

/**
 * Normalize Boolean Record.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function normalizeBooleanRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, next]) => [key, next === true])
  );
}

/**
 * Normalize Gamepad State.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function normalizeGamepadState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { buttons: [], axes: [] };
  return {
    buttons: Array.isArray(value.buttons)
      ? value.buttons.map(next => next === true)
      : [],
    axes: Array.isArray(value.axes)
      ? value.axes.map(next => Number(next) || 0)
      : [],
  };
}

/**
 * Normalize Actions.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function normalizeActions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      moveLeft: false,
      moveRight: false,
      launchPressed: false,
      pausePressed: false,
      resetPressed: false,
    };
  }
  return {
    moveLeft: value.moveLeft === true,
    moveRight: value.moveRight === true,
    launchPressed: value.launchPressed === true,
    pausePressed: value.pausePressed === true,
    resetPressed: value.resetPressed === true,
  };
}

/**
 * Normalize Paddle.
 * @param {unknown} value Parameter.
 * @param {unknown} height Parameter.
 * @returns {unknown} Return value.
 */
function normalizePaddle(value, height) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return createState(createSeedOptions()).paddle;
  const seed = createSeedOptions();
  return {
    x: normalizeNonNegativeInteger(value.x, seed.width / 2),
    y: Math.max(0, normalizePositiveInteger(value.y, height - PADDLE_Y_OFFSET)),
    width: normalizePositiveInteger(value.width, DEFAULT_PADDLE_WIDTH),
    height: normalizePositiveInteger(value.height, DEFAULT_PADDLE_HEIGHT),
    speed: normalizePositiveInteger(value.speed, DEFAULT_PADDLE_SPEED),
  };
}

/**
 * Normalize Non Negative Integer.
 * @param {unknown} value Parameter.
 * @param {unknown} fallback Parameter.
 * @returns {unknown} Return value.
 */
function normalizeNonNegativeInteger(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? Math.round(next) : fallback;
}

/**
 * Normalize Orb.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function normalizeOrb(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return createState(createSeedOptions()).orb;
  return {
    x: Number(value.x) || Math.round(DEFAULT_WIDTH / 2),
    y: Number(value.y) || 0,
    vx: normalizeNumber(value.vx, DEFAULT_ORB_SPEED_X),
    vy: normalizeNumber(value.vy, DEFAULT_ORB_SPEED_Y),
    radius: normalizePositiveInteger(value.radius, DEFAULT_ORB_RADIUS),
    stuckToPaddle: value.stuckToPaddle === true,
  };
}

/**
 * Normalize Number.
 * @param {unknown} value Parameter.
 * @param {unknown} fallback Parameter.
 * @returns {unknown} Return value.
 */
function normalizeNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) && next !== 0 ? next : fallback;
}

/**
 * Create Seed Options.
 * @returns {unknown} Return value.
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
    faults: 0,
    cells: normalizeCells(DEFAULT_WIDTH, DEFAULT_HEIGHT, 1),
  };
}

/**
 * Normalize Cells From State.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function normalizeCellsFromState(value) {
  if (!Array.isArray(value) || value.length === 0)
    return normalizeCells(DEFAULT_WIDTH, DEFAULT_HEIGHT);
  return value
    .filter(cell => cell && typeof cell === 'object')
    .map((cell, index) => {
      const record = cell;
      const charge = normalizePositiveInteger(record.charge, 0);
      const targetCharge = normalizePositiveInteger(
        record.targetCharge,
        DEFAULT_CELL_TARGET
      );
      const maxCharge = normalizePositiveInteger(
        record.maxCharge,
        DEFAULT_CELL_MAX
      );
      return {
        id: typeof record.id === 'string' ? record.id : `cell-${index + 1}`,
        x: Number(record.x) || 0,
        y: Number(record.y) || 0,
        width: normalizePositiveInteger(record.width, 20),
        height: normalizePositiveInteger(record.height, 10),
        charge,
        targetCharge,
        maxCharge,
        overchargeCooldown: normalizePositiveInteger(
          record.overchargeCooldown,
          0
        ),
        state: normalizeCellState({
          value: record.state,
          charge,
          targetCharge,
          maxCharge,
          overchargeCooldown: record.overchargeCooldown,
        }),
      };
    });
}

/**
 * Normalize Cell State.
 * @param {{
 *   value: unknown,
 *   charge: number,
 *   targetCharge: number,
 *   maxCharge: number,
 *   overchargeCooldown: number,
 * }} options Normalization inputs.
 * @returns {'empty' | 'charging' | 'stable' | 'overcharged'} Return value.
 */
function normalizeCellState(options) {
  const { value, charge, targetCharge, maxCharge, overchargeCooldown } =
    options;
  if (['empty', 'charging', 'stable', 'overcharged'].includes(value))
    return value;
  if (normalizePositiveInteger(overchargeCooldown, 0) > 0) return 'overcharged';
  if (charge > maxCharge) return 'overcharged';
  if (charge >= targetCharge) return 'stable';
  if (charge > 0) return 'charging';
  return 'empty';
}

/**
 * Normalize Cells.
 * @param {unknown} width Parameter.
 * @param {unknown} height Parameter.
 * @param {unknown} seed Parameter.
 * @returns {unknown} Return value.
 */
function normalizeCells(width, height, seed = 1) {
  const cellWidth = 28;
  const cellHeight = 12;
  const positions = shufflePositions(
    buildCellPositions(width, height, cellWidth, cellHeight),
    seed
  );
  const counts = [2, 4, 3];
  const cells = [];
  let index = 0;
  counts.forEach((count, rowIndex) => {
    for (let col = 0; col < count; col += 1) {
      const position = positions[index++];
      cells.push({
        id: `cell-${rowIndex + 1}-${col + 1}`,
        x: position.x,
        y: position.y,
        width: cellWidth,
        height: cellHeight,
        charge: 0,
        targetCharge: DEFAULT_CELL_TARGET,
        maxCharge: DEFAULT_CELL_MAX,
        overchargeCooldown: 0,
        state: 'empty',
      });
    }
  });
  return cells;
}

/**
 * Build Cell Positions.
 * @param {unknown} width Parameter.
 * @param {unknown} height Parameter.
 * @param {unknown} cellWidth Parameter.
 * @param {unknown} cellHeight Parameter.
 * @returns {unknown} Return value.
 */
function buildCellPositions(width, height, cellWidth, cellHeight) {
  const yPositions = [CELL_TOP, CELL_TOP + 18, CELL_TOP + 36];
  const xPositions = [
    CELL_LEFT,
    Math.max(CELL_LEFT + 18, Math.round(width * 0.18)),
    Math.max(CELL_LEFT + 36, Math.round(width * 0.34)),
    Math.max(CELL_LEFT + 54, Math.round(width * 0.52)),
    Math.max(CELL_LEFT + 72, Math.round(width * 0.68)),
  ];
  return yPositions.flatMap((y, rowIndex) =>
    xPositions.map((x, colIndex) => {
      let rowOffset = 0;
      if (rowIndex === 1) {
        rowOffset = 10;
      } else if (rowIndex === 2) {
        rowOffset = -6;
      }

      return {
        x: clamp(
          x + rowOffset + (colIndex % 2 === 0 ? 0 : 5),
          CELL_LEFT,
          width - cellWidth - CELL_LEFT
        ),
        y: clamp(
          y + (colIndex % 3 === 0 ? 0 : 2),
          CELL_TOP,
          height - cellHeight - 60
        ),
      };
    })
  );
}

/**
 * Shuffle Positions.
 * @param {unknown} positions Parameter.
 * @param {unknown} seed Parameter.
 * @returns {unknown} Return value.
 */
export function shufflePositions(positions, seed) {
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
 * Update Input State.
 * @param {unknown} previous Parameter.
 * @param {unknown} input Parameter.
 * @returns {unknown} Return value.
 */
export function updateInputState(previous, input) {
  const nextKeyboard = { ...(previous?.keyboard || {}) };
  const nextGamepad = normalizeGamepadState(previous?.gamepad);
  const actions = deriveActions(input, nextKeyboard, nextGamepad);
  const previousActions = normalizeActions(previous?.actions);
  return {
    keyboard: nextKeyboard,
    gamepad: nextGamepad,
    actions: actions.actions,
    previousActions,
  };
}

/**
 * Derive Actions.
 * @param {unknown} input Parameter.
 * @param {unknown} keyboard Parameter.
 * @param {unknown} gamepad Parameter.
 * @returns {unknown} Return value.
 */
function deriveActions(input, keyboard, gamepad) {
  if (input?.type === 'keydown' && typeof input.key === 'string')
    keyboard[input.key] = true;
  if (input?.type === 'keyup' && typeof input.key === 'string')
    keyboard[input.key] = false;
  if (input?.type === 'capture' && input.capturing === false)
    return createActionsFromState(keyboard, gamepad);
  if (Array.isArray(input?.buttons))
    gamepad.buttons = input.buttons.map(next => next === true);
  if (Array.isArray(input?.axes))
    gamepad.axes = input.axes.map(next => Number(next) || 0);
  if (typeof input?.buttonIndex === 'number')
    gamepad.buttons[input.buttonIndex] = input.pressed === true;
  return createActionsFromState(keyboard, gamepad);
}

/**
 * Create Actions From State.
 * @param {unknown} keyboard Parameter.
 * @param {unknown} gamepad Parameter.
 * @returns {unknown} Return value.
 */
function createActionsFromState(keyboard, gamepad) {
  const left = Boolean(
    keyboard.ArrowLeft ||
      keyboard.a ||
      keyboard.A ||
      isAxisLeft(gamepad.axes[0])
  );
  const right = Boolean(
    keyboard.ArrowRight ||
      keyboard.d ||
      keyboard.D ||
      isAxisRight(gamepad.axes[0])
  );
  const launchPressed = Boolean(
    keyboard.Space || keyboard[' '] || keyboard.Button0 || gamepad.buttons[0]
  );
  const pausePressed = Boolean(
    keyboard.p || keyboard.P || keyboard.Button9 || gamepad.buttons[9]
  );
  const resetPressed = Boolean(
    keyboard.r || keyboard.R || keyboard.Button8 || gamepad.buttons[8]
  );
  return {
    actions: {
      moveLeft: left,
      moveRight: right,
      launchPressed,
      pausePressed,
      resetPressed,
    },
  };
}

/**
 * Is Axis Left.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function isAxisLeft(value) {
  return Number(value) < -EDGE_THRESHOLD;
}
/**
 * Is Axis Right.
 * @param {unknown} value Parameter.
 * @returns {unknown} Return value.
 */
function isAxisRight(value) {
  return Number(value) > EDGE_THRESHOLD;
}

/**
 * Apply Gameplay Input.
 * @param {unknown} state Parameter.
 * @param {unknown} inputState Parameter.
 */
export function applyGameplayInput(state, inputState) {
  movePaddle(state, inputState.actions);
  if (
    state.status === 'ready' &&
    inputState.actions.launchPressed &&
    !inputState.previousActions.launchPressed
  ) {
    state.status = 'running';
    state.orb.stuckToPaddle = false;
  }
  if (
    inputState.actions.pausePressed &&
    !inputState.previousActions.pausePressed
  ) {
    if (state.status === 'paused') {
      state.status = 'running';
    } else if (state.status === 'running') {
      state.status = 'paused';
    }
  }
  if (state.orb.stuckToPaddle) stickOrbToPaddle(state);
}

/**
 * Move Paddle.
 * @param {unknown} state Parameter.
 * @param {unknown} actions Parameter.
 */
export function movePaddle(state, actions) {
  const delta = (actions.moveRight ? 1 : 0) - (actions.moveLeft ? 1 : 0);
  state.paddle.x = Math.round(
    clamp(
      state.paddle.x + delta * state.paddle.speed,
      0,
      state.width - state.paddle.width
    )
  );
}

/**
 * Step Simulation.
 * @param {unknown} state Parameter.
 */
export function stepSimulation(state) {
  if (state.orb.stuckToPaddle) return;
  const substeps = 3;
  const hitCells = new Set();
  advanceCellCooldowns(state);
  for (let i = 0; i < substeps; i += 1) {
    state.orb.x += state.orb.vx / substeps;
    state.orb.y += state.orb.vy / substeps;
    resolveWalls(state);
    resolvePaddle(state);
    resolveCells(state, hitCells);
    resolveBottom(state);
  }
  state.frame += 0;
  resolveWinLoss(state);
}

/**
 * Stick Orb To Paddle.
 * @param {unknown} state Parameter.
 */
function stickOrbToPaddle(state) {
  state.orb.x = state.paddle.x + Math.round(state.paddle.width / 2);
  state.orb.y = state.paddle.y - state.orb.radius - 1;
}

/**
 * Resolve Walls.
 * @param {unknown} state Parameter.
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
 * Resolve Paddle.
 * @param {unknown} state Parameter.
 */
export function resolvePaddle(state) {
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
 * Resolve Cells.
 * @param {unknown} state Parameter.
 * @param {unknown} hitCells Parameter.
 */
export function resolveCells(state, hitCells) {
  for (const cell of state.cells) {
    if (hitCells.has(cell.id)) {
      continue;
    }
    if (circleIntersectsCell(state.orb, cell)) {
      hitCells.add(cell.id);
      reflectOrb(state, cell);
      if (cell.state === 'overcharged') {
        cell.charge = Math.max(cell.charge, cell.maxCharge + 1);
        cell.overchargeCooldown = DEFAULT_OVERCHARGE_COOLDOWN;
        continue;
      }
      cell.charge += 1;
      if (cell.charge > cell.maxCharge) {
        cell.state = 'overcharged';
      } else if (cell.charge >= cell.targetCharge) {
        cell.state = 'stable';
      } else {
        cell.state = 'charging';
      }
      if (cell.state === 'stable') state.score += 1;
      if (cell.state === 'overcharged') {
        cell.overchargeCooldown = DEFAULT_OVERCHARGE_COOLDOWN;
        state.faults += 1;
      }
      break;
    }
  }
}

/**
 * Advance Cell Cooldowns.
 * @param {unknown} state Parameter.
 */
export function advanceCellCooldowns(state) {
  for (const cell of state.cells) {
    if (cell.state !== 'overcharged' || cell.overchargeCooldown <= 0) continue;
    cell.overchargeCooldown -= 1;
    if (cell.overchargeCooldown <= 0) {
      cell.state = 'charging';
      cell.charge = Math.min(cell.charge, cell.targetCharge);
    }
  }
}

/**
 * Reflect Orb.
 * @param {unknown} state Parameter.
 * @param {unknown} cell Parameter.
 */
export function reflectOrb(state, cell) {
  const orb = state.orb;
  const cx = cell.x + cell.width / 2;
  const cy = cell.y + cell.height / 2;
  const dx = orb.x - cx;
  const dy = orb.y - cy;
  const overlapX = orb.radius + cell.width / 2 - Math.abs(dx);
  const overlapY = orb.radius + cell.height / 2 - Math.abs(dy);
  if (overlapX < overlapY) {
    orb.x = cx + Math.sign(dx || 1) * (cell.width / 2 + orb.radius + 0.5);
    orb.vx = -orb.vx;
  } else {
    orb.y = cy + Math.sign(dy || 1) * (cell.height / 2 + orb.radius + 0.5);
    orb.vy = -orb.vy;
  }
}

/**
 * Circle Intersects Cell.
 * @param {unknown} orb Parameter.
 * @param {unknown} cell Parameter.
 * @returns {unknown} Return value.
 */
function circleIntersectsCell(orb, cell) {
  const closestX = clamp(orb.x, cell.x, cell.x + cell.width);
  const closestY = clamp(orb.y, cell.y, cell.y + cell.height);
  const dx = orb.x - closestX;
  const dy = orb.y - closestY;
  return dx * dx + dy * dy <= orb.radius * orb.radius;
}

/**
 * Resolve Bottom.
 * @param {unknown} state Parameter.
 */
function resolveBottom(state) {
  if (state.orb.y + state.orb.radius <= state.height) return;
  state.lives -= 1;
  if (state.lives <= 0) {
    state.status = 'lost';
    return;
  }
  resetOrbToPaddle(state);
}

/**
 * Resolve Win Loss.
 * @param {unknown} state Parameter.
 */
function resolveWinLoss(state) {
  if (
    state.cells.every(cell => cell.state === 'stable') &&
    state.faults <= DEFAULT_MAX_FAULTS
  ) {
    state.status = 'won';
  }
  if (state.faults > DEFAULT_MAX_FAULTS || state.lives <= 0) {
    state.status = 'lost';
  }
}

/**
 * Reset Orb To Paddle.
 * @param {unknown} state Parameter.
 */
function resetOrbToPaddle(state) {
  state.status = 'ready';
  state.orb.stuckToPaddle = true;
  state.orb.vx = DEFAULT_ORB_SPEED_X;
  state.orb.vy = DEFAULT_ORB_SPEED_Y;
  stickOrbToPaddle(state);
}

/**
 * Clamp.
 * @param {unknown} value Parameter.
 * @param {unknown} min Parameter.
 * @param {unknown} max Parameter.
 * @returns {unknown} Return value.
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * To Canvas Payload.
 * @param {unknown} state Parameter.
 * @returns {unknown} Return value.
 */
function toCanvasPayload(state) {
  const shapes = [
    {
      type: 'rect',
      x: 0,
      y: 0,
      width: state.width,
      height: state.height,
      fill: '#07111f',
    },
    {
      type: 'rect',
      x: 14,
      y: 14,
      width: state.width - 28,
      height: state.height - 28,
      fill: '#0e1b2d',
    },
    ...state.cells.map(cell => ({
      type: 'rect',
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
      fill: getCellFill(cell.state),
    })),
    ...state.cells.map(cell => ({
      type: 'rect',
      x: cell.x + 3,
      y: cell.y + 3,
      width: Math.max(
        0,
        Math.min(
          cell.width - 6,
          Math.round((cell.charge / cell.maxCharge) * (cell.width - 6))
        )
      ),
      height: Math.max(2, cell.height - 6),
      fill: cell.state === 'overcharged' ? '#f97316' : '#dbeafe',
    })),
    {
      type: 'rect',
      x: state.paddle.x,
      y: state.paddle.y,
      width: state.paddle.width,
      height: state.paddle.height,
      fill: '#e5e7eb',
    },
    {
      type: 'circle',
      x: Math.round(state.orb.x),
      y: Math.round(state.orb.y),
      radius: state.orb.radius,
      fill: state.status === 'lost' ? '#fca5a5' : '#fde047',
    },
    {
      type: 'rect',
      x: 18,
      y: state.height - 12,
      width: Math.max(8, Math.min(state.width - 36, state.score * 12 + 20)),
      height: 4,
      fill: '#34d399',
    },
    ...(state.faults > 0
      ? [
          {
            type: 'rect',
            x: state.width - 54,
            y: 18,
            width: 36,
            height: 6,
            fill: state.faults > DEFAULT_MAX_FAULTS ? '#ef4444' : '#94a3b8',
          },
        ]
      : []),
  ];
  return { width: state.width, height: state.height, shapes };
}

/**
 * Persist State.
 * @param {unknown} storage Parameter.
 * @param {unknown} state Parameter.
 */
function persistState(storage, state) {
  storage?.({ [STORAGE_KEY]: state });
}

/**
 * Get the fill color for a battery cell state.
 * @param {'empty' | 'charging' | 'stable' | 'overcharged'} cellState Cell state.
 * @returns {string} Fill color.
 */
function getCellFill(cellState) {
  if (cellState === 'stable') {
    return '#4ade80';
  }
  if (cellState === 'overcharged') {
    return '#fb7185';
  }
  return '#60a5fa';
}
