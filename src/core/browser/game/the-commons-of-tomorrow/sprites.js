/** @type {Record<string, string>} */
const ACTOR_ART = Object.freeze({
  player:
    '...ssssss.../..ssssssss../.ssppppppss./...pccccp.../...ppsspp.../....pppp..../..oooppooo../.oooopppooo./.oooocccooo./..ooocooo.../...cc..cc.../..ccc..ccc..',
  elian:
    '....s..s..../...ss..ss.../..ssppppss../...pccccp.../...pppppp.../..ccppppcc../.cccooooccc./cccooooccc../..ccoooooc../...cc..cc.../...cc..cc.../..ccc..ccc..',
  june: '..ssssssss../.ssssssssss./.ssppppppss./..pccccccp../...pppppp.../...pppppp.../.oooppooo.../oooooooooooo/oooooooooooo/.oooccccooo./..cc......cc/...cc....cc.',
  sari: '...ssssss.../..ssssssss../...pppppp.../....pccp..../....pppp..../...pppppp.../..ooooppooc../..ooooppooc../..ooooppooc../...cc..cc.../...cc..cc.../..ccc..ccc..',
  autonomy:
    '...ssssss.../..ssssssss../.ssppppppss./...pccccp.../...ppsspp.../....pppp..../..oooppooo../.oooopppooo./.oooocccooo./..ooocooo.../...cc..cc.../..ccc..ccc..',
  tomas:
    '..ssssssss../.ssppppppss./.ssppccccss./..ppccccpp../..pppppppp../..pppppppp../.oooooooccc./oooooooooooo/oooooooooooo/.oooocccooo./..cc......cc/...cc....cc.',
});
/** @type {Record<string, string>} */
const PROP_ART = Object.freeze({
  noticeboard:
    '.ssssssssss./.pccccccccp./.pccppppccp./.pccccccccp./.pppppppppp./....cc.cc..../....cc.cc....',
  charter:
    '...ssssss.../..sppppppss./.ssppppppppss/.ssppppppppss/.ssppppppppss/..ssssssss../...cc..cc...',
  community:
    '...ssssss.../..sccccccss./.sccccccccss/.sccccccccss/..sccccccss.../..oooooooo../.oooooooooo./.oooooooooo./..cc......cc.',
  landmark:
    '...s..s.../..sss..sss../.ssssssssss./.ssppppppss./..ssppppss.../....pppp....../....cccc....../...cccccc.....',
  evidence:
    '.....ss...../....ssss..../...ssppss.../..sspcppss../...ssppss.../....ssss..../.....ss......',
  puzzle:
    '..cccccccc../.ccppppppcc./ccpwwwwwwpcc/ccpwwwwwwpcc/.ccppppppcc./..cccccccc../...ssssss.....',
  bridge:
    '..ssssssss../.ssppppppss./ssppppppppss/ssppppppppss/.ssppppppss./..ssssssss../...cc....cc...',
  discovery:
    '....ss..ss..../...sss..sss.../..sssssssss../.ssppppppss./..ssppppss.../...ssssss...../....ssss....../.....ss.......',
});
/** @type {Record<string, string>} */
const CLOTHING = Object.freeze({
  player: '#21b6cb',
  elian: '#5887ff',
  june: '#e36cff',
  sari: '#ff765f',
  autonomy: '#ffc04d',
  tomas: '#f05ab8',
});

/** @type {Record<string, number[][]>} */
const DIRECTIONS = Object.freeze({
  up: [
    [5, -2],
    [4, -1],
    [6, -1],
  ],
  right: [
    [12, 5],
    [11, 4],
    [11, 6],
  ],
  down: [
    [5, 12],
    [4, 11],
    [6, 11],
  ],
  left: [
    [-1, 5],
    [0, 4],
    [0, 6],
  ],
});

/**
 * Build Commons-specific people and landmark sprites from a compact pixel alphabet.
 * @param {{id?:string,kind?:string,x:number,y:number,facing?:string,controlled?:boolean}} actor Authored actor.
 * @param {{x:number,y:number}} camera View origin in tiles.
 * @param {number} tick Deterministic visual tick.
 * @returns {Array<{type:string,x:number,y:number,width:number,height:number,fill:string}>} Pixel shapes.
 */
export function commonsSpriteShapes(
  /** @type {{id?:string,kind?:string,x:number,y:number,facing?:string,controlled?:boolean}} */ actor,
  /** @type {{x:number,y:number}} */ camera,
  /** @type {number} */ tick
) {
  const identity = actor.id || 'player';
  const facing = actor.facing || 'up';
  const art =
    actor.controlled && !actor.kind
      ? playerSilhouette(facing)
      : actor.kind
        ? PROP_ART[actor.kind] || PROP_ART.discovery
        : ACTOR_ART[identity] || ACTOR_ART.player;
  const shirt = CLOTHING[identity] || '#43868a';
  /** @type {Record<string, string>} */
  const palette = {
    p: '#11121e',
    s: '#fff078',
    o: shirt,
    c: '#fff4d4',
    w: '#397e89',
  };
  const originX = (actor.x - camera.x) * 12;
  const originY = (actor.y - camera.y) * 12;
  const bob = actor.kind ? 0 : Math.floor(tick / 10) % 2;
  /** @type {Array<{type:string,x:number,y:number,width:number,height:number,fill:string}>} */
  const pixels = art.split('/').flatMap((row, /** @type {number} */ y) =>
    Array.from(row, (pixel, x) => {
      const left = originX + (facing === 'left' ? 11 - x : x);
      const rowIndex = Number(y);
      const top = originY + rowIndex - (rowIndex === 9 ? bob : 0);
      if (!palette[pixel] || left < 0 || left >= 160 || top < 0 || top >= 108)
        return [];
      return [
        /** @type {{type:string,x:number,y:number,width:number,height:number,fill:string}} */ (
          createRectShapeFromBounds([left, top, 1, 1], palette[pixel])
        ),
      ];
    }).flat()
  );
  if (actor.controlled && !actor.kind && originX >= 0 && originX < 148) {
    for (const [dx, dy] of DIRECTIONS[facing] || DIRECTIONS.up) {
      const markerX = originX + dx;
      const markerY = originY + dy;
      if (markerX >= 0 && markerX < 160 && markerY >= 0 && markerY < 108)
        pixels.push(
          /** @type {{type:string,x:number,y:number,width:number,height:number,fill:string}} */ (
            pixel(markerX, markerY, '#fff078')
          )
        );
    }
  }
  return pixels;
}

/**
 * Add a backpack strap and directional face pixel to make the controlled person readable.
 * @param {string} facing Current facing.
 * @returns {string} Twelve-row pixel art.
 */
function playerSilhouette(facing) {
  const rows = ACTOR_ART.player.split('/').map(row => row.split(''));
  rows[6][2] = 'o';
  rows[7][2] = 'o';
  const [eyeX, eyeY] =
    facing === 'left'
      ? [3, 3]
      : facing === 'right'
        ? [8, 3]
        : facing === 'down'
          ? [6, 5]
          : [6, 2];
  rows[eyeY][eyeX] = 's';
  return rows.map(row => row.join('')).join('/');
}

/**
 * Create a one-pixel direction mark.
 * @param {number} x Logical x.
 * @param {number} y Logical y.
 * @param {string} fill Pixel color.
 * @returns {Record<string, any>} Pixel shape.
 */
function pixel(x, y, fill) {
  return createRectShapeFromBounds([x, y, 1, 1], fill);
}
import { createRectShapeFromBounds } from '../../canvasShapes.js';
