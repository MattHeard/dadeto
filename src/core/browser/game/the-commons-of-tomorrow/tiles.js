const SIZE = 12;
const WEIR_TERRAIN = Object.freeze({
  bank: '#617369',
  bankLight: '#68786d',
  water: '#355760',
  waterEdge: '#4a625e',
  structure: '#596b63',
  structureLight: '#64766b',
  structureDark: '#4c6059',
});

/**
 * Draw a planned solarpunk landscape with broad paths, planted terraces and a
 * readable watercourse instead of scattered grass flecks.
 * @param {{x:number,y:number,palette:string[],region:string,walkway?:boolean,blocked?:boolean,roof?:boolean}} options World tile context.
 * @returns {Array<{x:number,y:number,width:number,height:number,fill:string}>} Local pixel rectangles.
 */
export function generateCommonsTile({
  x,
  y,
  palette,
  region,
  walkway = false,
  blocked = false,
  roof = false,
}) {
  const [outline, stone, canopy, terracotta] = palette;
  const code = Math.abs((x * 19 + y * 23 + x * y * 5) % 8);
  if (region === 'shore' && blocked) return weirStructureTile({ roof, code });
  if (blocked)
    return structureTile({ outline, stone, canopy, terracotta, roof, code });
  if (region === 'shore') return weirTile({ x, y, code });
  return commonsTile({ walkway, canopy, terracotta, code });
}

/**
 *
 * @param {{walkway:boolean,canopy:string,terracotta:string,code:number}} options Tile motif inputs.
 * @returns {Array<{x:number,y:number,width:number,height:number,fill:string}>} Tile pixels.
 */
function commonsTile({ walkway, canopy, terracotta, code }) {
  if (walkway) {
    return [
      rect([0, 0, SIZE, SIZE], '#d8c78f'),
      rect([0, 1, SIZE, 1], '#f1e2b1'),
      rect([0, 10, SIZE, 1], '#b09d6b'),
      ...(code % 3 === 0 ? [rect([5, 5, 2, 2], terracotta)] : []),
    ];
  }
  const shapes = [rect([0, 0, SIZE, SIZE], '#416d56')];
  if (code % 3 === 0) shapes.push(rect([3 + (code % 5), 4, 2, 3], canopy));
  if (code % 3 === 1) shapes.push(rect([7, 6, 2, 2], terracotta));
  return shapes;
}

/**
 *
 * @param {{x:number,y:number,code:number}} options Tile motif inputs.
 * @returns {Array<{x:number,y:number,width:number,height:number,fill:string}>} Tile pixels.
 */
function weirTile({ x, y, code }) {
  const center = (x * 2 + Math.floor(y / 2) + 2) % 6;
  const bankLeft = center;
  const channel = [
    rect([0, 0, SIZE, SIZE], WEIR_TERRAIN.bank),
    rect([0, 1, SIZE, 1], WEIR_TERRAIN.bankLight),
    rect([0, 10, SIZE, 1], WEIR_TERRAIN.bank),
  ];
  channel.push(rect([bankLeft, 0, 5, SIZE], WEIR_TERRAIN.water));
  channel.push(rect([bankLeft, 0, 1, SIZE], WEIR_TERRAIN.waterEdge));
  if (code === 0)
    channel.push(rect([bankLeft + 1, 7, 2, 1], WEIR_TERRAIN.waterEdge));
  return channel;
}

/**
 * Draw quiet wetland structures that stay behind the foreground sprites.
 * @param {{roof:boolean,code:number}} options Structure tile context.
 * @returns {Array<{x:number,y:number,width:number,height:number,fill:string}>} Muted structure pixels.
 */
function weirStructureTile({ roof, code }) {
  const shapes = [
    rect([0, 0, SIZE, SIZE], WEIR_TERRAIN.structure),
    rect([1, 1, 10, 9], WEIR_TERRAIN.bank),
    rect([2, 3, 8, 1], WEIR_TERRAIN.structureLight),
    rect([2, 8, 8, 1], WEIR_TERRAIN.structureDark),
  ];
  if (roof && code % 3 === 0)
    shapes.push(rect([2, 2, 8, 1], WEIR_TERRAIN.bankLight));
  return shapes;
}

/**
 *
 * @param {{outline:string,stone:string,canopy:string,terracotta:string,roof:boolean,code:number}} options Structure motif inputs.
 * @returns {Array<{x:number,y:number,width:number,height:number,fill:string}>} Tile pixels.
 */
function structureTile({ outline, stone, canopy, terracotta, roof, code }) {
  const structure = [
    rect([0, 0, SIZE, SIZE], outline),
    rect([1, 1, 10, 9], stone),
    rect([2, 2, 8, 1], roof ? terracotta : canopy),
    rect([2, 4, 3, 3], canopy),
    rect([7, 4, 3, 3], terracotta),
    rect([2, 8, 8, 1], outline),
    rect([4 + (code % 4), 8, 1, 3], terracotta),
  ];
  if (roof) structure.push(rect([0, 0, SIZE, 1], terracotta));
  return structure;
}

/**
 * Create one rectangle in the tile's 12 by 12 pixel grid.
 * @param {[number,number,number,number]} bounds Left, top, width, height.
 * @param {string} fill Palette color.
 * @returns {{x:number,y:number,width:number,height:number,fill:string}} Pixel rectangle.
 */
function rect([x, y, width, height], fill) {
  return { x, y, width, height, fill };
}
