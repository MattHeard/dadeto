const SIZE = 12;

/**
 * Draw a planned solarpunk landscape with broad paths, planted terraces and a
 * readable watercourse instead of scattered grass flecks.
 * @param {{x:number,y:number,palette:string[],region:string,blocked?:boolean,roof?:boolean}} options World tile context.
 * @returns {Array<{x:number,y:number,width:number,height:number,fill:string}>} Local pixel rectangles.
 */
export function generateCommonsTile({
  x,
  y,
  palette,
  region,
  blocked = false,
  roof = false,
}) {
  const [outline, stone, canopy, terracotta, water = outline] = palette;
  const code = Math.abs((x * 19 + y * 23 + x * y * 5) % 8);
  if (blocked)
    return structureTile({ outline, stone, canopy, terracotta, roof, code });
  if (region === 'shore')
    return weirTile({ x, y, outline, stone, canopy, terracotta, water, code });
  return commonsTile({ x, y, outline, stone, canopy, terracotta, code });
}

/**
 *
 * @param {{x:number,y:number,outline:string,stone:string,canopy:string,terracotta:string,code:number}} options Tile motif inputs.
 * @returns {Array<{x:number,y:number,width:number,height:number,fill:string}>} Tile pixels.
 */
function commonsTile({ x, y, outline, stone, canopy, terracotta, code }) {
  const path = x % 6 === 0 || y % 4 === 0;
  if (path) {
    const cross = x % 6 === 0 && y % 4 === 0;
    return [
      rect([0, 0, SIZE, SIZE], stone),
      rect([0, 0, 1, SIZE], outline),
      rect([0, 0, SIZE, 1], outline),
      rect(
        [cross ? 5 : (code % 7) + 2, cross ? 5 : (code % 7) + 2, 2, 2],
        terracotta
      ),
      ...(cross
        ? [rect([2, 2, 8, 1], canopy), rect([2, 8, 8, 1], canopy)]
        : []),
    ];
  }
  const terrace = code % 2 === 0;
  return [
    rect([0, 0, SIZE, SIZE], canopy),
    rect([1, 1, 10, 10], outline),
    rect([2, 2, 8, 8], terrace ? stone : terracotta),
    rect([3, 3, 6, 1], canopy),
    rect([3, 6, 6, 1], canopy),
    rect([3, 9, 6, 1], canopy),
    rect([2 + (code % 6), 4, 1, 1], terracotta),
  ];
}

/**
 *
 * @param {{x:number,y:number,outline:string,stone:string,canopy:string,terracotta:string,water:string,code:number}} options Tile motif inputs.
 * @returns {Array<{x:number,y:number,width:number,height:number,fill:string}>} Tile pixels.
 */
function weirTile({ x, y, outline, stone, canopy, terracotta, water, code }) {
  const center = (x * 2 + Math.floor(y / 2) + 2) % 6;
  const bankLeft = center;
  const bankRight = center + 5;
  const channel = [
    rect([0, 0, SIZE, SIZE], stone),
    rect([0, 1, SIZE, 1], canopy),
    rect([0, 10, SIZE, 1], canopy),
  ];
  channel.push(rect([bankLeft, 0, 5, SIZE], water));
  channel.push(rect([bankLeft, 0, 1, SIZE], outline));
  channel.push(rect([bankRight, 0, 1, SIZE], canopy));
  channel.push(rect([bankLeft + 1, 2 + (code % 5), 2, 1], terracotta));
  channel.push(rect([bankLeft + 1, 8, 3, 1], '#b8d9c4'));
  return channel;
}

/**
 *
 * @param {{outline:string,stone:string,canopy:string,terracotta:string,roof:boolean,code:number}} options Structure motif inputs.
 * @returns {Array<{x:number,y:number,width:number,height:number,fill:string}>} Tile pixels.
 */
function structureTile({ outline, stone, canopy, terracotta, roof, code }) {
  return [
    rect([0, 0, SIZE, SIZE], outline),
    rect([1, 1, 10, 9], stone),
    rect([2, 2, 8, 1], roof ? terracotta : canopy),
    rect([2, 4, 3, 3], canopy),
    rect([7, 4, 3, 3], terracotta),
    rect([2, 8, 8, 1], outline),
    rect([4 + (code % 4), 8, 1, 3], terracotta),
    ...(roof ? [rect([0, 0, SIZE, 1], terracotta)] : []),
  ];
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
