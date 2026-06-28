// @ts-nocheck
/* eslint-disable jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns, no-ternary, complexity, no-unused-vars */
import { parseJsonOrNull } from '../../../commonCore.js';
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

export function crystalBreaker(input, env) {
  const storage = getStorageAccessor(env);
  const persisted = readPersistedState(storage);
  const parsed = parseInput(input);
  const state = buildNextState(persisted, parsed);
  persistState(storage, state);
  return JSON.stringify(toCanvasPayload(state));
}

function getStorageAccessor(env) {
  if (!env || typeof env.get !== 'function') return null;
  const setter = env.get('setLocalPermanentData');
  return typeof setter === 'function' ? setter : null;
}

function readPersistedState(storage) {
  if (!storage) return null;
  return normalizeState(storage({})?.[STORAGE_KEY]);
}

function parseInput(input) {
  if (typeof input !== 'string' || input.trim() === '') return null;
  const parsed = parseJsonOrNull(input);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}

function buildNextState(persisted, input) {
  const seed = createSeedState(input, persisted);
  const base = persisted || seed;
  const shouldReset = input?.reset === true || !persisted;
  const merged = shouldReset ? seed : mergeSeedAndState(base, seed);
  const inputState = updateInputState(base.input, input);
  if (inputState.actions.resetPressed && !inputState.previousActions.resetPressed) {
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

function mergeSeedAndState(base, seed) {
  return {
    ...base,
    width: seed.width,
    height: seed.height,
    paddle: { ...base.paddle, y: Math.max(0, seed.height - 18 - base.paddle.height) },
    orb: { ...base.orb, radius: DEFAULT_ORB_RADIUS },
    crystals: base.crystals.filter(crystal => crystal.state !== 'shattered'),
  };
}

function createSeedState(input, fallback) {
  const width = normalizePositiveInteger(input?.width, fallback?.width ?? DEFAULT_WIDTH);
  const height = normalizePositiveInteger(input?.height, fallback?.height ?? DEFAULT_HEIGHT);
  const paddleWidth = normalizePositiveInteger(input?.paddleWidth, DEFAULT_PADDLE_WIDTH);
  const paddleHeight = normalizePositiveInteger(input?.paddleHeight, DEFAULT_PADDLE_HEIGHT);
  const paddleSpeed = normalizePositiveInteger(input?.paddleSpeed, DEFAULT_PADDLE_SPEED);
  const orbRadius = normalizePositiveInteger(input?.orbRadius, DEFAULT_ORB_RADIUS);
  const layoutSeed = normalizePositiveInteger(input?.layoutSeed, 1);
  return {
    version: 1,
    width,
    height,
    frame: 0,
    status: 'ready',
    score: 0,
    lives: normalizePositiveInteger(input?.lives, fallback?.lives ?? DEFAULT_LIVES),
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

function createInitialInputState() {
  return {
    keyboard: {},
    gamepad: { buttons: [], axes: [] },
    actions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false },
    previousActions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false },
  };
}

function normalizeState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return null;
  const candidate = value;
  return {
    version: 1,
    width: normalizePositiveInteger(candidate.width, DEFAULT_WIDTH),
    height: normalizePositiveInteger(candidate.height, DEFAULT_HEIGHT),
    frame: normalizePositiveInteger(candidate.frame, 0),
    status: ['ready', 'running', 'paused', 'won', 'lost'].includes(candidate.status) ? candidate.status : 'ready',
    score: normalizePositiveInteger(candidate.score, 0),
    lives: normalizePositiveInteger(candidate.lives, DEFAULT_LIVES),
    combo: normalizePositiveInteger(candidate.combo, 0),
    input: normalizeInputState(candidate.input),
    paddle: normalizePaddle(candidate.paddle),
    orb: normalizeOrb(candidate.orb),
    crystals: normalizeCrystalsFromState(candidate.crystals),
  };
}

function normalizeInputState(value) {
  return {
    keyboard: normalizeBooleanRecord(value?.keyboard),
    gamepad: { buttons: Array.isArray(value?.gamepad?.buttons) ? value.gamepad.buttons.map(next => next === true) : [], axes: Array.isArray(value?.gamepad?.axes) ? value.gamepad.axes.map(next => Number(next) || 0) : [] },
    actions: normalizeActions(value?.actions),
    previousActions: normalizeActions(value?.previousActions),
  };
}

function normalizeBooleanRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, next]) => [key, next === true]));
}

function normalizeActions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false };
  return { moveLeft: value.moveLeft === true, moveRight: value.moveRight === true, launchPressed: value.launchPressed === true, pausePressed: value.pausePressed === true, resetPressed: value.resetPressed === true };
}

function normalizePaddle(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { x: 156, y: 220, width: DEFAULT_PADDLE_WIDTH, height: DEFAULT_PADDLE_HEIGHT, speed: DEFAULT_PADDLE_SPEED };
  return { x: normalizePositiveInteger(value.x, 156), y: normalizePositiveInteger(value.y, 220), width: normalizePositiveInteger(value.width, DEFAULT_PADDLE_WIDTH), height: normalizePositiveInteger(value.height, DEFAULT_PADDLE_HEIGHT), speed: normalizePositiveInteger(value.speed, DEFAULT_PADDLE_SPEED) };
}

function normalizeOrb(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { x: 180, y: 200, vx: DEFAULT_ORB_SPEED_X, vy: DEFAULT_ORB_SPEED_Y, radius: DEFAULT_ORB_RADIUS, stuckToPaddle: true };
  return { x: Number(value.x) || 180, y: Number(value.y) || 200, vx: Number(value.vx) || DEFAULT_ORB_SPEED_X, vy: Number(value.vy) || DEFAULT_ORB_SPEED_Y, radius: normalizePositiveInteger(value.radius, DEFAULT_ORB_RADIUS), stuckToPaddle: value.stuckToPaddle === true };
}

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
      result.push({ id: `crystal-${id++}`, x: left + col * 58 + (row % 2 ? 10 : 0), y: top + row * 28, width: 24, height: 14, hp, maxHp: hp, fracture: 0, state: 'whole' });
    }
  }
  return result;
}

function normalizeCrystalsFromState(value) {
  if (!Array.isArray(value)) return normalizeCrystals(DEFAULT_WIDTH, DEFAULT_HEIGHT, 1);
  return value.map((crystal, index) => ({
    id: typeof crystal?.id === 'string' ? crystal.id : `crystal-${index + 1}`,
    x: Number(crystal?.x) || 0,
    y: Number(crystal?.y) || 0,
    width: normalizePositiveInteger(crystal?.width, 24),
    height: normalizePositiveInteger(crystal?.height, 14),
    hp: normalizePositiveInteger(crystal?.hp, 1),
    maxHp: normalizePositiveInteger(crystal?.maxHp, 1),
    fracture: normalizePositiveInteger(crystal?.fracture, 0),
    state: ['whole', 'fractured', 'shattered'].includes(crystal?.state) ? crystal.state : 'whole',
  }));
}

function updateInputState(previous, input) {
  const nextActions = parseActions(input, previous);
  return { ...previous, actions: nextActions, previousActions: previous.actions };
}

function parseActions(input, previous) {
  const normalizedKey = normalizeKeyName(input?.key);
  const keys =
    input?.type === 'keydown'
      ? { [normalizedKey]: true }
      : input?.type === 'keyup'
        ? { [normalizedKey]: false }
        : null;
  const keyboard = { ...previous.keyboard, ...(keys || {}) };
  return {
    moveLeft: keyboard.arrowleft === true || keyboard.a === true || keyboard.left === true,
    moveRight: keyboard.arrowright === true || keyboard.d === true || keyboard.right === true,
    launchPressed: input?.type === 'keydown' && (normalizedKey === 'space' || normalizedKey === ' '),
    pausePressed: input?.type === 'keydown' && normalizedKey === 'p',
    resetPressed: input?.type === 'keydown' && normalizedKey === 'r',
  };
}

function normalizeKeyName(key) {
  const value = String(key || '').toLowerCase();
  if (value === ' ') return 'space';
  return value;
}

function applyGameplayInput(state, inputState) {
  if (inputState.actions.resetPressed && !inputState.previousActions.resetPressed) {
    state.status = 'ready';
    return;
  }
  if (inputState.actions.pausePressed && !inputState.previousActions.pausePressed) {
    state.status = state.status === 'paused' ? 'running' : state.status === 'ready' ? 'running' : state.status === 'running' ? 'paused' : state.status;
  }
  if (inputState.actions.launchPressed && !inputState.previousActions.launchPressed && state.orb.stuckToPaddle) {
    state.status = 'running';
    state.orb.stuckToPaddle = false;
    state.orb.vx = DEFAULT_ORB_SPEED_X;
    state.orb.vy = DEFAULT_ORB_SPEED_Y;
  }
  if (inputState.actions.moveLeft) state.paddle.x -= state.paddle.speed;
  if (inputState.actions.moveRight) state.paddle.x += state.paddle.speed;
  state.paddle.x = Math.max(0, Math.min(state.width - state.paddle.width, state.paddle.x));
  if (state.orb.stuckToPaddle) {
    state.orb.x = Math.round(state.paddle.x + state.paddle.width / 2);
    state.orb.y = state.paddle.y - state.orb.radius - 1;
  }
}

function stepSimulation(state) {
  state.orb.x += state.orb.vx;
  state.orb.y += state.orb.vy;
  if (state.orb.x - state.orb.radius <= 0 || state.orb.x + state.orb.radius >= state.width) state.orb.vx *= -1;
  if (state.orb.y - state.orb.radius <= HUD_HEIGHT) state.orb.vy = Math.abs(state.orb.vy);
  if (orbHitsPaddle(state.orb, state.paddle)) {
    state.orb.vy = -Math.abs(state.orb.vy);
    state.orb.vx += (state.orb.x - (state.paddle.x + state.paddle.width / 2)) / 18;
    state.combo = 0;
  }
  for (const crystal of state.crystals) {
    if (crystal.state === 'shattered' || !orbHitsCrystal(state.orb, crystal)) continue;
    crystal.hp = Math.max(0, crystal.hp - 1);
    crystal.fracture += 1;
    crystal.state = crystal.hp <= 0 ? 'shattered' : crystal.hp < crystal.maxHp ? 'fractured' : 'whole';
    state.score += crystal.hp <= 0 ? 10 : 1;
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
  if (state.crystals.every(crystal => crystal.state === 'shattered')) state.status = 'won';
}

function orbHitsPaddle(orb, paddle) {
  return orb.y + orb.radius >= paddle.y && orb.y - orb.radius <= paddle.y + paddle.height && orb.x >= paddle.x && orb.x <= paddle.x + paddle.width && orb.vy > 0;
}

function orbHitsCrystal(orb, crystal) {
  return orb.x + orb.radius >= crystal.x && orb.x - orb.radius <= crystal.x + crystal.width && orb.y + orb.radius >= crystal.y && orb.y - orb.radius <= crystal.y + crystal.height;
}

function toCanvasPayload(state) {
  return {
    width: state.width,
    height: state.height,
    shapes: [
      { type: 'rect', x: 0, y: 0, width: state.width, height: state.height, fill: '#08111f' },
      { type: 'rect', x: 0, y: 0, width: state.width, height: HUD_HEIGHT, fill: '#0f172a' },
      { type: 'text', x: 8, y: 16, text: `Score ${state.score}`, fill: '#dbeafe', font: '12px monospace', align: 'left', baseline: 'alphabetic' },
      { type: 'text', x: 118, y: 16, text: `Lives ${state.lives}`, fill: '#dbeafe', font: '12px monospace', align: 'left', baseline: 'alphabetic' },
      { type: 'text', x: 198, y: 16, text: `Crystals ${state.crystals.filter(c => c.state !== 'shattered').length}`, fill: '#dbeafe', font: '12px monospace', align: 'left', baseline: 'alphabetic' },
      { type: 'text', x: 298, y: 16, text: `Status ${state.status.toUpperCase()}`, fill: '#dbeafe', font: '12px monospace', align: 'left', baseline: 'alphabetic' },
      ...state.crystals.filter(crystal => crystal.state !== 'shattered').map(crystal => ({
        type: 'rect',
        x: crystal.x,
        y: crystal.y,
        width: crystal.width,
        height: crystal.height,
        fill: crystal.state === 'fractured' ? '#8dd3ff' : '#5eead4',
      })),
      { type: 'rect', x: state.paddle.x, y: state.paddle.y, width: state.paddle.width, height: state.paddle.height, fill: '#f59e0b' },
      { type: 'circle', x: state.orb.x, y: state.orb.y, radius: state.orb.radius, fill: '#f8fafc' },
    ],
  };
}

function persistState(storage, state) {
  if (!storage) return;
  storage({ [STORAGE_KEY]: state });
}
