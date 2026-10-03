import { obstaclePixels } from './scenery.js';
const TILE_SIZE = 12;

/** @typedef {'shadow' | 'ground' | 'light' | 'glimmer'} PaletteColor */
/** @typedef {[number, number, number, number, PaletteColor]} PixelInstruction */
/** @typedef {{x: number, y: number, width: number, height: number, fill: string}} PixelRect */
/** @typedef {{x: number, y: number, palette: [string, string, string, string], region: string, blocked?: boolean, roof?:boolean}} TileOptions */

/**
 * Generate a deterministic pixel-art tile from its map coordinate and region.
 * @param {TileOptions} options - Tile coordinate, palette, region and collision.
 * @returns {PixelRect[]} Pixel rectangles.
 */
export function generateBackgroundTile(options) {
  const { x, y, palette, region, blocked = false, roof = false } = options;
  const seed = Math.abs((x * 17 + y * 31 + x * y * 7) % 12);
  const colors = {
    shadow: palette[0],
    ground: palette[1],
    light: palette[2],
    glimmer: palette[3],
  };
  // Keep the terrain bed continuous. Large alternating fills read as a
  // checkerboard at handheld scale; the regional accents below provide texture.
  const baseColor = colors.ground;
  const details = backgroundInstructions(seed, region);
  if (blocked)
    return [
      { x: 0, y: 0, width: TILE_SIZE, height: TILE_SIZE, fill: baseColor },
      ...obstaclePixels({ region, roof, palette }),
    ];

  return [
    { x: 0, y: 0, width: TILE_SIZE, height: TILE_SIZE, fill: baseColor },
    ...details.map(([x, y, width, height, color]) => ({
      x,
      y,
      width,
      height,
      fill: colors[color],
    })),
  ];
}

/**
 * Describe region texture as compact local rectangles referencing palette roles.
 * @param {number} seed - Stable seed derived from world coordinates.
 * @param {string} region - Map palette key selecting the local terrain motif.
 * @returns {PixelInstruction[]} Small texture rectangles in local tile space.
 */
function backgroundInstructions(seed, region) {
  switch (region) {
    case 'lab':
      return [
        instruction([0, 11, 12, 1, 'shadow']),
        instruction([11, 0, 1, 12, 'shadow']),
        instruction([2, 2, 7, 1, 'ground']),
        ...optionalInstruction(seed % 4 === 0, [1, 10, 3, 1, 'light']),
        ...optionalInstruction(seed === 3, [9, 3, 1, 1, 'glimmer']),
      ];
    case 'shore': {
      const x = 1 + (seed % 4);
      const y = 1 + (seed % 7);
      return [
        instruction([x, y, 4 + (seed % 3), 1, 'light']),
        instruction([x + 2, y + 1, 2, 1, 'shadow']),
        instruction([x + 1, y + 2, 3, 1, 'ground']),
        ...optionalInstruction(seed % 2 === 0, [
          8 - (seed % 3),
          9,
          1,
          1,
          'glimmer',
        ]),
      ];
    }
    case 'orchard': {
      const x = 1 + (seed % 5);
      const y = 1 + (seed % 4);
      return [
        instruction([x, y, 2, 2, 'light']),
        instruction([x + 2, y + 1, 2, 2, 'light']),
        instruction([x + 1, y + 3, 2, 1, 'shadow']),
        instruction([x + 3, y + 2, 1, 2, 'shadow']),
        ...optionalInstruction(seed % 3 === 1, [x + 2, y + 2, 1, 1, 'glimmer']),
      ];
    }
    case 'hollow': {
      const x = 2 + (seed % 5);
      const y = 1 + (seed % 5);
      return [
        instruction([x, y, 1, 5, 'light']),
        instruction([x, y + 3, 4, 1, 'light']),
        instruction([x + 3, y + 1, 1, 2, 'shadow']),
        instruction([x + 1, y + 1, 2, 1, 'ground']),
        ...optionalInstruction(seed % 3 === 0, [x + 1, y + 1, 1, 1, 'glimmer']),
      ];
    }
    default: {
      const x = 1 + (seed % 8);
      const y = 2 + (seed % 5);
      return [
        instruction([x, y, 1, 3 + (seed % 2), 'light']),
        instruction([x + (seed % 2 ? 1 : -1), y + 1, 1, 2, 'light']),
        instruction([x + 2, y + 2, 1, 2, 'shadow']),
        ...optionalInstruction(seed % 3 === 0, [x + 2, y + 3, 2, 1, 'glimmer']),
        ...optionalInstruction(seed % 4 === 0, [2, 9, 2, 1, 'shadow']),
      ];
    }
  }
}

/**
 * @param {PixelInstruction} parts - Position, dimensions and palette role.
 * @returns {PixelInstruction} The typed pixel instruction.
 */
function instruction(parts) {
  return parts;
}

/**
 * @param {boolean} enabled - Whether this coordinate receives the accent.
 * @param {PixelInstruction} parts - Position, dimensions and palette role.
 * @returns {PixelInstruction[]} Zero or one accent instructions.
 */
function optionalInstruction(enabled, parts) {
  return enabled ? [parts] : [];
}
