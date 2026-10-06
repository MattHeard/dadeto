const STILL_SPEED = 0.02;

/**
 * Map one deterministic solver velocity to a screen direction marker.
 * @param {number} velocityX Horizontal velocity, positive toward the right.
 * @param {number} velocityY Vertical velocity, positive toward the bottom.
 * @returns {{direction: 'still'|'right'|'left'|'down'|'up', glyph: string, strength: number}} Render-only flow data.
 */
export function getFlowVisual(velocityX, velocityY) {
  if (!Number.isFinite(velocityX) || !Number.isFinite(velocityY)) {
    throw new TypeError('Flow velocity components must be finite numbers.');
  }
  const speed = Math.min(1, Math.hypot(velocityX, velocityY));
  if (speed < STILL_SPEED) {
    return { direction: 'still', glyph: '', strength: 0 };
  }
  const direction =
    Math.abs(velocityX) > Math.abs(velocityY)
      ? velocityX > 0
        ? 'right'
        : 'left'
      : velocityY > 0
        ? 'down'
        : 'up';
  const glyphs = { right: '→', left: '←', down: '↓', up: '↑' };
  return { direction, glyph: glyphs[direction], strength: speed };
}
