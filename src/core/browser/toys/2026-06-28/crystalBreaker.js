// @ts-nocheck
/* eslint-disable no-ternary, complexity, no-unused-vars */
import { createRectShape, runToy } from '../toyPersistence.js';
import { normalizePositiveInteger } from '../../common.js';

const STORAGE_KEY = 'CRYS1';
const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 240;
const DEFAULT_PADDLE_WIDTH = 48;
const DEFAULT_PADDLE_HEIGHT = 6;
const DEFAULT_PADDLE_SPEED = 4;
const DEFAULT_ORB_RADIUS = 4;
const DEFAULT_ORB_SPEED_X = 1.6;
const DEFAULT_ORB_SPEED_Y = -2.4;
const DEFAULT_LIVES = 3;
const EDGE_THRESHOLD = 0.4;
const HUD_HEIGHT = 24;

/**
 * Runs the crystal breaker toy.
 * @param {unknown} input - input value
 * @param {unknown} env - env value
 * @returns {string} - result
 */
export function crystalBreaker(input, env) {
  return runToy(
    input,
    env,
    {
      storageKey: STORAGE_KEY,
      normalizeState,
      buildNextState,
      toCanvasPayload: state => JSON.stringify(toCanvasPayload(state)),
    }
  );
}

/**
 * Builds the next persisted state.
 * @param {ReturnType<typeof normalizeState>|null} persisted - persisted value
 * @param {object} input - input value
 * @returns {ReturnType<typeof createSeedState>} - result
 */
function buildNextState(persisted, input) {
  const seed = createSeedState(input, persisted);
  const base = persisted || seed;
  const shouldReset = input?.reset === true || !persisted;
  const merged = shouldReset ? seed : mergeSeedAndState(base, seed);
  const inputState = updateInputState(base.input, input);
  if (resetPressed(inputState)) {
    const resetState = createSeedState(input, {
      width: persisted?.width,
      height: persisted?.height,
      lives: persisted?.lives,
    });
    resetState.input = inputState;
    return resetState;
  }
  const next = { ...merged, input: inputState, frame: base.frame + 1 };
  applyGameplayInput(next, inputState);
  if (next.status === 'running') {
    stepSimulation(next);
  }
  return next;
}

/**
 * Merges a fresh seed into an existing state.
 * @param {ReturnType<typeof createSeedState>} base - base value
 * @param {ReturnType<typeof createSeedState>} seed - seed value
 * @returns {ReturnType<typeof createSeedState>} - result
 */
function mergeSeedAndState(base, seed) {
  return {
    ...base,
    width: seed.width,
    height: seed.height,
    paddle: {
      ...base.paddle,
      y: Math.max(0, seed.height - 18 - base.paddle.height),
    },
    orb: { ...base.orb, radius: DEFAULT_ORB_RADIUS },
    crystals: base.crystals.filter(crystal => crystal.state !== 'shattered'),
  };
}

/**
 * Creates a seeded game state from input and fallback values.
 * @param {object} input - input value
 * @param {object|null} fallback - fallback value
 * @returns {ReturnType<typeof createSeedState>} - result
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
  const layoutSeed = normalizePositiveInteger(input?.layoutSeed, 1);
  return {
    version: 1,
    width,
    height,
    frame: 0,
    status: 'ready',
    score: 0,
    lives: normalizePositiveInteger(
      input?.lives,
      fallback?.lives ?? DEFAULT_LIVES
    ),
    combo: 0,
    input: createInitialInputState(),
    paddle: {
      x: Math.round((width - paddleWidth) / 2),
      y: Math.max(0, height - 18 - paddleHeight),
      width: paddleWidth,
      height: paddleHeight,
      speed: paddleSpeed,
    },
    orb: {
      x: Math.round(width / 2),
      y: Math.max(0, height - 19 - orbRadius),
      vx: DEFAULT_ORB_SPEED_X,
      vy: DEFAULT_ORB_SPEED_Y,
      radius: orbRadius,
      stuckToPaddle: true,
    },
    crystals: normalizeCrystals(width, height, layoutSeed),
  };
}

/**
 * Creates the default input state.
 * @returns {object} - result
 */
function createInitialInputState() {
  return {
    keyboard: {},
    gamepad: { buttons: [], axes: [] },
    actions: createActionFlags(),
    previousActions: createActionFlags(),
  };
}

/**
 * Creates a HUD text shape.
 * @param {number} x - x value
 * @param {string} text - text value
 * @returns {ReturnType<typeof createRectShape>} - result
 */
function createHudTextShape(x, text) {
  return {
    type: 'text',
    x,
    y: 16,
    text,
    fill: '#dbeafe',
    font: '11px monospace',
    align: 'left',
    baseline: 'alphabetic',
  };
}

/**
 * Creates a background rectangle shape.
 * @param {number} width - width value
 * @param {number} height - height value
 * @param {string} fill - fill value
 * @returns {object} - result
 */
function createBackgroundShape(width, height, fill) {
  return {
    type: 'rect',
    x: 0,
    y: 0,
    width,
    height,
    fill,
  };
}

/**
 * Normalizes persisted state.
 * @param {unknown} value - value value
 * @returns {ReturnType<typeof createSeedState>|null} - result
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
    combo: normalizePositiveInteger(candidate.combo, 0),
    input: normalizeInputState(candidate.input),
    paddle: normalizePaddle(candidate.paddle),
    orb: normalizeOrb(candidate.orb),
    crystals: normalizeCrystalsFromState(candidate.crystals),
  };
}

/**
 * Normalizes the input state payload.
 * @param {unknown} value - value value
 * @returns {object} - result
 */
function normalizeInputState(value) {
  return {
    keyboard: normalizeBooleanRecord(value?.keyboard),
    gamepad: {
      buttons: Array.isArray(value?.gamepad?.buttons)
        ? value.gamepad.buttons.map(next => next === true)
        : [],
      axes: Array.isArray(value?.gamepad?.axes)
        ? value.gamepad.axes.map(next => Number(next) || 0)
        : [],
    },
    actions: normalizeActions(value?.actions),
    previousActions: normalizeActions(value?.previousActions),
  };
}

/**
 * Normalizes a record of boolean-like values.
 * @param {unknown} value - value value
 * @returns {Record<string, boolean>} - result
 */
function normalizeBooleanRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, next]) => [key, next === true])
  );
}

/**
 * Normalizes action flags.
 * @param {unknown} value - value value
 * @returns {object} - result
 */
function normalizeActions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createActionFlags();
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
 * Creates a blank action flag set.
 * @returns {object} - result
 */
function createActionFlags() {
  return {
    moveLeft: false,
    moveRight: false,
    launchPressed: false,
    pausePressed: false,
    resetPressed: false,
  };
}

/**
 * Returns whether reset was pressed on this frame.
 * @param {object} inputState - inputState value
 * @returns {boolean} - result
 */
function resetPressed(inputState) {
  return (
    inputState.actions.resetPressed && !inputState.previousActions.resetPressed
  );
}

/**
 * Normalizes the paddle state.
 * @param {unknown} value - value value
 * @returns {object} - result
 */
function normalizePaddle(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return {
      x: 156,
      y: 220,
      width: DEFAULT_PADDLE_WIDTH,
      height: DEFAULT_PADDLE_HEIGHT,
      speed: DEFAULT_PADDLE_SPEED,
    };
  return {
    x: normalizePositiveInteger(value.x, 156),
    y: normalizePositiveInteger(value.y, 220),
    width: normalizePositiveInteger(value.width, DEFAULT_PADDLE_WIDTH),
    height: normalizePositiveInteger(value.height, DEFAULT_PADDLE_HEIGHT),
    speed: normalizePositiveInteger(value.speed, DEFAULT_PADDLE_SPEED),
  };
}

/**
 * Normalizes the orb state.
 * @param {unknown} value - value value
 * @returns {object} - result
 */
function normalizeOrb(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return {
      x: 180,
      y: 200,
      vx: DEFAULT_ORB_SPEED_X,
      vy: DEFAULT_ORB_SPEED_Y,
      radius: DEFAULT_ORB_RADIUS,
      stuckToPaddle: true,
    };
  return {
    x: Number(value.x) || 180,
    y: Number(value.y) || 200,
    vx: Number(value.vx) || DEFAULT_ORB_SPEED_X,
    vy: Number(value.vy) || DEFAULT_ORB_SPEED_Y,
    radius: normalizePositiveInteger(value.radius, DEFAULT_ORB_RADIUS),
    stuckToPaddle: value.stuckToPaddle === true,
  };
}

/**
 * Generates the crystal layout.
 * @param {number} width - width value
 * @param {number} height - height value
 * @param {number} layoutSeed - layoutSeed value
 * @returns {Array<object>} - result
 */
function normalizeCrystals(width, height, layoutSeed) {
  const top = 40;
  const left = 28 + (layoutSeed % 3) * 4;
  const cols = 5;
  const rows = 3;
  const result = [];
  let id = 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const hp = row === 0 ? 2 : 1;
      result.push({
        id: `crystal-${id++}`,
        x: left + col * 58 + (row % 2 ? 10 : 0),
        y: top + row * 28,
        width: 24,
        height: 14,
        hp,
        maxHp: hp,
        fracture: 0,
        state: 'whole',
      });
    }
  }
  return result;
}

/**
 * Normalizes persisted crystals.
 * @param {unknown} value - value value
 * @returns {Array<object>} - result
 */
function normalizeCrystalsFromState(value) {
  if (!Array.isArray(value))
    return normalizeCrystals(DEFAULT_WIDTH, DEFAULT_HEIGHT, 1);
  return value.map((crystal, index) => ({
    id: typeof crystal?.id === 'string' ? crystal.id : `crystal-${index + 1}`,
    x: Number(crystal?.x) || 0,
    y: Number(crystal?.y) || 0,
    width: normalizePositiveInteger(crystal?.width, 24),
    height: normalizePositiveInteger(crystal?.height, 14),
    hp: normalizePositiveInteger(crystal?.hp, 1),
    maxHp: normalizePositiveInteger(crystal?.maxHp, 1),
    fracture: normalizePositiveInteger(crystal?.fracture, 0),
    state: ['whole', 'fractured', 'shattered'].includes(crystal?.state)
      ? crystal.state
      : 'whole',
  }));
}

/**
 * Updates the input state from the latest event.
 * @param {object} previous - previous value
 * @param {object} input - input value
 * @returns {object} - result
 */
function updateInputState(previous, input) {
  const nextActions = parseActions(input, previous);
  return {
    ...previous,
    keyboard: nextActions.keyboard,
    actions: nextActions.actions,
    previousActions: previous.actions,
  };
}

/**
 * Parses keyboard and action state from an event.
 * @param {object} input - input value
 * @param {object} previous - previous value
 * @returns {object} - result
 */
function parseActions(input, previous) {
  const normalizedKey = normalizeKeyName(input?.key);
  let keys = null;
  if (input?.type === 'keydown') {
    keys = { [normalizedKey]: true };
  } else if (input?.type === 'keyup') {
    keys = { [normalizedKey]: false };
  }
  const keyboard = { ...previous.keyboard, ...(keys || {}) };
  const actions = {
    moveLeft:
      keyboard.arrowleft === true ||
      keyboard.a === true ||
      keyboard.left === true,
    moveRight:
      keyboard.arrowright === true ||
      keyboard.d === true ||
      keyboard.right === true,
    launchPressed:
      input?.type === 'keydown' &&
      (normalizedKey === 'space' || normalizedKey === ' '),
    pausePressed: input?.type === 'keydown' && normalizedKey === 'p',
    resetPressed: input?.type === 'keydown' && normalizedKey === 'r',
  };
  return { keyboard, actions };
}

/**
 * Normalizes a keyboard key name.
 * @param {unknown} key - key value
 * @returns {string} - result
 */
function normalizeKeyName(key) {
  const value = String(key || '').toLowerCase();
  if (value === ' ') return 'space';
  return value;
}

/**
 * Applies player input to the current state.
 * @param {object} state - state value
 * @param {object} inputState - inputState value
 * @returns {void} - result
 */
function applyGameplayInput(state, inputState) {
  if (resetPressed(inputState)) {
    state.status = 'ready';
    return;
  }
  if (
    inputState.actions.pausePressed &&
    !inputState.previousActions.pausePressed
  ) {
    if (state.status === 'paused' || state.status === 'ready') {
      state.status = 'running';
    } else if (state.status === 'running') {
      state.status = 'paused';
    }
  }
  if (
    inputState.actions.launchPressed &&
    !inputState.previousActions.launchPressed &&
    state.orb.stuckToPaddle
  ) {
    state.status = 'running';
    state.orb.stuckToPaddle = false;
    state.orb.vx = DEFAULT_ORB_SPEED_X;
    state.orb.vy = DEFAULT_ORB_SPEED_Y;
  }
  if (inputState.actions.moveLeft) state.paddle.x -= state.paddle.speed;
  if (inputState.actions.moveRight) state.paddle.x += state.paddle.speed;
  state.paddle.x = Math.max(
    0,
    Math.min(state.width - state.paddle.width, state.paddle.x)
  );
  if (state.orb.stuckToPaddle) {
    state.orb.x = Math.round(state.paddle.x + state.paddle.width / 2);
    state.orb.y = state.paddle.y - state.orb.radius - 1;
  }
}

/**
 * Advances the simulation by one frame.
 * @param {object} state - state value
 * @returns {void} - result
 */
function stepSimulation(state) {
  state.orb.x += state.orb.vx;
  state.orb.y += state.orb.vy;
  if (
    state.orb.x - state.orb.radius <= 0 ||
    state.orb.x + state.orb.radius >= state.width
  )
    state.orb.vx *= -1;
  if (state.orb.y - state.orb.radius <= HUD_HEIGHT)
    state.orb.vy = Math.abs(state.orb.vy);
  if (orbHitsPaddle(state.orb, state.paddle)) {
    state.orb.vy = -Math.abs(state.orb.vy);
    state.orb.vx +=
      (state.orb.x - (state.paddle.x + state.paddle.width / 2)) / 18;
    state.combo = 0;
  }
  for (const crystal of state.crystals) {
    if (crystal.state === 'shattered' || !orbHitsCrystal(state.orb, crystal))
      continue;
    crystal.hp = Math.max(0, crystal.hp - 1);
    crystal.fracture += 1;
    if (crystal.hp <= 0) {
      crystal.state = 'shattered';
      state.score += 10;
    } else if (crystal.hp < crystal.maxHp) {
      crystal.state = 'fractured';
      state.score += 1;
    } else {
      crystal.state = 'whole';
      state.score += 1;
    }
    state.combo += 1;
    state.orb.vy *= -1;
    break;
  }
  if (state.orb.y - state.orb.radius > state.height) {
    state.lives = Math.max(0, state.lives - 1);
    state.combo = 0;
    if (state.lives === 0) state.status = 'lost';
    state.orb.stuckToPaddle = true;
    state.orb.vx = DEFAULT_ORB_SPEED_X;
    state.orb.vy = DEFAULT_ORB_SPEED_Y;
    state.orb.x = Math.round(state.paddle.x + state.paddle.width / 2);
    state.orb.y = state.paddle.y - state.orb.radius - 1;
    state.status = state.status === 'lost' ? 'lost' : 'ready';
  }
  if (state.crystals.every(crystal => crystal.state === 'shattered'))
    state.status = 'won';
}

/**
 * Checks whether the orb overlaps the paddle.
 * @param {object} orb - orb value
 * @param {object} paddle - paddle value
 * @returns {boolean} - result
 */
function orbHitsPaddle(orb, paddle) {
  return (
    orb.y + orb.radius >= paddle.y &&
    orb.y - orb.radius <= paddle.y + paddle.height &&
    orb.x >= paddle.x &&
    orb.x <= paddle.x + paddle.width &&
    orb.vy > 0
  );
}

/**
 * Checks whether the orb overlaps a crystal.
 * @param {object} orb - orb value
 * @param {object} crystal - crystal value
 * @returns {boolean} - result
 */
function orbHitsCrystal(orb, crystal) {
  return (
    orb.x + orb.radius >= crystal.x &&
    orb.x - orb.radius <= crystal.x + crystal.width &&
    orb.y + orb.radius >= crystal.y &&
    orb.y - orb.radius <= crystal.y + crystal.height
  );
}

/**
 * Converts game state into canvas payload data.
 * @param {object} state - state value
 * @returns {object} - result
 */
function toCanvasPayload(state) {
  const activeCrystals = state.crystals.filter(
    crystal => crystal.state !== 'shattered'
  );
  return {
    width: state.width,
    height: state.height,
    shapes: [
      createBackgroundShape(state.width, state.height, '#08111f'),
      createBackgroundShape(state.width, HUD_HEIGHT, '#0f172a'),
      createHudTextShape(8, `Score ${state.score}`),
      createHudTextShape(88, `Lives ${state.lives}`),
      createHudTextShape(160, `Crystals ${activeCrystals.length}`),
      createHudTextShape(250, `Status ${state.status.toUpperCase()}`),
      ...activeCrystals.map(crystal => ({
        type: 'rect',
        x: crystal.x,
        y: crystal.y,
        width: crystal.width,
        height: crystal.height,
        fill: getCrystalFill(crystal.state),
      })),
      {
        type: 'rect',
        x: state.paddle.x,
        y: state.paddle.y,
        width: state.paddle.width,
        height: state.paddle.height,
        fill: '#f59e0b',
      },
      {
        type: 'circle',
        x: state.orb.x,
        y: state.orb.y,
        radius: state.orb.radius,
        fill: '#f8fafc',
      },
    ],
  };
}

/**
 * Normalizes the persisted status string.
 * @param {unknown} value - value value
 * @returns {string} - result
 */
function normalizeStatus(value) {
  if (['ready', 'running', 'paused', 'won', 'lost'].includes(value)) {
    return value;
  }
  return 'ready';
}

/**
 * Returns the crystal fill color for a state.
 * @param {string} state - state value
 * @returns {string} - result
 */
function getCrystalFill(state) {
  if (state === 'fractured') return '#8dd3ff';
  if (state === 'shattered') return '#4f46e5';
  return '#5eead4';
}
