import {
  createCanvasDoodleFallbackPayload,
  drawCanvasDoodle,
  parseCanvasDoodle,
} from '../canvasDoodleCore.js';
import { createPresenterRoot } from './browserPresentersCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

const ROOT_CLASS = 'canvas-doodle-output';
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 180;

/**
 * Create a canvas element for a doodle payload.
 * @param {string} inputString JSON string describing the drawing.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Rendered canvas container.
 */
export function createCanvasDoodleElement(inputString, dom) {
  const payload =
    parseCanvasDoodle(inputString) || createCanvasDoodleFallbackPayload();
  const root = createPresenterRoot(dom, ROOT_CLASS);
  const canvas = /** @type {HTMLCanvasElement} */ (dom.createElement('canvas'));
  canvas.width = payload.width || CANVAS_WIDTH;
  canvas.height = payload.height || CANVAS_HEIGHT;
  dom.appendChild(root, canvas);

  const context = canvas.getContext('2d');
  if (context) {
    drawCanvasDoodle(context, canvas, payload);
  }

  return root;
}
