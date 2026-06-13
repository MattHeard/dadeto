import { parseJsonOrNull } from './jsonUtils.js';
import { whenOrNull } from '../commonCore.js';

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 280;
const DEFAULT_BACKGROUND = '#faf8f4';
const DEFAULT_AXES = '#111827';
const DEFAULT_GRID = '#d1d5db';
const DEFAULT_LINE = '#2563eb';

/**
 * @param {string} inputString JSON graph options.
 * @returns {{expression?: string,width?: number,height?: number,xMin?: number,xMax?: number,yMin?: number,yMax?: number,background?: string,axesColor?: string,gridColor?: string,lineColor?: string} | null} Parsed payload.
 */
export function parseGraphPlot(inputString) {
  const parsed = parseJsonOrNull(inputString);
  return whenOrNull(parsed && typeof parsed === 'object', () => parsed);
}

/**
 * @returns {{expression:string,width:number,height:number,xMin:number,xMax:number,yMin:number,yMax:number,background:string,axesColor:string,gridColor:string,lineColor:string}} Fallback payload.
 */
export function createGraphPlotFallbackPayload() {
  return {
    expression: 'Math.sin(x)',
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    xMin: -Math.PI * 2,
    xMax: Math.PI * 2,
    yMin: -1.5,
    yMax: 1.5,
    background: DEFAULT_BACKGROUND,
    axesColor: DEFAULT_AXES,
    gridColor: DEFAULT_GRID,
    lineColor: DEFAULT_LINE,
  };
}

/**
 * @param {{expression?: string,width?: number,height?: number,xMin?: number,xMax?: number,yMin?: number,yMax?: number,background?: string,axesColor?: string,gridColor?: string,lineColor?: string}} parsed Parsed options.
 * @param {(index?: number) => number} getRandomNumber Random helper, used for deterministic test-friendly fallback variation.
 * @returns {{expression:string,width:number,height:number,xMin:number,xMax:number,yMin:number,yMax:number,background:string,axesColor:string,gridColor:string,lineColor:string}}
 */
export function normalizeGraphPlotPayload(parsed, getRandomNumber) {
  const fallback = createGraphPlotFallbackPayload();
  const jitter = Math.floor(getRandomNumber() * 10);
  return {
    expression: stringOr(parsed.expression, fallback.expression),
    width: numberOr(parsed.width, fallback.width),
    height: numberOr(parsed.height, fallback.height),
    xMin: numberOr(parsed.xMin, fallback.xMin),
    xMax: numberOr(parsed.xMax, fallback.xMax),
    yMin: numberOr(parsed.yMin, fallback.yMin),
    yMax: numberOr(parsed.yMax, fallback.yMax),
    background: stringOr(parsed.background, fallback.background),
    axesColor: stringOr(parsed.axesColor, fallback.axesColor),
    gridColor: stringOr(parsed.gridColor, fallback.gridColor),
    lineColor: stringOr(parsed.lineColor, fallback.lineColor),
    jitter,
  };
}

/**
 * @param {{expression:string,width:number,height:number,xMin:number,xMax:number,yMin:number,yMax:number,background:string,axesColor:string,gridColor:string,lineColor:string,jitter?:number}} payload Plot payload.
 * @returns {{type:'graph-plot', width:number, height:number, background:string, axesColor:string, gridColor:string, lineColor:string, xMin:number, xMax:number, yMin:number, yMax:number, points:Array<{x:number,y:number}>}} Canvas payload.
 */
export function buildGraphPlotPayload(payload) {
  const evaluator = createExpressionEvaluator(payload.expression);
  const stepCount = Math.max(24, Math.round(payload.width / 4));
  const points = [];

  for (let index = 0; index <= stepCount; index += 1) {
    const ratio = index / stepCount;
    const x = payload.xMin + (payload.xMax - payload.xMin) * ratio;
    const y = evaluator(x);
    if (Number.isFinite(y)) {
      points.push({ x, y });
    }
  }

  return {
    type: 'graph-plot',
    width: payload.width,
    height: payload.height,
    background: payload.background,
    axesColor: payload.axesColor,
    gridColor: payload.gridColor,
    lineColor: payload.lineColor,
    xMin: payload.xMin,
    xMax: payload.xMax,
    yMin: payload.yMin,
    yMax: payload.yMax,
    points,
  };
}

/**
 * @param {string} expression Expression body using `x`.
 * @returns {(x:number) => number} Safe-ish evaluator.
 */
function createExpressionEvaluator(expression) {
  try {
    // Only expose Math and x; the toy stays synchronous and bounded by the UI.
    const fn = new Function('x', 'Math', `return (${expression});`);
    return x => Number(fn(x, Math));
  } catch {
    return () => Number.NaN;
  }
}

function numberOr(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOr(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}
