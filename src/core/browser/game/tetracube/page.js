import {
  adjustTetracubePreview,
  createTetracubeWorld,
  getTetracubePreview,
  mineTetracube,
  moveTetracubePlayer,
  placeOfferedTetracube,
  resetTetracubeWorld,
  rotateOfferedTetracube,
  targetTetracubePiece,
  turnTetracubeView,
  undoTetracubeWorld,
} from './world.js';
import { drawTetracubeFrame } from './renderer.js';

/** @typedef {import('./world.js').TetracubeWorldState} TetracubeWorldState */
/** @typedef {{documentObj:Document,windowObj:Window,requestFrame:(callback:(timestamp:number)=>void)=>number,cancelFrame:(frame:number)=>void,initialWorld?:TetracubeWorldState}} TetracubePageEnvironment */

const MOVEMENT_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'q',
  'e',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
]);

/**
 * Register canvas keyboard input.
 * @param {HTMLCanvasElement} canvas Game canvas.
 * @param {(event:KeyboardEvent)=>void} keyDown Keydown handler.
 * @param {(event:KeyboardEvent)=>void} keyUp Keyup handler.
 * @returns {() => void} Listener cleanup.
 */
function registerKeyboardListeners(canvas, keyDown, keyUp) {
  canvas.addEventListener('keydown', keyDown);
  canvas.addEventListener('keyup', keyUp);
  return () => {
    canvas.removeEventListener('keydown', keyDown);
    canvas.removeEventListener('keyup', keyUp);
  };
}

/**
 * Register canvas pointer input.
 * @param {HTMLCanvasElement} canvas Game canvas.
 * @param {(event:PointerEvent)=>void} pointerDown Pointerdown handler.
 * @param {(event:PointerEvent)=>void} pointerMove Pointermove handler.
 * @param {()=>void} stopDragging Pointer release handler.
 * @returns {() => void} Listener cleanup.
 */
function registerPointerListeners(
  canvas,
  pointerDown,
  pointerMove,
  stopDragging
) {
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);
  canvas.addEventListener('contextmenu', preventContextMenu);
  return () => {
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', stopDragging);
    canvas.removeEventListener('pointercancel', stopDragging);
    canvas.removeEventListener('contextmenu', preventContextMenu);
  };
}

/**
 * Register page-level keyboard release handling.
 * @param {Document} documentObj Browser document.
 * @param {(event:KeyboardEvent)=>void} keyUp Keyup handler.
 * @returns {() => void} Listener cleanup.
 */
function registerDocumentListeners(documentObj, keyUp) {
  documentObj.addEventListener('keyup', keyUp);
  return () => documentObj.removeEventListener('keyup', keyUp);
}

/**
 * Register window lifecycle handling.
 * @param {Window} windowObj Browser window.
 * @param {()=>void} clearPressed Clear held keys.
 * @param {()=>void} resizeCanvas Resize the drawing buffer.
 * @returns {() => void} Listener cleanup.
 */
function registerWindowListeners(windowObj, clearPressed, resizeCanvas) {
  windowObj.addEventListener('blur', clearPressed);
  windowObj.addEventListener('resize', resizeCanvas);
  return () => {
    windowObj.removeEventListener('blur', clearPressed);
    windowObj.removeEventListener('resize', resizeCanvas);
  };
}

/**
 * Register visible touch controls.
 * @param {HTMLButtonElement[]} actionButtons Touch buttons.
 * @param {(event:MouseEvent)=>void} handleTouchAction Button action.
 * @returns {() => void} Listener cleanup.
 */
function registerTouchListeners(actionButtons, handleTouchAction) {
  for (const button of actionButtons)
    button.addEventListener('click', handleTouchAction);
  return () => {
    for (const button of actionButtons)
      button.removeEventListener('click', handleTouchAction);
  };
}

/**
 * Resolve an injected starting state or create a fresh seeded world.
 * @param {TetracubePageEnvironment} environment Page dependencies.
 * @returns {TetracubeWorldState} Tetracube world.
 */
function resolveInitialWorld(environment) {
  return environment.initialWorld ?? createTetracubeWorld();
}

/**
 * Start the standalone Tetracube canvas game.
 * @param {TetracubePageEnvironment} environment Injected page and animation dependencies.
 * @returns {() => void} Dispose all listeners and animation.
 */
export function startTetracubePage(environment) {
  const { documentObj, windowObj, requestFrame, cancelFrame } = environment;
  const canvas = /** @type {HTMLCanvasElement|null} */ (
    documentObj.querySelector('#tetracube-world')
  );
  const status = documentObj.querySelector('#tetracube-status');
  const pieceReadout = documentObj.querySelector('#piece-readout');
  const structureReadout = documentObj.querySelector('#structure-readout');
  if (!canvas || !status || !pieceReadout || !structureReadout) return () => {};
  const context = canvas.getContext('2d');
  if (!context) {
    status.textContent = 'The canvas renderer is unavailable in this browser.';
    return () => {};
  }
  const activeCanvas = /** @type {HTMLCanvasElement} */ (canvas);
  const activeContext = /** @type {CanvasRenderingContext2D} */ (context);
  const activeStatus = /** @type {HTMLElement} */ (status);
  const activePieceReadout = /** @type {HTMLElement} */ (pieceReadout);
  const activeStructureReadout = /** @type {HTMLElement} */ (structureReadout);

  let world = resolveInitialWorld(environment);
  let frame = 0;
  /** @type {number|null} */
  let lastTime = null;
  let dragging = false;
  /** @type {{x:number,y:number}|null} */
  let lastPointer = null;
  let disposed = false;
  const pressed = new Set();

  /**
   *
   */
  function resizeCanvas() {
    const bounds = activeCanvas.getBoundingClientRect();
    const ratio = Math.max(1, Math.min(2, windowObj.devicePixelRatio || 1));
    activeCanvas.width = Math.max(1, Math.round(bounds.width * ratio));
    activeCanvas.height = Math.max(1, Math.round(bounds.height * ratio));
  }

  /**
   *
   */
  function render() {
    resizeCanvas();
    drawTetracubeFrame(
      activeContext,
      world,
      activeCanvas.width,
      activeCanvas.height
    );
    const preview = getTetracubePreview(world);
    activeStatus.textContent = world.message;
    activePieceReadout.textContent = `${world.offered.shapeId} · ${world.offered.color}`;
    activeStructureReadout.textContent = `${
      world.construction.pieces.length
    } placed · preview ${preview.valid ? 'clear' : 'blocked'}`;
  }

  /**
   * Dispatch one keyboard or touch action.
   * @param {string} action Normalized action name.
   * @returns {void}
   */
  function runAction(action) {
    if (action === 'place') {
      world = placeOfferedTetracube(world).state;
    } else if (action === 'mine') {
      world = mineTetracube(world, targetTetracubePiece(world) || '').state;
    } else if (action === 'undo') {
      world = undoTetracubeWorld(world);
    } else if (action === 'reset') {
      world = resetTetracubeWorld(world);
    } else if (action.startsWith('rotate-')) {
      const [, axisInput, direction] = action.split('-');
      const axis = /** @type {'x'|'y'|'z'} */ (axisInput);
      world = rotateOfferedTetracube(
        world,
        axis,
        direction === 'left' ? -1 : 1
      );
    } else if (action.startsWith('move-')) {
      const movementByDirection =
        /** @type {Record<string,[number,number,number,number]>} */ ({
          forward: [1, 0, 0, 0.1],
          backward: [-1, 0, 0, 0.1],
          left: [0, -1, 0, 0.1],
          right: [0, 1, 0, 0.1],
          up: [0, 0, 1, 0.1],
          down: [0, 0, -1, 0.1],
        });
      const movement = movementByDirection[action.slice(5)];
      if (movement) world = moveTetracubePlayer(world, movement);
    } else if (action.startsWith('target-')) {
      const [, direction] = action.split('-');
      const { yaw } = world.player;
      const left = {
        x: Math.round(Math.sin(yaw)),
        y: -Math.round(Math.cos(yaw)),
      };
      const forward = {
        x: Math.round(Math.cos(yaw)),
        y: Math.round(Math.sin(yaw)),
      };
      const change = {
        left,
        right: { x: -left.x, y: -left.y },
        near: { x: -forward.x, y: -forward.y },
        far: forward,
        closer: { distance: -1 },
        farther: { distance: 1 },
      }[direction];
      if (change) world = adjustTetracubePreview(world, change);
    }
    render();
  }

  /**
   * Handle a one-shot key action or begin a held movement.
   * @param {KeyboardEvent} event Keyboard event.
   * @returns {void}
   */
  function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    if (MOVEMENT_KEYS.has(key)) {
      pressed.add(key);
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    const action = {
      enter: 'place',
      backspace: 'mine',
      z: 'undo',
      x: 'reset',
      r: 'rotate-x-right',
      f: 'rotate-x-left',
      t: 'rotate-y-right',
      g: 'rotate-y-left',
      y: 'rotate-z-right',
      h: 'rotate-z-left',
      j: 'target-left',
      l: 'target-right',
      i: 'target-near',
      k: 'target-far',
      '[': 'target-closer',
      ']': 'target-farther',
    }[key];
    if (action) {
      event.preventDefault();
      runAction(action);
    }
  }

  /**
   * Stop a held movement key.
   * @param {KeyboardEvent} event Keyboard event.
   * @returns {void}
   */
  function handleKeyUp(event) {
    pressed.delete(event.key.toLowerCase());
  }

  /**
   * Begin mouse or touch look input.
   * @param {PointerEvent} event Pointer event.
   * @returns {void}
   */
  function handlePointerDown(event) {
    dragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    activeCanvas.setPointerCapture?.(event.pointerId);
    activeCanvas.focus();
  }

  /**
   * Apply camera movement from a dragged pointer.
   * @param {PointerEvent} event Pointer event.
   * @returns {void}
   */
  function handlePointerMove(event) {
    if (!dragging || !lastPointer) return;
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    lastPointer = { x: event.clientX, y: event.clientY };
    world = turnTetracubeView(world, { yaw: dx * 0.006, pitch: -dy * 0.006 });
    render();
  }

  /**
   *
   */
  function stopDragging() {
    dragging = false;
    lastPointer = null;
  }

  /**
   * Run a game action from a visible touch button.
   * @param {MouseEvent} event Button event.
   * @returns {void}
   */
  function handleTouchAction(event) {
    const button = /** @type {HTMLButtonElement|null} */ (event.currentTarget);
    const action = button?.dataset.action;
    if (action) runAction(action);
  }

  /**
   *
   * @param timestamp
   */
  /**
   * Advance held navigation and draw the current world.
   * @param {number} timestamp Animation frame timestamp.
   * @returns {void}
   */
  function animationStep(timestamp) {
    if (disposed) return;
    const seconds =
      lastTime === null
        ? 0
        : Math.max(0, Math.min(0.05, (timestamp - lastTime) / 1000));
    lastTime = timestamp;
    const forward = Number(pressed.has('w')) - Number(pressed.has('s'));
    const strafe = Number(pressed.has('d')) - Number(pressed.has('a'));
    const vertical = Number(pressed.has('e')) - Number(pressed.has('q'));
    const yaw =
      (Number(pressed.has('arrowright')) - Number(pressed.has('arrowleft'))) *
      seconds *
      1.4;
    const pitch =
      (Number(pressed.has('arrowup')) - Number(pressed.has('arrowdown'))) *
      seconds *
      1.2;
    if (forward || strafe || vertical)
      world = moveTetracubePlayer(world, [forward, strafe, vertical, seconds]);
    if (yaw || pitch) world = turnTetracubeView(world, { yaw, pitch });
    render();
    frame = requestFrame(animationStep);
  }

  const actionButtons = /** @type {HTMLButtonElement[]} */ ([
    ...documentObj.querySelectorAll('[data-action]'),
  ]);
  const removeListeners = [
    registerKeyboardListeners(activeCanvas, handleKeyDown, handleKeyUp),
    registerPointerListeners(
      activeCanvas,
      handlePointerDown,
      handlePointerMove,
      stopDragging
    ),
    registerDocumentListeners(documentObj, handleKeyUp),
    registerWindowListeners(windowObj, clearPressed, resizeCanvas),
    registerTouchListeners(actionButtons, handleTouchAction),
  ];
  render();
  frame = requestFrame(animationStep);

  return () => {
    disposed = true;
    cancelFrame(frame);
    for (const removeListener of removeListeners) removeListener();
  };

  /**
   *
   */
  function clearPressed() {
    pressed.clear();
  }
}

/**
 * Prevent right-click from opening a menu over the game screen.
 * @param {Event} event Browser context-menu event.
 * @returns {void}
 */
function preventContextMenu(event) {
  event.preventDefault();
}
