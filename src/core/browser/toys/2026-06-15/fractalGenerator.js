const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 240;
const DEFAULT_DEPTH = 5;

function parseConfig(input) {
  try {
    const parsed = JSON.parse(input || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function numberOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function addBranch(shapes, x, y, length, angle, depth, hue) {
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
  addBranch(shapes, x2, y2, length * 0.68, angle + 0.55, depth - 1, hue);
  addBranch(shapes, x2, y2, length * 0.68, angle - 0.55, depth - 1, hue);
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
  const shapes = [
    { type: 'rect', x: 0, y: 0, width, height, fill: '#071013' },
  ];

  addBranch(shapes, width / 2, height - 18, height * 0.28, Math.PI / 2, depth, hue);

  return JSON.stringify({ width, height, shapes });
}
