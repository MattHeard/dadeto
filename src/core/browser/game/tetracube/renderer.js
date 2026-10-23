import { getTetracubeOccupiedCells } from './tetracube.js';
import { getTetracubePreview } from './world.js';

/** @typedef {import('./tetracube.js').TetracubePiece} TetracubePiece */
/** @typedef {import('./world.js').TetracubeWorldState} TetracubeWorldState */
/** @typedef {{x:number,y:number,depth:number}} ProjectedPoint */
/** @typedef {{x:number,y:number,z:number,yaw:number,pitch:number}} Camera */

const CUBE_FACES = Object.freeze([
  {
    neighbor: [1, 0, 0],
    vertices: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    shade: 0.78,
  },
  {
    neighbor: [-1, 0, 0],
    vertices: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
    ],
    shade: 0.56,
  },
  {
    neighbor: [0, 1, 0],
    vertices: [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
    ],
    shade: 0.86,
  },
  {
    neighbor: [0, -1, 0],
    vertices: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    shade: 0.48,
  },
  {
    neighbor: [0, 0, 1],
    vertices: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    shade: 1,
  },
  {
    neighbor: [0, 0, -1],
    vertices: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
      [0, 0, 0],
    ],
    shade: 0.42,
  },
]);

/**
 * Convert a world point to perspective screen coordinates.
 * @param {{x:number,y:number,z:number}} point World point.
 * @param {Camera} player Camera position and orientation.
 * @param {number} width Viewport width.
 * @param {number} height Viewport height.
 * @returns {ProjectedPoint|null} Projected point.
 */
function projectPoint(point, player, width, height) {
  const dx = point.x - player.x;
  const dy = point.y - player.y;
  const dz = point.z - player.z;
  const sinYaw = Math.sin(player.yaw);
  const cosYaw = Math.cos(player.yaw);
  const sinPitch = Math.sin(player.pitch);
  const cosPitch = Math.cos(player.pitch);
  const right = -dx * sinYaw + dy * cosYaw;
  const horizontal = dx * cosYaw + dy * sinYaw;
  const depth = horizontal * cosPitch + dz * sinPitch;
  if (depth <= 0.15) return null;
  const vertical = -horizontal * sinPitch + dz * cosPitch;
  const focalLength = width * 0.82;
  return {
    x: width * 0.5 + (right * focalLength) / depth,
    y: height * 0.5 - (vertical * focalLength) / depth,
    depth,
  };
}

/**
 * Return a shaded colour for one cube face.
 * @param {string} color Base piece colour.
 * @param {number} shade Face brightness multiplier.
 * @param {number} alpha Face opacity.
 * @returns {string} CSS colour.
 */
function shadeColor(color, shade, alpha) {
  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  return [
    'rgba(',
    Math.round(red * shade),
    ', ',
    Math.round(green * shade),
    ', ',
    Math.round(blue * shade),
    ', ',
    alpha,
    ')',
  ].join('');
}

/**
 * Draw exposed cube faces sorted by camera depth.
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {TetracubeWorldState} world Tetracube world and preview state.
 * @param {number} width Viewport width.
 * @param {number} height Viewport height.
 * @returns {void}
 */
function drawCubes(context, world, width, height) {
  const { player } = world;
  const preview = getTetracubePreview(world);
  /** @type {(TetracubePiece & {color:string,ghost?:boolean})[]} */
  const pieces = world.construction.pieces.map(piece => ({
    ...piece,
    color: piece.color || '#8bcf82',
  }));
  if (preview.landedPiece) {
    pieces.push({
      ...preview.landedPiece,
      color: world.offered.color,
      ghost: true,
    });
  }
  const faces = [];
  const occupied = new Set(
    pieces
      .filter(piece => !piece.ghost)
      .flatMap(piece => getTetracubeOccupiedCells(piece) || [])
      .map(cell => [cell.x, cell.y, cell.z].join(','))
  );
  for (const piece of pieces) {
    const cells = getTetracubeOccupiedCells(piece) || [];
    for (const cell of cells) {
      for (const face of CUBE_FACES) {
        const neighborKey = [
          cell.x + face.neighbor[0],
          cell.y + face.neighbor[1],
          cell.z + face.neighbor[2],
        ].join(',');
        if (!piece.ghost && occupied.has(neighborKey)) continue;
        const projectedPoints = face.vertices.map(vertex =>
          projectPoint(
            {
              x: cell.x + vertex[0],
              y: cell.y + vertex[1],
              z: cell.z + vertex[2],
            },
            player,
            width,
            height
          )
        );
        const points = projectedPoints.filter(point => point !== null);
        if (points.length !== projectedPoints.length) continue;
        faces.push({
          points,
          depth:
            points.reduce((sum, point) => sum + point.depth, 0) / points.length,
          color: shadeColor(
            piece.ghost ? '#ffffff' : piece.color,
            face.shade,
            piece.ghost ? 0.52 : 1
          ),
          ghost: piece.ghost === true,
        });
      }
    }
  }
  faces.sort((left, right) => right.depth - left.depth);
  for (const face of faces) {
    context.beginPath();
    context.moveTo(face.points[0].x, face.points[0].y);
    for (const point of face.points.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.fillStyle = face.color;
    context.fill();
    context.strokeStyle = face.ghost
      ? 'rgba(245,255,237,.8)'
      : 'rgba(17,32,27,.75)';
    context.lineWidth = face.ghost ? 1.4 : 1;
    context.stroke();
  }
}

/**
 * Draw the open grid plane in the player's nearby view.
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {Camera} player Camera state.
 * @param {number} width Viewport width.
 * @param {number} height Viewport height.
 * @returns {void}
 */
function drawGround(context, player, width, height) {
  context.strokeStyle = 'rgba(177,210,166,.12)';
  context.lineWidth = 1;
  context.beginPath();
  const centerX = Math.round(player.x);
  const centerY = Math.round(player.y);
  /**
   * @param {import('./tetracube.js').TetracubeCell} start Starting point.
   * @param {import('./tetracube.js').TetracubeCell} end Ending point.
   */
  const drawLine = (start, end) => {
    const points = [
      projectPoint(start, player, width, height),
      projectPoint(end, player, width, height),
    ];
    const [startPoint, endPoint] = points;
    if (!startPoint || !endPoint) return;
    context.moveTo(startPoint.x, startPoint.y);
    context.lineTo(endPoint.x, endPoint.y);
  };
  for (let offset = -14; offset <= 14; offset += 1) {
    drawLine(
      { x: centerX + offset, y: centerY - 14, z: 0 },
      { x: centerX + offset, y: centerY + 14, z: 0 }
    );
    drawLine(
      { x: centerX - 14, y: centerY + offset, z: 0 },
      { x: centerX + 14, y: centerY + offset, z: 0 }
    );
  }
  context.stroke();
}

/**
 * Draw one complete Tetracube first-person frame.
 * @param {CanvasRenderingContext2D} context Canvas context.
 * @param {TetracubeWorldState} world Tetracube world state.
 * @param {number} width Canvas width in CSS pixels.
 * @param {number} height Canvas height in CSS pixels.
 * @returns {void}
 */
export function drawTetracubeFrame(context, world, width, height) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#172b2a');
  gradient.addColorStop(0.62, '#315044');
  gradient.addColorStop(1, '#152420');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  drawGround(context, world.player, width, height);
  drawCubes(context, world, width, height);
  context.strokeStyle = 'rgba(244,245,219,.82)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(width / 2 - 8, height / 2);
  context.lineTo(width / 2 + 8, height / 2);
  context.moveTo(width / 2, height / 2 - 8);
  context.lineTo(width / 2, height / 2 + 8);
  context.stroke();
}
