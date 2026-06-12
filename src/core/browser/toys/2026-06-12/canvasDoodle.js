import {
  buildCanvasDoodleShapes,
  parseCanvasDoodle,
} from '../../canvasDoodleCore.js';

/**
 * Create a tiny Canvas drawing payload from JSON input.
 * @param {string} input JSON payload describing the drawing.
 * @param {Map<string, Function>} env Toy environment helpers.
 * @returns {string} JSON drawing payload for the canvas presenter.
 */
export function canvasDoodle(input, env) {
  const parsed = parseCanvasDoodle(input) || {
    width: 320,
    height: 180,
    background: '#f8f6f2',
    accent: '#1f2937',
  };
  const getRandomNumber = env.get('getRandomNumber') || (() => 0.5);

  return JSON.stringify({
    width: parsed.width,
    height: parsed.height,
    shapes: buildCanvasDoodleShapes(parsed, getRandomNumber),
  });
}
