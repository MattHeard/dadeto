import { numberOr, parseObjectPayload, stringOr } from './plotShared.js';

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 180;
const BACKGROUND = '#f8f6f2';
const FOREGROUND = '#1f2937';

/**
 * @param {string} inputString JSON string describing the drawing.
 * @returns {{width?: number,height?: number,background?: string,accent?: string,shapes?: Array<Record<string, unknown>>} | null} Parsed payload.
 */
export function parseCanvasDoodle(inputString) {
  return parseObjectPayload(inputString, parsed =>
    /** @type {{
     *   width?: number,
     *   height?: number,
     *   background?: string,
     *   accent?: string,
     *   shapes?: Array<Record<string, unknown>>,
     * }} */ (parsed)
  );
}

/**
 * @returns {{width:number,height:number,shapes:Array<Record<string, unknown>>}} Fallback payload.
 */
export function createCanvasDoodleFallbackPayload() {
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
 * @param {{width?: number,height?: number,background?: string,accent?: string}} parsed Parsed options.
 * @param {() => number} getRandomNumber Random helper.
 * @returns {Array<Record<string, unknown>>} Drawing shapes.
 */
export function buildCanvasDoodleShapes(parsed, getRandomNumber) {
  const hue = Math.floor(getRandomNumber() * 360);
  const width = parsed.width ?? CANVAS_WIDTH;
  const height = parsed.height ?? CANVAS_HEIGHT;
  const background = parsed.background ?? BACKGROUND;
  const accent = parsed.accent ?? FOREGROUND;
  const bandHeight = Math.max(12, Math.round(height * 0.18));
  const pad = Math.round(Math.min(width, height) * 0.12);

  return [
    {
      type: 'rect',
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
    },
    {
      type: 'rect',
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: bandHeight,
      fill: `hsl(${hue}, 70%, 65%)`,
    },
    {
      type: 'circle',
      x: Math.round(width * 0.32),
      y: Math.round(height * 0.58),
      radius: Math.round(Math.min(width, height) * 0.16),
      fill: `hsl(${(hue + 120) % 360}, 70%, 60%)`,
    },
    {
      type: 'circle',
      x: Math.round(width * 0.68),
      y: Math.round(height * 0.58),
      radius: Math.round(Math.min(width, height) * 0.16),
      fill: `hsl(${(hue + 240) % 360}, 70%, 60%)`,
    },
    {
      type: 'line',
      x1: pad,
      y1: height - pad,
      x2: width - pad,
      y2: height - pad,
      stroke: accent,
      lineWidth: 6,
    },
  ];
}

/**
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{shapes?: Array<Record<string, unknown>>}} payload Drawing payload.
 * @returns {void}
 */
export function drawCanvasDoodle(context, canvas, payload) {
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
 *
 * @param {CanvasRenderingContext2D} context
 * @param {Record<string, unknown> & {type?: string}} shape
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
 *
 * @param {CanvasRenderingContext2D} context
 * @param {Record<string, unknown> & {type?: string}} shape
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
 *
 * @param {CanvasRenderingContext2D} context
 * @param {Record<string, unknown> & {type?: string}} shape
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
