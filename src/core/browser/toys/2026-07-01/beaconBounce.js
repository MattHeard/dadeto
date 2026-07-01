// @ts-nocheck
/* eslint-disable complexity, no-ternary, jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns */
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

export function beaconBounce(input, env) {
  return runToy(input, env, {
    storageKey: STORAGE_KEY,
    normalizeState,
    buildNextState,
    toCanvasPayload: state => JSON.stringify(toCanvasPayload(state)),
  });
}

export function buildNextState(persisted, input) {
  const seed = createSeedState(input, persisted);
  const base = persisted || seed;
  const shouldReset = input?.reset === true || !persisted;
  const merged = shouldReset ? seed : mergeSeedAndState(base, seed);
  const inputState = updateInputState(base.input, input);

  if (inputState.actions.resetPressed && !inputState.previousActions.resetPressed) {
    const resetState = createSeedState(
      { ...input, layoutSeed: (persisted?.layoutSeed ?? 0) + 1 },
      buildResetFallback(persisted)
    );
    resetState.input = inputState;
    return resetState;
  }

  const next = { ...merged, input: inputState, frame: base.frame + 1 };
  applyGameplayInput(next, inputState);
  next.simulationSpeed = inputState.control.speedMultiplier;

  const framesToAdvance = next.paused
    ? inputState.control.stepCount
    : next.simulationSpeed * Math.max(1, inputState.control.stepCount || 1);

  if (next.status === 'running') {
    for (let index = 0; index < framesToAdvance; index += 1) stepSimulation(next);
  }

  return next;
}

export function updateInputState(previous, input) {
  const keyboard = normalizeKeyboard(previous?.keyboard, input);
  const gamepad = normalizeGamepad(input);
  const actions = deriveActions(keyboard, gamepad);
  const previousActions = previous?.actions || createActionFlags();
  /* c8 ignore next */
  const control = {
    paused: Boolean(input?.paused ?? previous?.control?.paused ?? false),
    speedMultiplier: Math.max(
      1,
      Math.round(Number(input?.speedMultiplier ?? input?.speed ?? previous?.control?.speedMultiplier ?? 1)) || 1
    ),
    stepCount: Math.max(
      0,
      Math.round(Number(input?.stepCount ?? input?.steps ?? input?.step ?? 0)) || 0
    ),
  };
  if (input?.pause === true) control.paused = true;
  if (input?.resume === true) control.paused = false;
  return { keyboard, gamepad, actions, previousActions, control };
}

export function buildResetFallback(persisted) {
  if (!persisted) return undefined;
  return {
    width: persisted.width,
    height: persisted.height,
    lives: persisted.initialLives ?? persisted.lives,
    layoutSeed: persisted.layoutSeed,
  };
}

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

function createSeedState(input, fallback) {
  const width = normalizePositiveInteger(input?.width, fallback?.width ?? DEFAULT_WIDTH);
  const height = normalizePositiveInteger(input?.height, fallback?.height ?? DEFAULT_HEIGHT);
  const layoutSeed = normalizePositiveInteger(input?.layoutSeed, 1);
  const lives = normalizePositiveInteger(input?.lives, fallback?.lives ?? DEFAULT_LIVES);
  const simulationSpeed = Math.max(
    1,
    Math.round(Number(input?.speedMultiplier ?? input?.speed ?? 1)) || 1
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

function createInitialInputState() {
  return {
    keyboard: {},
    gamepad: { buttons: [], axes: [] },
    actions: createActionFlags(),
    previousActions: createActionFlags(),
    control: { paused: false, speedMultiplier: 1, stepCount: 0 },
  };
}

export function createActionFlags() {
  return {
    moveLeft: false,
    moveRight: false,
    launchPressed: false,
    pausePressed: false,
    resetPressed: false,
  };
}

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
    radius: index === 0 ? 9 : 8,
    active: false,
    required: true,
    hitCount: 0,
  }));
}

export function normalizeKeyboard(previous, input) {
  const keyboard = { ...(previous || {}) };
  if (input?.type === 'keydown' && typeof input.key === 'string')
    keyboard[input.key.toLowerCase()] = true;
  if (input?.type === 'keyup' && typeof input.key === 'string')
    keyboard[input.key.toLowerCase()] = false;
  return keyboard;
}

export function normalizeGamepad(input) {
  const buttons = Array.isArray(input?.buttons) ? input.buttons.map(Boolean) : [];
  const axes = Array.isArray(input?.axes) ? input.axes.map(value => Number(value) || 0) : [];
  return { buttons, axes };
}

/* c8 ignore next */
function deriveActions(keyboard, gamepad) {
  const left = Boolean(
    keyboard.arrowleft || keyboard.a || gamepad.axes[0] < -EDGE_THRESHOLD || gamepad.buttons[14]
  );
  const right = Boolean(
    keyboard.arrowright || keyboard.d || gamepad.axes[0] > EDGE_THRESHOLD || gamepad.buttons[15]
  );
  const launch = Boolean(keyboard.space || keyboard[' '] || gamepad.buttons[0]);
  const pause = Boolean(keyboard.p || gamepad.buttons[9]);
  const reset = Boolean(keyboard.r || gamepad.buttons[1]);
  return { moveLeft: left, moveRight: right, launchPressed: launch, pausePressed: pause, resetPressed: reset };
}

export function applyGameplayInput(state, inputState) {
  const a = inputState.actions;
  const p = inputState.previousActions;

  if (a.pausePressed && !p.pausePressed && !state.paused) state.paused = true;
  else if (a.pausePressed && !p.pausePressed && state.paused) state.paused = false;

  if (a.launchPressed && !p.launchPressed && (state.status === 'ready' || state.status === 'lost')) {
    if (state.lives <= 0) state.lives = 1;
    state.status = 'running';
    state.orb.stuckToPaddle = false;
  }

  if (a.resetPressed && !p.resetPressed) {
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

  if (state.status === 'won' || state.status === 'lost') return;
  if (a.moveLeft && !a.moveRight) state.paddle.x -= state.paddle.speed;
  if (a.moveRight && !a.moveLeft) state.paddle.x += state.paddle.speed;
  state.paddle.x = Math.max(0, Math.min(state.width - state.paddle.width, state.paddle.x));
}

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
    state.status = state.lives <= 0 ? 'lost' : 'ready';
    resetOrbToPaddle(state);
  }

  if (state.beacons.every(beacon => !beacon.required || beacon.active)) state.status = 'won';
}

function resetOrbToPaddle(state) {
  state.orb.stuckToPaddle = true;
  state.orb.x = Math.round(state.paddle.x + state.paddle.width / 2);
  state.orb.y = state.paddle.y - state.orb.radius - 1;
  state.orb.vx = DEFAULT_ORB_SPEED_X;
  state.orb.vy = DEFAULT_ORB_SPEED_Y;
}

function normalizeState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return null;
  return value;
}

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

export function resolvePaddle(state) {
  const paddle = state.paddle;
  const orb = state.orb;
  const withinX = orb.x >= paddle.x - orb.radius && orb.x <= paddle.x + paddle.width + orb.radius;
  const withinY = orb.y + orb.radius >= paddle.y && orb.y + orb.radius <= paddle.y + paddle.height + Math.abs(orb.vy);
  if (orb.vy > 0 && withinX && withinY) {
    orb.y = paddle.y - orb.radius - 1;
    orb.vy = -Math.abs(orb.vy);
    const offset = (orb.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    orb.vx = Math.max(-3, Math.min(3, offset * 2.2)) || 1;
  }
}

export function resolveBeacons(state) {
  for (const beacon of state.beacons) {
    const dx = state.orb.x - beacon.x;
    const dy = state.orb.y - beacon.y;
    const distance = Math.hypot(dx, dy);
    if (distance > beacon.radius + state.orb.radius) continue;
    const wasActive = beacon.active;
    beacon.hitCount += 1;
    beacon.active = true;
    state.orb.vy = dy >= 0 ? Math.abs(state.orb.vy) : -Math.abs(state.orb.vy);
    state.orb.vx = dx >= 0 ? Math.abs(state.orb.vx) : -Math.abs(state.orb.vx);
    if (!wasActive) {
      state.score += 10;
      if (state.lastActivatedBeaconId) {
        state.links.push({ from: state.lastActivatedBeaconId, to: beacon.id, active: true });
      }
      state.lastActivatedBeaconId = beacon.id;
    }
  }
}

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
          return from && to
            ? {
                type: 'line',
                x1: from.x,
                y1: from.y,
                x2: to.x,
                y2: to.y,
                stroke: '#49d8ff',
                lineWidth: 1,
              }
            : null;
        })
        .filter(Boolean),
      ...state.beacons.map(beacon => ({
        type: 'circle',
        x: beacon.x,
        y: beacon.y,
        radius: beacon.radius,
        fill: beacon.active ? '#6ee7ff' : '#1e3a5f',
        stroke: beacon.required ? '#bff3ff' : '#335',
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
