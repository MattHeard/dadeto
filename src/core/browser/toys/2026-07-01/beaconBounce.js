// @ts-nocheck
import { runToy } from '../toyPersistence.js';
import { normalizePositiveInteger } from '../../common.js';

const STORAGE_KEY = 'BEAC1';
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

/**
 * @typedef {{ moveLeft: boolean, moveRight: boolean, launchPressed: boolean, pausePressed: boolean, resetPressed: boolean }} BeaconActions
 * @typedef {{ paused: boolean, speedMultiplier: number, stepCount: number }} BeaconControlState
 * @typedef {{ keyboard: Record<string, boolean>, gamepad: { buttons: boolean[], axes: number[] }, actions: BeaconActions, previousActions: BeaconActions, control: BeaconControlState }} BeaconInputState
 * @typedef {{ id: string, x: number, y: number, radius: number, active: boolean, required: boolean, hitCount: number }} Beacon
 * @typedef {{ from: string, to: string, active: boolean }} BeaconLink
 * @typedef {{ x: number, y: number, vx: number, vy: number, radius: number, stuckToPaddle: boolean }} BeaconOrb
 * @typedef {{ version: 1, width: number, height: number, frame: number, status: 'ready' | 'running' | 'paused' | 'won' | 'lost', score: number, lives: number, initialLives: number, input: BeaconInputState, paused: boolean, simulationSpeed: number, paddle: { x: number, y: number, width: number, height: number, speed: number }, orb: BeaconOrb, beacons: Beacon[], links: BeaconLink[], lastActivatedBeaconId: string | null }} BeaconState
 */

/**
 * Run the Beacon Bounce toy with persisted browser state.
 * @param {unknown} input - Toy input payload from the browser runtime.
 * @param {unknown} env - Runtime environment passed through by the toy host.
 * @returns {unknown} The toy runner result.
 */
export function beaconBounce(input, env) {
  return runToy(input, env, {
    storageKey: STORAGE_KEY,
    normalizeState,
    buildNextState,
    toCanvasPayload: state => JSON.stringify(toCanvasPayload(state)),
  });
}

/**
 * Build the next game state from persisted state and the latest input.
 * @param {BeaconState | null} persisted - Previously persisted state.
 * @param {unknown} input - Latest toy input payload.
 * @returns {BeaconState} The next simulation state.
 */
export function buildNextState(persisted, input) {
  const seed = createSeedState(input, persisted);
  const base = persisted || seed;
  const shouldReset = input?.reset === true || !persisted;
  let merged = seed;
  if (!shouldReset) merged = mergeSeedAndState(base, seed);
  const inputState = updateInputState(base.input, input);

  const resetState = createResetState(inputState, persisted, input);
  if (resetState) {
    resetState.input = inputState;
    return resetState;
  }

  const next = { ...merged, input: inputState, frame: base.frame + 1 };
  applyGameplayInput(next, inputState);
  next.simulationSpeed = inputState.control.speedMultiplier;
  advanceSimulation(next, inputState);
  return next;
}

/**
 * Create a reset state when the reset action is newly pressed.
 * @param {BeaconInputState} inputState Current input state.
 * @param {BeaconState | null} persisted Previous persisted state.
 * @param {unknown} input Latest input payload.
 * @returns {BeaconState | null} Reset state or null when no reset is requested.
 */
function createResetState(inputState, persisted, input) {
  if (
    !inputState.actions.resetPressed ||
    inputState.previousActions.resetPressed
  )
    return null;
  return createSeedState(
    { ...input, layoutSeed: (persisted?.layoutSeed ?? 0) + 1 },
    buildResetFallback(persisted)
  );
}

/**
 * Advance a running state by the requested number of frames.
 * @param {BeaconState} next Mutable next state.
 * @param {BeaconInputState} inputState Current input state.
 * @returns {void}
 */
function advanceSimulation(next, inputState) {
  let framesToAdvance = inputState.control.stepCount;
  if (!next.paused)
    framesToAdvance =
      next.simulationSpeed * Math.max(1, inputState.control.stepCount);
  if (next.status === 'running') {
    const frameCount = Math.max(0, Math.floor(framesToAdvance));
    Array.from({ length: frameCount }, () => stepSimulation(next));
  }
}

/**
 * Update keyboard, gamepad, and control state from the current input.
 * @param {BeaconInputState | undefined} previous - Previous input state.
 * @param {unknown} input - Latest toy input payload.
 * @returns {BeaconInputState} Normalized input state for the current frame.
 */
export function updateInputState(previous, input) {
  const keyboard = normalizeKeyboard(previous?.keyboard, input);
  const gamepad = normalizeGamepad(input);
  const actions = deriveActions(keyboard, gamepad);
  const previousActions = previous?.actions || createActionFlags();
  const control = normalizeControlState(previous?.control, input);
  return { keyboard, gamepad, actions, previousActions, control };
}

/**
 * Normalize simulation controls from the previous state and latest input.
 * @param {BeaconControlState | undefined} previous Previous controls.
 * @param {unknown} input Latest input payload.
 * @returns {BeaconControlState} Normalized controls.
 */
function normalizeControlState(previous, input) {
  const control = {
    paused: Boolean(
      firstDefined(readInput(input, 'paused'), previous?.paused, false)
    ),
    speedMultiplier: normalizeStepCount(
      firstDefined(
        readInput(input, 'speedMultiplier'),
        readInput(input, 'speed'),
        previous?.speedMultiplier
      ),
      1
    ),
    stepCount: normalizeStepCount(
      firstDefined(
        readInput(input, 'stepCount'),
        readInput(input, 'steps'),
        readInput(input, 'step')
      ),
      0
    ),
  };
  if (readInput(input, 'pause') === true) control.paused = true;
  if (readInput(input, 'resume') === true) control.paused = false;
  return control;
}

/**
 * Read a property from an unknown input object.
 * @param {unknown} input Candidate input.
 * @param {string} key Property name.
 * @returns {unknown} Property value, or undefined.
 */
function readInput(input, key) {
  if (!input || typeof input !== 'object') return undefined;
  return input[key];
}

/**
 * Return the first non-nullish value.
 * @param {...unknown} values Candidate values.
 * @returns {unknown} First defined value, or undefined.
 */
function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

/**
 * Build a fallback state used when the toy resets from persisted data.
 * @param {BeaconState | null} persisted - Previously persisted state.
 * @returns {{ width?: number, height?: number, lives?: number, layoutSeed?: number } | undefined}
 * Reset fallback values or undefined when there is no persisted state.
 */
export function buildResetFallback(persisted) {
  if (!persisted) return undefined;
  return {
    width: persisted.width,
    height: persisted.height,
    lives: persisted.initialLives ?? persisted.lives,
    layoutSeed: persisted.layoutSeed,
  };
}

/**
 * Merge a persisted state with a freshly seeded layout.
 * @param {BeaconState} base - Persisted state to retain between seeds.
 * @param {BeaconState} seed - Freshly created seed state.
 * @returns {BeaconState} Combined state with the new layout dimensions.
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
    beacons: base.beacons,
    links: base.links,
  };
}

/**
 * Create a fresh seed state for a run.
 * @param {unknown} input - Latest toy input payload.
 * @param {Partial<BeaconState> | undefined} fallback - Values reused on reset.
 * @returns {BeaconState} New initial game state.
 */
function createSeedState(input, fallback) {
  const width = normalizePositiveInteger(
    readInput(input, 'width'),
    fallbackValue(fallback, 'width', DEFAULT_WIDTH)
  );
  const height = normalizePositiveInteger(
    readInput(input, 'height'),
    fallbackValue(fallback, 'height', DEFAULT_HEIGHT)
  );
  const layoutSeed = normalizePositiveInteger(
    readInput(input, 'layoutSeed'),
    1
  );
  const lives = normalizePositiveInteger(
    readInput(input, 'lives'),
    fallbackValue(fallback, 'lives', DEFAULT_LIVES)
  );
  const simulationSpeed = normalizeStepCount(
    firstDefined(
      readInput(input, 'speedMultiplier'),
      readInput(input, 'speed')
    ),
    1
  );

  return {
    version: 1,
    width,
    height,
    frame: 0,
    status: 'ready',
    score: 0,
    lives,
    initialLives: lives,
    input: createInitialInputState(),
    paused: false,
    simulationSpeed,
    paddle: {
      x: Math.round((width - DEFAULT_PADDLE_WIDTH) / 2),
      y: Math.max(0, height - 18 - DEFAULT_PADDLE_HEIGHT),
      width: DEFAULT_PADDLE_WIDTH,
      height: DEFAULT_PADDLE_HEIGHT,
      speed: DEFAULT_PADDLE_SPEED,
    },
    orb: {
      x: Math.round(width / 2),
      y: Math.max(0, height - 19 - DEFAULT_ORB_RADIUS),
      vx: DEFAULT_ORB_SPEED_X,
      vy: DEFAULT_ORB_SPEED_Y,
      radius: DEFAULT_ORB_RADIUS,
      stuckToPaddle: true,
    },
    beacons: normalizeBeacons(width, height, layoutSeed),
    links: [],
    lastActivatedBeaconId: null,
  };
}

/**
 * Read a fallback property with a default.
 * @param {object | undefined} fallback Fallback object.
 * @param {string} key Property name.
 * @param {unknown} defaultValue Default value.
 * @returns {unknown} Fallback value.
 */
function fallbackValue(fallback, key, defaultValue) {
  return firstDefined(fallback?.[key], defaultValue);
}

/**
 * Create the default normalized input state.
 * @returns {BeaconInputState} Empty input state with neutral controls.
 */
function createInitialInputState() {
  return {
    keyboard: {},
    gamepad: { buttons: [], axes: [] },
    actions: createActionFlags(),
    previousActions: createActionFlags(),
    control: { paused: false, speedMultiplier: 1, stepCount: 0 },
  };
}

/**
 * Normalize a control step count or speed multiplier.
 * @param {unknown} value - Raw numeric input.
 * @param {number} fallback - Fallback when the input is absent or invalid.
 * @returns {number} Rounded non-negative step count.
 */
function normalizeStepCount(value, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(fallback, Math.round(Math.max(0, next)));
}

/**
 * Create a fresh set of action flags.
 * @returns {BeaconActions} Empty action flags.
 */
export function createActionFlags() {
  return {
    moveLeft: false,
    moveRight: false,
    launchPressed: false,
    pausePressed: false,
    resetPressed: false,
  };
}

/**
 * Generate the beacon layout for the current arena dimensions.
 * @param {number} width - Arena width.
 * @param {number} height - Arena height.
 * @param {number} seed - Layout seed.
 * @returns {Beacon[]} Deterministic beacon layout.
 */
function normalizeBeacons(width, height, seed) {
  const points = [
    [72, 44],
    [140, 30],
    [214, 46],
    [104, 96],
    [180, 102],
    [256, 82],
  ];
  return points.map(([x, y], index) => ({
    id: `beacon-${seed}-${index + 1}`,
    x: Math.min(width - 20, x + (seed % 3) * 2),
    y: Math.min(height - 40, y + (index % 2) * 3),
    radius: beaconRadius(index),
    active: false,
    required: true,
    hitCount: 0,
  }));
}

/**
 * Normalize the keyboard state by applying a single key event.
 * @param {Record<string, boolean> | undefined} previous - Previous keyboard state.
 * @param {unknown} input - Latest toy input payload.
 * @returns {Record<string, boolean>} Updated keyboard state.
 */
export function normalizeKeyboard(previous, input) {
  const keyboard = { ...(previous || {}) };
  if (input?.type === 'keydown' && typeof input.key === 'string')
    keyboard[input.key.toLowerCase()] = true;
  if (input?.type === 'keyup' && typeof input.key === 'string')
    keyboard[input.key.toLowerCase()] = false;
  return keyboard;
}

/**
 * Normalize gamepad buttons and axes from the current input.
 * @param {unknown} input - Latest toy input payload.
 * @returns {{ buttons: boolean[], axes: number[] }} Normalized gamepad state.
 */
export function normalizeGamepad(input) {
  const buttons = normalizeButtons(input);
  const axes = normalizeAxes(input);
  return { buttons, axes };
}

/**
 * Normalize gamepad button values.
 * @param {unknown} input Latest input payload.
 * @returns {boolean[]} Normalized button values.
 */
function normalizeButtons(input) {
  if (Array.isArray(input?.buttons)) return input.buttons.map(Boolean);
  return [];
}

/**
 * Normalize gamepad axis values.
 * @param {unknown} input Latest input payload.
 * @returns {number[]} Normalized axis values.
 */
function normalizeAxes(input) {
  if (Array.isArray(input?.axes))
    return input.axes.map(value => Number(value) || 0);
  return [];
}

/**
 * Select the radius for a beacon position.
 * @param {number} index Beacon position.
 * @returns {number} Beacon radius.
 */
function beaconRadius(index) {
  if (index === 0) return 9;
  return 8;
}

/**
 * Apply a sign to a magnitude.
 * @param {number} value Source value.
 * @param {boolean} positive Whether the result is positive.
 * @returns {number} Signed magnitude.
 */
function signedMagnitude(value, positive) {
  const magnitude = Math.abs(value);
  if (positive) return magnitude;
  return -magnitude;
}

/**
 * Choose a beacon fill color.
 * @param {boolean} active Whether the beacon is active.
 * @returns {string} Fill color.
 */
function beaconColor(active) {
  if (active) return '#6ee7ff';
  return '#1e3a5f';
}

/**
 * Choose a beacon stroke color.
 * @param {boolean} required Whether the beacon is required.
 * @returns {string} Stroke color.
 */
function beaconStroke(required) {
  if (required) return '#bff3ff';
  return '#335';
}

/**
 * Convert normalized keyboard and gamepad state into gameplay actions.
 * @param {{ [key: string]: boolean }} keyboard - Normalized keyboard state.
 * @param {{ buttons: boolean[], axes: number[] }} gamepad - Normalized gamepad state.
 * @returns {BeaconActions} Gameplay action flags.
 */
function deriveActions(keyboard, gamepad) {
  const left = movementAction(
    keyboard.arrowleft,
    keyboard.a,
    gamepad.axes[0] < -EDGE_THRESHOLD,
    gamepad.buttons[14]
  );
  const right = movementAction(
    keyboard.arrowright,
    keyboard.d,
    gamepad.axes[0] > EDGE_THRESHOLD,
    gamepad.buttons[15]
  );
  const launch = movementAction(
    keyboard.space,
    keyboard[' '],
    gamepad.buttons[0]
  );
  const pause = movementAction(keyboard.p, gamepad.buttons[9]);
  const reset = movementAction(keyboard.r, gamepad.buttons[1]);
  return {
    moveLeft: left,
    moveRight: right,
    launchPressed: launch,
    pausePressed: pause,
    resetPressed: reset,
  };
}

/**
 * Combine action signals.
 * @param {...unknown} signals Action signals.
 * @returns {boolean} Whether any signal is active.
 */
function movementAction(...signals) {
  return signals.some(Boolean);
}

/**
 * Apply gameplay actions to the current state before stepping.
 * @param {BeaconState} state - Mutable game state.
 * @param {BeaconInputState} inputState - Normalized input for this frame.
 * @returns {void}
 */
export function applyGameplayInput(state, inputState) {
  const a = inputState.actions;
  const p = inputState.previousActions;
  togglePause(state, a, p);
  launchGame(state, a, p);
  resetGame(state, a, p);

  if (state.status === 'won' || state.status === 'lost') return;
  if (a.moveLeft && !a.moveRight) state.paddle.x -= state.paddle.speed;
  if (a.moveRight && !a.moveLeft) state.paddle.x += state.paddle.speed;
  state.paddle.x = Math.max(
    0,
    Math.min(state.width - state.paddle.width, state.paddle.x)
  );
}

/**
 * Toggle pause on a newly pressed pause action.
 * @param {BeaconState} state Mutable game state.
 * @param {BeaconActions} actions Current actions.
 * @param {BeaconActions} previous Previous actions.
 * @returns {void}
 */
function togglePause(state, actions, previous) {
  if (actions.pausePressed && !previous.pausePressed)
    state.paused = !state.paused;
}

/**
 * Launch the game on a newly pressed launch action.
 * @param {BeaconState} state Mutable game state.
 * @param {BeaconActions} actions Current actions.
 * @param {BeaconActions} previous Previous actions.
 * @returns {void}
 */
function launchGame(state, actions, previous) {
  if (!actions.launchPressed || previous.launchPressed) return;
  if (state.status !== 'ready' && state.status !== 'lost') return;
  if (state.lives <= 0) state.lives = 1;
  state.status = 'running';
  state.orb.stuckToPaddle = false;
}

/**
 * Reset the game on a newly pressed reset action.
 * @param {BeaconState} state Mutable game state.
 * @param {BeaconActions} actions Current actions.
 * @param {BeaconActions} previous Previous actions.
 * @returns {void}
 */
function resetGame(state, actions, previous) {
  if (!actions.resetPressed || previous.resetPressed) return;
  state.status = 'ready';
  state.score = 0;
  state.lives = state.initialLives ?? DEFAULT_LIVES;
  state.paused = false;
  state.simulationSpeed = 1;
  state.lastActivatedBeaconId = null;
  state.beacons.forEach(beacon => {
    beacon.active = false;
    beacon.hitCount = 0;
  });
  state.links = [];
  state.orb.stuckToPaddle = true;
}

/**
 * Advance one simulation step.
 * @param {BeaconState} state - Mutable game state.
 * @returns {void}
 */
export function stepSimulation(state) {
  if (state.orb.stuckToPaddle) {
    state.orb.x = Math.round(state.paddle.x + state.paddle.width / 2);
    state.orb.y = state.paddle.y - state.orb.radius - 1;
    return;
  }

  state.orb.x += state.orb.vx;
  state.orb.y += state.orb.vy;
  resolveWalls(state);
  resolvePaddle(state);
  resolveBeacons(state);

  if (state.orb.y - state.orb.radius > state.height) {
    state.lives -= 1;
    state.status = 'ready';
    if (state.lives <= 0) state.status = 'lost';
    resetOrbToPaddle(state);
  }

  if (state.beacons.every(beacon => !beacon.required || beacon.active))
    state.status = 'won';
}

/**
 * Re-stick the orb to the paddle after reset or life loss.
 * @param {BeaconState} state - Mutable game state.
 * @returns {void}
 */
function resetOrbToPaddle(state) {
  state.orb.stuckToPaddle = true;
  state.orb.x = Math.round(state.paddle.x + state.paddle.width / 2);
  state.orb.y = state.paddle.y - state.orb.radius - 1;
  state.orb.vx = DEFAULT_ORB_SPEED_X;
  state.orb.vy = DEFAULT_ORB_SPEED_Y;
}

/**
 * Validate a persisted toy snapshot.
 * @param {unknown} value - Candidate persisted state.
 * @returns {BeaconState | null} Valid state or null when rejected.
 */
function normalizeState(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value.version !== 1
  )
    return null;
  return value;
}

/**
 * Resolve orb collisions against the arena walls.
 * @param {BeaconState} state - Mutable game state.
 * @returns {void}
 */
export function resolveWalls(state) {
  if (state.orb.x - state.orb.radius <= 0) {
    state.orb.x = state.orb.radius;
    state.orb.vx = Math.abs(state.orb.vx);
  }
  if (state.orb.x + state.orb.radius >= state.width) {
    state.orb.x = state.width - state.orb.radius;
    state.orb.vx = -Math.abs(state.orb.vx);
  }
  if (state.orb.y - state.orb.radius <= 18) {
    state.orb.y = 18 + state.orb.radius;
    state.orb.vy = Math.abs(state.orb.vy);
  }
}

/**
 * Resolve orb collisions against the paddle.
 * @param {BeaconState} state - Mutable game state.
 * @returns {void}
 */
export function resolvePaddle(state) {
  const paddle = state.paddle;
  const orb = state.orb;
  const withinX =
    orb.x >= paddle.x - orb.radius &&
    orb.x <= paddle.x + paddle.width + orb.radius;
  const withinY =
    orb.y + orb.radius >= paddle.y &&
    orb.y + orb.radius <= paddle.y + paddle.height + Math.abs(orb.vy);
  if (orb.vy > 0 && withinX && withinY) {
    orb.y = paddle.y - orb.radius - 1;
    orb.vy = -Math.abs(orb.vy);
    const offset = (orb.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    orb.vx = Math.max(-3, Math.min(3, offset * 2.2)) || 1;
  }
}

/**
 * Resolve orb collisions against beacon targets.
 * @param {BeaconState} state - Mutable game state.
 * @returns {void}
 */
export function resolveBeacons(state) {
  for (const beacon of state.beacons) {
    const dx = state.orb.x - beacon.x;
    const dy = state.orb.y - beacon.y;
    const distance = Math.hypot(dx, dy);
    if (distance > beacon.radius + state.orb.radius) continue;
    const wasActive = beacon.active;
    beacon.hitCount += 1;
    beacon.active = true;
    state.orb.vy = signedMagnitude(state.orb.vy, dy >= 0);
    state.orb.vx = signedMagnitude(state.orb.vx, dx >= 0);
    if (!wasActive) {
      state.score += 10;
      if (state.lastActivatedBeaconId) {
        state.links.push({
          from: state.lastActivatedBeaconId,
          to: beacon.id,
          active: true,
        });
      }
      state.lastActivatedBeaconId = beacon.id;
    }
  }
}

/**
 * Convert the game state into canvas primitives.
 * @param {BeaconState} state - Current game state.
 * @returns {{ width: number, height: number, shapes: Array<Record<string, unknown>> }} Canvas payload.
 */
export function toCanvasPayload(state) {
  return {
    width: state.width,
    height: state.height,
    shapes: [
      {
        type: 'rect',
        x: 0,
        y: 0,
        width: state.width,
        height: state.height,
        fill: '#09111d',
      },
      ...state.links
        .map(link => {
          const from = state.beacons.find(beacon => beacon.id === link.from);
          const to = state.beacons.find(beacon => beacon.id === link.to);
          if (!from || !to) return null;
          return {
            type: 'line',
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            stroke: '#49d8ff',
            lineWidth: 1,
          };
        })
        .filter(Boolean),
      ...state.beacons.map(beacon => ({
        type: 'circle',
        x: beacon.x,
        y: beacon.y,
        radius: beacon.radius,
        fill: beaconColor(beacon.active),
        stroke: beaconStroke(beacon.required),
      })),
      {
        type: 'rect',
        x: state.paddle.x,
        y: state.paddle.y,
        width: state.paddle.width,
        height: state.paddle.height,
        fill: '#d7f3ff',
      },
      {
        type: 'circle',
        x: state.orb.x,
        y: state.orb.y,
        radius: state.orb.radius,
        fill: '#f8fafc',
      },
      {
        type: 'text',
        x: 8,
        y: 14,
        text: `Score ${state.score} Lives ${state.lives} ${state.status.toUpperCase()}`,
        fill: '#dbeafe',
        font: '11px monospace',
        align: 'left',
        baseline: 'alphabetic',
      },
    ],
  };
}
