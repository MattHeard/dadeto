/** @typedef {{x:number,y:number,width:number,height:number,fill:string}} SceneryPixel */
const ARCH_TOP = ['.0000000000.', '.0333333330.', '.0322222230.'];
/** @type {Record<string,string[]>} */
const MATERIALS = {
  roof: ['#182f36', '#914b44', '#d47656', '#edc48b'],
  village: ['#182f36', '#70513d', '#d5c194', '#a47b51'],
};
/** @type {Record<string,string[]>} */
const MOTIFS = {
  lab: [
    '000000000000',
    '033333333330',
    '022222222220',
    '021111111120',
    '021033301120',
    '021030301120',
    '021033301120',
    '021111111120',
    '022222222220',
    '022002200220',
    '033333333330',
    '000000000000',
  ],
  roof: [
    '....00......',
    '...0330.....',
    '..022220....',
    '.02222220...',
    '0221221220..',
    '02122122120.',
    '022122122220',
    '033333333330',
    '.0000000000.',
    '............',
    '............',
    '............',
  ],
  village: [
    '.0333333330.',
    '.0322222230.',
    '.0320022230.',
    '.0323322230.',
    '.0320022230.',
    '.0322222230.',
    '.0322121230.',
    '.0322222230.',
    '.0333333330.',
    '.0000000000.',
    '............',
    '............',
  ],
  orchard: [
    '....0000....',
    '..00222200..',
    '.0222322220.',
    '022222222220',
    '022322223220',
    '.0222222220.',
    '..02222220..',
    '....0330....',
    '....0220....',
    '...022220...',
    '..00000000..',
    '............',
  ],
  shore: [
    '............',
    '....000.....',
    '..0022200...',
    '.022333220..',
    '02233222220.',
    '022222122220',
    '.0222122220.',
    '..02222220..',
    '...000000...',
    '..22332222..',
    '............',
    '............',
  ],
  hollow: [
    '.0000000000.',
    '022222222220',
    '023222223220',
    '022000022220',
    '022033022220',
    '022030022220',
    '022033022220',
    '022000022220',
    '022222222220',
    '021221222120',
    '.0000000000.',
    '............',
  ],
  gateway: [...ARCH_TOP, ...Array(8).fill('.0300000030.'), '.0000000000.'],
  sealed: [
    ...ARCH_TOP,
    ...'.0300000030./.0303030030./.0303030030./.0333333330./.0303030030./.0303030030./.0303030030./.0300000030.'.split(
      '/'
    ),
    '.0000000000.',
  ],
};

/**
 * Rasterize authored scenery into opaque integer pixels over the terrain bed.
 * @param {string[]} rows Palette-indexed art with transparent dots.
 * @param {string[]} palette Regional palette.
 * @returns {SceneryPixel[]} Local tile pixels.
 */
function raster(rows, palette) {
  return rows.flatMap((row, y) =>
    [...row].flatMap((code, x) =>
      code === '.'
        ? []
        : [{ x, y, width: 1, height: 1, fill: palette[Number(code)] }]
    )
  );
}

/**
 * Use roofs above timber walls, fruit trees, shore rocks and carved dungeon stone.
 * @param {{region:string,roof:boolean,palette:string[]}} options Tile artwork options.
 * @returns {SceneryPixel[]} Detailed regional obstacle art.
 */
export function obstaclePixels({ region, roof, palette }) {
  const motif = region === 'village' && roof ? 'roof' : region;
  return raster(MOTIFS[motif] || MOTIFS.hollow, MATERIALS[motif] || palette);
}

/**
 * A directional stepping-stone trail or a visibly barred/unbarred dungeon arch.
 * @param {{direction:string,gateway:boolean,locked:boolean,palette:string[]}} options Crossing appearance.
 * @returns {SceneryPixel[]} Local crossing pixels.
 */
export function crossingPixels({ direction, gateway, locked, palette }) {
  if (gateway) return raster(MOTIFS[locked ? 'sealed' : 'gateway'], palette);
  const arrow = raster(
    [
      '......3.....',
      '......33....',
      '..3333333...',
      '..33333333..',
      '..3333333...',
      '......33....',
      '......3.....',
    ],
    palette
  );
  return arrow.map(pixel => orientArrow(pixel, direction));
}

/**
 * Rotate the east-pointing arrow around its tile center.
 * @param {SceneryPixel} pixel Source arrow pixel.
 * @param {string} direction Map-edge direction.
 * @returns {SceneryPixel} Rotated tile pixel.
 */
function orientArrow(pixel, direction) {
  const x = pixel.x;
  const y = pixel.y + 2;
  /** @type {Record<string,number[]>} */
  const positions = {
    left: [11 - x, y],
    up: [y, 11 - x],
    down: [y, x],
    right: [x, y],
  };
  const [px, py] = positions[direction] || positions.right;
  return { ...pixel, x: px, y: py };
}
