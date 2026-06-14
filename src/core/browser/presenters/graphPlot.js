import { buildGraphPlotFromJson } from '../graphPlotCore.js';
import { createPresenterRoot } from './browserPresentersCore.js';

const ROOT_CLASS = 'graph-plot-output';

/**
 * Create a graph plot element from JSON input.
 * @param {string} inputString JSON payload describing the graph.
 * @param {import('../domHelpers.js').DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Rendered graph container.
 */
export function createGraphPlotElement(inputString, dom) {
  const payload = buildGraphPlotFromJson(inputString, () => 0.5);
  const root = createPresenterRoot(dom, ROOT_CLASS);
  const canvas = /** @type {HTMLCanvasElement} */ (dom.createElement('canvas'));
  canvas.width = payload.width;
  canvas.height = payload.height;
  dom.appendChild(root, canvas);
  const context = canvas.getContext('2d');
  if (context) {
    drawGraphPlot(context, canvas, payload);
  }
  return root;
}

/**
 * Create the graph plot presenter handle for browser re-export wrappers.
 * @returns {{createGraphPlotElement: (inputString: string, dom: import('../domHelpers.js').DOMHelpers) => HTMLElement}} Presenter handle.
 */
export function createGraphPlotPresenterHandle() {
  return { createGraphPlotElement };
}

/**
 * Draw the graph plot contents.
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{background:string,axesColor:string,gridColor:string,lineColor:string,xMin:number,xMax:number,yMin:number,yMax:number,points:Array<{x:number,y:number}>,series?:{lineColor?:string,points?:Array<{x:number,y:number}>}[]}} payload Graph payload.
 */
function drawGraphPlot(context, canvas, payload) {
  context.fillStyle = payload.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid(context, canvas, payload);
  drawAxes(context, canvas, payload);
  drawFunction(context, canvas, payload);
  drawSeries(context, canvas, payload);
}

/**
 * Draw the grid.
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{background:string,axesColor:string,gridColor:string,lineColor:string,xMin:number,xMax:number,yMin:number,yMax:number,points:Array<{x:number,y:number}>}} payload Graph payload.
 */
function drawGrid(context, canvas, payload) {
  context.strokeStyle = payload.gridColor;
  context.lineWidth = 1;
  const xStep = niceStep(payload.xMax - payload.xMin);
  const yStep = niceStep(payload.yMax - payload.yMin);
  for (
    let x = Math.ceil(payload.xMin / xStep) * xStep;
    x <= payload.xMax;
    x += xStep
  ) {
    const px = toCanvasX(canvas, payload, x);
    context.beginPath();
    context.moveTo(px, 0);
    context.lineTo(px, canvas.height);
    context.stroke();
  }
  for (
    let y = Math.ceil(payload.yMin / yStep) * yStep;
    y <= payload.yMax;
    y += yStep
  ) {
    const py = toCanvasY(canvas, payload, y);
    context.beginPath();
    context.moveTo(0, py);
    context.lineTo(canvas.width, py);
    context.stroke();
  }
}

/**
 * Draw the axes.
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{background:string,axesColor:string,gridColor:string,lineColor:string,xMin:number,xMax:number,yMin:number,yMax:number,points:Array<{x:number,y:number}>,series?:{lineColor?:string,points?:Array<{x:number,y:number}>}[]}} payload Graph payload.
 */
function drawAxes(context, canvas, payload) {
  context.strokeStyle = payload.axesColor;
  context.lineWidth = 2;
  context.beginPath();
  const xAxis = toCanvasY(canvas, payload, 0);
  context.moveTo(0, xAxis);
  context.lineTo(canvas.width, xAxis);
  const yAxis = toCanvasX(canvas, payload, 0);
  context.moveTo(yAxis, 0);
  context.lineTo(yAxis, canvas.height);
  context.stroke();
}

/**
 * Draw the plotted function.
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{background:string,axesColor:string,gridColor:string,lineColor:string,xMin:number,xMax:number,yMin:number,yMax:number,points:Array<{x:number,y:number}>,series?:{lineColor?:string,points?:Array<{x:number,y:number}>}[]}} payload Graph payload.
 */
function drawFunction(context, canvas, payload) {
  if (!payload.points.length) {
    return;
  }
  context.strokeStyle = payload.lineColor;
  context.lineWidth = 3;
  drawSeriesPath(context, canvas, payload, payload.points);
}

/**
 * Draw any additional series on the graph.
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{background:string,axesColor:string,gridColor:string,lineColor:string,xMin:number,xMax:number,yMin:number,yMax:number,points:Array<{x:number,y:number}>,series?:{lineColor?:string,points?:Array<{x:number,y:number}>}[]}} payload Graph payload.
 */
function drawSeries(context, canvas, payload) {
  payload.series?.forEach(series =>
    drawSeriesLine(context, canvas, payload, series)
  );
}

/**
 * Draw one series line.
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{background:string,axesColor:string,gridColor:string,lineColor:string,xMin:number,xMax:number,yMin:number,yMax:number,points:Array<{x:number,y:number}>,series?:{lineColor?:string,points?:Array<{x:number,y:number}>}[]}} payload Graph payload.
 * @param {{lineColor?:string,points?:Array<{x:number,y:number}>}} series Series definition.
 */
function drawSeriesLine(context, canvas, payload, series) {
  if (!series.points?.length) {
    return;
  }
  context.strokeStyle = series.lineColor || payload.lineColor;
  context.lineWidth = 3;
  drawSeriesPath(context, canvas, payload, series.points);
}

/**
 * Draw a polyline for one point list.
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{background:string,axesColor:string,gridColor:string,lineColor:string,xMin:number,xMax:number,yMin:number,yMax:number,points:Array<{x:number,y:number}>,series?:{lineColor?:string,points?:Array<{x:number,y:number}>}[]}} payload Graph payload.
 * @param {Array<{x:number,y:number}>} points Point list to draw.
 */
function drawSeriesPath(context, canvas, payload, points) {
  context.beginPath();
  let started = false;
  for (const point of points) {
    const x = toCanvasX(canvas, payload, point.x);
    const y = toCanvasY(canvas, payload, point.y);
    if (!started) {
      context.moveTo(x, y);
      started = true;
      continue;
    }
    context.lineTo(x, y);
  }
  context.stroke();
}

/**
 * Convert graph X coordinates to canvas coordinates.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{xMin:number,xMax:number}} payload Graph payload.
 * @param {number} x Graph X coordinate.
 * @returns {number} Canvas X coordinate.
 */
function toCanvasX(canvas, payload, x) {
  return ((x - payload.xMin) / (payload.xMax - payload.xMin)) * canvas.width;
}

/**
 * Convert graph Y coordinates to canvas coordinates.
 * @param {HTMLCanvasElement} canvas Canvas node.
 * @param {{yMin:number,yMax:number}} payload Graph payload.
 * @param {number} y Graph Y coordinate.
 * @returns {number} Canvas Y coordinate.
 */
function toCanvasY(canvas, payload, y) {
  return (
    canvas.height -
    ((y - payload.yMin) / (payload.yMax - payload.yMin)) * canvas.height
  );
}

/**
 * Choose a pleasant grid step for a span.
 * @param {number} span Graph span.
 * @returns {number} Grid step.
 */
function niceStep(span) {
  const raw = span / 8;
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1;
  }
  const power = 10 ** Math.floor(Math.log10(raw));
  if (raw < power * 2) {
    return power;
  }
  if (raw < power * 5) {
    return power * 2;
  }
  return power * 5;
}
