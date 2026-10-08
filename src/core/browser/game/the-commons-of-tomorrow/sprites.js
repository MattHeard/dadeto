/** @type {Record<string, string>} */
const ACTOR_ART = Object.freeze({
  player:
    '...pppp...../..pppppp..../..ppsspp..../...psssp..../..pppppp..../...oooo..../..oooooo..../..ooccoo..../...cc.cc..../...cc.cc....',
  elian:
    '...pppp...../..pppppp..../..ppsspp..../..pssssp..../...pppp...../...oooo..../..oooooo..../..oocooo..../...cc.cc..../...cc.cc....',
  june: '...ssss...../..ssssss..../..ssppss..../..spppps..../...ssss...../...oooo..../..oooooo..../..oooccoo.../...cc.cc..../...cc.cc....',
  sari: '...cccc...../..cccccc..../..ccppcc..../..cppppc..../...cccc...../...oooo..../..oooooo..../..oococo..../...cc.cc..../...cc.cc....',
  autonomy:
    '...ssss...../..ssssss..../..ssppss..../..spppps..../...ssss...../...oooo..../..oooooo..../..oooccoo.../...cc.cc..../...cc.cc....',
  tomas:
    '...oooo...../..oooooo..../..ooppoo..../..oppppo..../...oooo...../...cccc..../..cccccc..../..ccoccc..../...cc.cc..../...cc.cc....',
});
/** @type {Record<string, string>} */
const PROP_ART = Object.freeze({
  noticeboard:
    '..ssssss..../..sppppps..../..sppssps..../..sppppps..../..ssssss..../....cc....../....cc......',
  charter:
    '...ssss...../..sppppps..../..sppppps..../...ssss...../...cccc...../...cccc.....',
  community:
    '..oooooo..../..occcccco.../.occccccco../.occccccco../..oooooo..../...cccc.....',
  landmark:
    '.....ss...../....ssss..../...ssssss.../..ssppppss../...ssppss.../.....cc......',
  evidence:
    '....ssss..../...spppps.../..spppppps../...spppps.../....ssss..../.....cc......',
  puzzle:
    '..cccccc..../..cpooopc..../..coooopc..../..cccccc..../...ssss...../...ssss.....',
  bridge:
    '...ssss...../..sppppps..../.sppppppps.../..sppppps..../...ssss...../...cc.cc.....',
  discovery:
    '.....s....../....sss...../...sssss..../..sspppss.../...sssss..../....sss...../.....s......',
});
/** @type {Record<string, string>} */
const CLOTHING = Object.freeze({
  player: '#d66c45',
  elian: '#497d67',
  june: '#e7a64e',
  sari: '#7966a6',
  autonomy: '#7966a6',
  tomas: '#43868a',
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
  const palette = { p: '#173c3a', s: '#f2bd62', o: shirt, c: '#d9e4b2' };
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
