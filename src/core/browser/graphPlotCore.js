import { numberOr, parseObjectPayload, stringOr } from './plotShared.js';

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
  return parseGraphPlotPayload(inputString);
}

/**
 * @param {string} inputString JSON graph options.
 * @returns {{expression?: string,width?: number,height?: number,xMin?: number,xMax?: number,yMin?: number,yMax?: number,background?: string,axesColor?: string,gridColor?: string,lineColor?: string} | null} Parsed payload.
 */
const parseGraphPlotPayload = inputString =>
  parseObjectPayload(
    inputString,
    /**
     * Map a parsed JSON object into graph plot fields.
     * @param {Record<string, unknown>} parsed Parsed object payload.
     * @returns {{expression?: string,width?: number,height?: number,xMin?: number,xMax?: number,yMin?: number,yMax?: number,background?: string,axesColor?: string,gridColor?: string,lineColor?: string}} Graph plot payload fields.
     */
    parsed =>
      /**
       * @type {{
       *   expression?: string,
       *   width?: number,
       *   height?: number,
       *   xMin?: number,
       *   xMax?: number,
       *   yMin?: number,
       *   yMax?: number,
       *   background?: string,
       *   axesColor?: string,
       *   gridColor?: string,
       *   lineColor?: string,
       * }}
       */ (parsed)
  );

/**
 * Create the fallback graph payload.
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
 * @returns {{expression:string,width:number,height:number,xMin:number,xMax:number,yMin:number,yMax:number,background:string,axesColor:string,gridColor:string,lineColor:string}} Normalized graph payload.
 */
export function normalizeGraphPlotPayload(parsed) {
  const fallback = createGraphPlotFallbackPayload();
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
 * Convert JSON graph input into the final graph plot payload.
 * @param {string} inputString JSON graph options.
 * @param {() => number} getRandomNumber Random helper.
 * @returns {{type:'graph-plot', width:number, height:number, background:string, axesColor:string, gridColor:string, lineColor:string, xMin:number, xMax:number, yMin:number, yMax:number, points:Array<{x:number,y:number}>}} Canvas payload.
 */
export function buildGraphPlotFromJson(inputString, getRandomNumber) {
  const parsed =
    parseGraphPlot(inputString) || createGraphPlotFallbackPayload();
  const normalized = normalizeGraphPlotPayload(parsed);
  getRandomNumber();
  return buildGraphPlotPayload(normalized);
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
