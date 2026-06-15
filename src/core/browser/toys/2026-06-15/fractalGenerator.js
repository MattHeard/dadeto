const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 240;
const DEFAULT_DEPTH = 5;

/**
 * Parse optional toy JSON config.
 * @param {string} input Raw toy input.
 * @returns {Record<string, unknown>} Parsed config or an empty config.
 */
function parseConfig(input) {
  if (!input) {
    return {};
  }

  return toConfigRecord(parseJsonOrNull(input));
}

/**
 * Parse JSON while keeping malformed toy input non-fatal.
 * @param {string} input Raw JSON input.
 * @returns {unknown} Parsed JSON, or null when parsing fails.
 */
function parseJsonOrNull(input) {
  /** @type {unknown} */
  let parsed = null;

  try {
    parsed = JSON.parse(input);
  } catch {
    parsed = null;
  }

  return parsed;
}

/**
 * Keep only object-shaped parsed config values.
 * @param {unknown} value Parsed JSON value.
 * @returns {Record<string, unknown>} Parsed config object or empty config.
 */
function toConfigRecord(value) {
  const objectLike = typeof value === 'object' && value !== null;
  const recordLike = objectLike && !Array.isArray(value);
  if (!recordLike) {
    return {};
  }

  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Use a finite number option or a fallback.
 * @param {unknown} value Candidate option value.
 * @param {number} fallback Fallback value.
 * @returns {number} Finite numeric option or fallback.
 */
function numberOr(value, fallback) {
  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return fallback;
}

/**
 * Clamp a number to an inclusive range.
 * @param {number} value Candidate value.
 * @param {number} min Minimum value.
 * @param {number} max Maximum value.
 * @returns {number} Clamped value.
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Add recursive branch lines to the canvas shape list.
 * @param {Array<Record<string, unknown>>} shapes Mutable canvas shapes.
 * @param {{
 *   x: number,
 *   y: number,
 *   length: number,
 *   angle: number,
 *   depth: number,
 *   hue: number,
 * }} branch Branch state.
 * @returns {void}
 */
function addBranch(shapes, branch) {
  const { x, y, length, angle, depth, hue } = branch;
  if (depth <= 0 || length < 2) {
    return;
  }
  const x2 = x + Math.cos(angle) * length;
  const y2 = y - Math.sin(angle) * length;
  shapes.push({
    type: 'line',
    x1: Math.round(x),
    y1: Math.round(y),
    x2: Math.round(x2),
    y2: Math.round(y2),
    stroke: `hsl(${(hue + depth * 24) % 360}, 78%, ${36 + depth * 5}%)`,
    lineWidth: Math.max(1, depth),
  });
  addChildBranch(shapes, branch, { x: x2, y: y2, angleOffset: 0.55 });
  addChildBranch(shapes, branch, { x: x2, y: y2, angleOffset: -0.55 });
}

/**
 * Add one child branch at a relative angle.
 * @param {Array<Record<string, unknown>>} shapes Mutable canvas shapes.
 * @param {{ length: number, angle: number, depth: number, hue: number }} parent Parent branch state.
 * @param {{ x: number, y: number, angleOffset: number }} child Child branch placement.
 * @returns {void}
 */
function addChildBranch(shapes, parent, child) {
  addBranch(shapes, {
    x: child.x,
    y: child.y,
    length: parent.length * 0.68,
    angle: parent.angle + child.angleOffset,
    depth: parent.depth - 1,
    hue: parent.hue,
  });
}

/**
 * Generate a compact recursive fractal tree payload for the 2D canvas presenter.
 * @param {string} input JSON options: width, height, depth, hue.
 * @returns {string} Canvas presenter payload.
 */
export function fractalGenerator(input) {
  const config = parseConfig(input);
  const width = clamp(numberOr(config.width, DEFAULT_WIDTH), 160, 800);
  const height = clamp(numberOr(config.height, DEFAULT_HEIGHT), 120, 600);
  const depth = clamp(Math.round(numberOr(config.depth, DEFAULT_DEPTH)), 1, 8);
  const hue = clamp(Math.round(numberOr(config.hue, 180)), 0, 360);
  const shapes = [{ type: 'rect', x: 0, y: 0, width, height, fill: '#071013' }];

  addBranch(shapes, {
    x: width / 2,
    y: height - 18,
    length: height * 0.28,
    angle: Math.PI / 2,
    depth,
    hue,
  });

  return JSON.stringify({ width, height, shapes });
}
