/**
 * Create a tiny Canvas drawing payload from JSON input.
 * @param {string} input JSON payload describing the drawing.
 * @param {Map<string, Function>} env Toy environment helpers.
 * @returns {string} JSON drawing payload for the canvas presenter.
 */
export function canvasDoodle(input, env) {
  const parsed = parseInput(input);
  const getRandomNumber = env.get('getRandomNumber') || (() => 0.5);

  return JSON.stringify({
    width: parsed.width,
    height: parsed.height,
    shapes: buildShapes(parsed, getRandomNumber),
  });
}

/**
 * @param {string} input Raw input.
 * @returns {{width:number,height:number,background:string,accent:string}} Parsed options.
 */
function parseInput(input) {
  try {
    const parsed = JSON.parse(input);
    return {
      width: numberOr(parsed?.width, 320),
      height: numberOr(parsed?.height, 180),
      background: stringOr(parsed?.background, '#f8f6f2'),
      accent: stringOr(parsed?.accent, '#1f2937'),
    };
  } catch {
    return {
      width: 320,
      height: 180,
      background: '#f8f6f2',
      accent: '#1f2937',
    };
  }
}

/**
 * @param {{width:number,height:number,background:string,accent:string}} parsed Parsed options.
 * @param {Function} getRandomNumber Random helper.
 * @returns {Array<Record<string, unknown>>} Drawing shapes.
 */
function buildShapes(parsed, getRandomNumber) {
  const hue = Math.floor(getRandomNumber() * 360);
  const bandHeight = Math.max(12, Math.round(parsed.height * 0.18));
  const pad = Math.round(Math.min(parsed.width, parsed.height) * 0.12);

  return [
    {
      type: 'rect',
      x: 0,
      y: 0,
      width: parsed.width,
      height: parsed.height,
      fill: parsed.background,
    },
    {
      type: 'rect',
      x: pad,
      y: pad,
      width: parsed.width - pad * 2,
      height: bandHeight,
      fill: `hsl(${hue}, 70%, 65%)`,
    },
    {
      type: 'circle',
      x: Math.round(parsed.width * 0.32),
      y: Math.round(parsed.height * 0.58),
      radius: Math.round(Math.min(parsed.width, parsed.height) * 0.16),
      fill: `hsl(${(hue + 120) % 360}, 70%, 60%)`,
    },
    {
      type: 'circle',
      x: Math.round(parsed.width * 0.68),
      y: Math.round(parsed.height * 0.58),
      radius: Math.round(Math.min(parsed.width, parsed.height) * 0.16),
      fill: `hsl(${(hue + 240) % 360}, 70%, 60%)`,
    },
    {
      type: 'line',
      x1: pad,
      y1: parsed.height - pad,
      x2: parsed.width - pad,
      y2: parsed.height - pad,
      stroke: parsed.accent,
      lineWidth: 6,
    },
  ];
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
