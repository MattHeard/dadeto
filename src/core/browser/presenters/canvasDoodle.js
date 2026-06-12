import { createPresenterRoot } from './browserPresentersCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

const ROOT_CLASS = 'canvas-doodle-output';
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 180;
const BACKGROUND = '#f8f6f2';
const FOREGROUND = '#1f2937';

/**
 * Parse a canvas doodle payload.
 * @param {string} inputString JSON string describing the drawing.
 * @returns {{width?: number,height?: number,shapes?: Array<Record<string, unknown>>} | null} Parsed payload.
 */
function parseCanvasDoodle(inputString) {
  try {
    const parsed = JSON.parse(inputString);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Create a canvas element for a doodle payload.
 * @param {string} inputString JSON string describing the drawing.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Rendered canvas container.
 */
export function createCanvasDoodleElement(inputString, dom) {
  const payload = parseCanvasDoodle(inputString) || createFallbackPayload();
  const root = createPresenterRoot(dom, ROOT_CLASS);
  const canvas = /** @type {HTMLCanvasElement} */ (dom.createElement('canvas'));
  canvas.width = toCanvasDimension(payload.width, CANVAS_WIDTH);
  canvas.height = toCanvasDimension(payload.height, CANVAS_HEIGHT);
  dom.appendChild(root, canvas);

  const context = canvas.getContext('2d');
  if (context) {
    drawCanvasDoodle(context, canvas, payload);
  }

  return root;
}

/**
 * @returns {{width:number,height:number,shapes:Array<Record<string, unknown>>}} Fallback payload.
 */
function createFallbackPayload() {
  return {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    shapes: [
      { type: 'rect', x: 20, y: 20, width: 280, height: 140, fill: '#fde68a' },
      { type: 'circle', x: 90, y: 90, radius: 34, fill: '#60a5fa' },
      { type: 'circle', x: 220, y: 90, radius: 34, fill: '#f472b6' },
      {
        type: 'line',
        x1: 80,
        y1: 130,
        x2: 240,
        y2: 130,
        stroke: '#111827',
        lineWidth: 6,
      },
    ],
  };
}

/**
 * @param {unknown} value Candidate dimension.
 * @param {number} fallback Default dimension.
 * @returns {number} Safe canvas dimension.
 */
function toCanvasDimension(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{shapes?: Array<Record<string, unknown>>}} payload Drawing payload.
 * @returns {void}
 */
function drawCanvasDoodle(context, canvas, payload) {
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = FOREGROUND;
  context.lineWidth = 2;

  for (const shape of payload.shapes || []) {
    drawShape(context, shape);
  }
}

/**
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {Record<string, unknown>} shape Shape description.
 * @returns {void}
 */
function drawShape(context, shape) {
  if (shape.type === 'rect') {
    drawRect(context, shape);
    return;
  }
  if (shape.type === 'circle') {
    drawCircle(context, shape);
    return;
  }
  if (shape.type === 'line') {
    drawLine(context, shape);
  }
}

/**
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {Record<string, unknown>} shape Rectangle description.
 * @returns {void}
 */
function drawRect(context, shape) {
  const x = numberOr(shape.x, 0);
  const y = numberOr(shape.y, 0);
  const width = numberOr(shape.width, 10);
  const height = numberOr(shape.height, 10);
  context.fillStyle = stringOr(shape.fill, '#cbd5e1');
  context.fillRect(x, y, width, height);
}

/**
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {Record<string, unknown>} shape Circle description.
 * @returns {void}
 */
function drawCircle(context, shape) {
  const x = numberOr(shape.x, 0);
  const y = numberOr(shape.y, 0);
  const radius = numberOr(shape.radius, 8);
  context.beginPath();
  context.fillStyle = stringOr(shape.fill, '#cbd5e1');
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

/**
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {Record<string, unknown>} shape Line description.
 * @returns {void}
 */
function drawLine(context, shape) {
  const x1 = numberOr(shape.x1, 0);
  const y1 = numberOr(shape.y1, 0);
  const x2 = numberOr(shape.x2, 0);
  const y2 = numberOr(shape.y2, 0);
  context.beginPath();
  context.strokeStyle = stringOr(shape.stroke, FOREGROUND);
  context.lineWidth = numberOr(shape.lineWidth, 2);
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

/**
 * @param {unknown} value Candidate number.
 * @param {number} fallback Default number.
 * @returns {number} Safe number.
 */
function numberOr(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * @param {unknown} value Candidate string.
 * @param {string} fallback Default string.
 * @returns {string} Safe string.
 */
function stringOr(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}
