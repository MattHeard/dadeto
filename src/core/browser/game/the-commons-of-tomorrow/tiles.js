const SIZE = 12;

/**
 * Create crisp Commons terrain with solar ceramic, woven paths and wetland bands.
 * @param {{x:number,y:number,palette:string[],region:string,blocked?:boolean,roof?:boolean}} options World tile context.
 * @returns {Array<{x:number,y:number,width:number,height:number,fill:string}>} Local tile rectangles.
 */
export function generateCommonsTile({
  x,
  y,
  palette,
  region,
  blocked = false,
  roof = false,
}) {
  const [deep, base, leaf, sun] = palette;
  const seed = Math.abs((x * 19 + y * 23 + x * y * 5) % 8);
  if (blocked) {
    return [
      rect({ x: 0, y: 0, width: SIZE, height: SIZE }, deep),
      rect(
        { x: 1, y: 1, width: 10, height: 8 },
        region === 'shore' ? base : leaf
      ),
      rect({ x: 1, y: 9, width: 10, height: 2 }, deep),
      rect({ x: (seed % 5) + 2, y: 2, width: 4, height: 2 }, sun),
      rect({ x: 2, y: 6, width: 8, height: 1 }, base),
      ...(roof ? [rect({ x: 0, y: 0, width: SIZE, height: 2 }, sun)] : []),
    ];
  }
  if (region === 'shore') {
    const flow = seed % 4;
    return [
      rect({ x: 0, y: 0, width: SIZE, height: SIZE }, base),
      rect({ x: 0, y: 2 + flow, width: SIZE, height: 2 }, deep),
      rect({ x: 0, y: 3 + flow, width: SIZE, height: 1 }, leaf),
      rect({ x: (seed * 3) % 9, y: 8, width: 2, height: 1 }, sun),
      rect({ x: (seed * 5) % 8, y: 10, width: 3, height: 1 }, leaf),
    ];
  }
  const seam = seed % 3 === 0;
  return [
    rect({ x: 0, y: 0, width: SIZE, height: SIZE }, base),
    rect({ x: 0, y: 0, width: 2, height: SIZE }, leaf),
    rect({ x: 2, y: 0, width: 1, height: SIZE }, deep),
    rect({ x: 7 + (seed % 3), y: 2 + (seed % 5), width: 2, height: 2 }, sun),
    rect({ x: 8 + (seed % 2), y: 7, width: 1, height: 3 }, leaf),
    ...(seam ? [rect({ x: 4, y: 1, width: 5, height: 1 }, deep)] : []),
  ];
}

/**
 *
 * @param {{x:number,y:number,width:number,height:number}} bounds Tile-local dimensions.
 * @param {string} fill Palette color.
 * @returns {{x:number,y:number,width:number,height:number,fill:string}} Pixel rectangle.
 */
function rect(bounds, fill) {
  return { ...bounds, fill };
}
