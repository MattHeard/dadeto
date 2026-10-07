import {
  createCanvasDoodleFallbackPayload,
  drawCanvasDoodle,
  parseCanvasDoodle,
} from '../canvasDoodleCore.js';
import { createCanvasPresenter } from './browserPresentersCore.js';

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
  return createCanvasPresenter({
    dom,
    rootClass: ROOT_CLASS,
    width: payload.width || CANVAS_WIDTH,
    height: payload.height || CANVAS_HEIGHT,
    draw: (context, canvas) => drawCanvasDoodle(context, canvas, payload),
  });
}
