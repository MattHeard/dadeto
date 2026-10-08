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
  player: '#db7958',
  elian: '#507e6d',
  june: '#d9974f',
  sari: '#6f718e',
  autonomy: '#6f718e',
  tomas: '#597f8b',
});

/**
 * Build Commons-specific people and landmark sprites from a compact pixel alphabet.
 * @param {{id?:string,kind?:string,x:number,y:number,facing?:string}} actor Authored actor.
 * @param {{x:number,y:number}} camera View origin in tiles.
 * @param {number} tick Deterministic visual tick.
 * @returns {Array<{type:string,x:number,y:number,width:number,height:number,fill:string}>} Pixel shapes.
 */
export function commonsSpriteShapes(
  /** @type {{id?:string,kind?:string,x:number,y:number,facing?:string}} */ actor,
  /** @type {{x:number,y:number}} */ camera,
  /** @type {number} */ tick
) {
  const identity = actor.id || 'player';
  const art = actor.kind
    ? PROP_ART[actor.kind] || PROP_ART.discovery
    : ACTOR_ART[identity] || ACTOR_ART.player;
  const shirt = CLOTHING[identity] || '#43868a';
  /** @type {Record<string, string>} */
  const palette = {
    p: '#193b43',
    s: '#f2bd62',
    o: shirt,
    c: '#d9e4b2',
    w: '#397e89',
  };
  const originX = (actor.x - camera.x) * 12;
  const originY = (actor.y - camera.y) * 12;
  const bob = actor.kind ? 0 : Math.floor(tick / 10) % 2;
  return art.split('/').flatMap((row, /** @type {number} */ y) =>
    Array.from(row, (pixel, x) => {
      const left = originX + (actor.facing === 'left' ? 11 - x : x);
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
}
import { createRectShapeFromBounds } from '../../canvasShapes.js';
