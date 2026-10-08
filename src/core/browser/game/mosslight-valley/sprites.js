/**
 * Original 12px foreground art, transparent dots and palette-indexed pixels.
 * @type {Record<string, string[]>}
 */
const ACTORS = {
  player:
    '....hhhh..../...hhhhhh.../...hsssshh../...hsksss.../....ssss..../...cccccc.../..sccccccs../..sccbcccs../...cccccc.../...kk.kk..../...kk.kk..../............'.split(
      '/'
    ),
  mira: '...hhhhhh.../..hhhhhhhh../..hhsssshh../..hssksshh../..hssssshh../...cccccc.../..sccccccs../..scacaccs../...aaaaaa.../..aaaaaaaa../...kk.kk..../............'.split(
    '/'
  ),
  'uncle-vale':
    '...aaaaaa.../..aaaaaaaa../...hssss..../...sskss..../...shhhh..../...cccccc.../..sccaccas../..sccaccas../...cccccc.../...kk.kk..../...kk.kk..../............'.split(
      '/'
    ),
  juniper:
    '.....aa...../....aaaa..../...hhhhhh.../...hsssshh../...hsksshh../....ssss..../..cccccccc../..sccaccas../...caaaac.../...cccccc.../...kk.kk..../............'.split(
      '/'
    ),
  pip: '............/....hhhh..../...hhhhhh.../...hssss..../...sskss..../....ssss..../...cccccc.../..sccaccas../...cccccc.../...kk.kk..../............/............'.split(
    '/'
  ),
  moth: parseSpriteRows(
    '............/..aa....aa../.acca..acca./..acckkcca../...cckkcc.../....kkkk..../...cckkcc.../..acc..cca../...a....a.../............/............/............'
  ),
};
/** @type {Record<string, string[]>} */
const PROPS = {
  well: '............/....aaaa..../...akkkka.../..ak....ka../..a......a../..aaaaaaaa../..ckkkkkkc../..cckkkkcc../..cccccccc../...cccccc.../............/............'.split(
    '/'
  ),
  farm: '............/...a..a...../....aa....../.....a....../..cccccccc../..ckckckcc../..cccccccc../..cckckckc../..cccccccc../..ckckckcc../............/............'.split(
    '/'
  ),
  fishing:
    '............/.......a..../......ak..../.....ak...../....ak....../...ak......./..ak....c.../..a.....c.../........c.../.......ccc../..ccccc...../............'.split(
      '/'
    ),
  noticeboard:
    '............/..aaaaaaaa../..acccccca../..ackkkcca../..acccccca../..ackkkcca../..aaaaaaaa../...k..k...../...k..k...../...k..k...../............/............'.split(
      '/'
    ),
  rest: '............/..a........./..acccccc.../..acccccc.../..aaaaaaaa../..assssssa../..acccccca../..acccccca../..aaaaaaaa../..a......a../............/............'.split(
    '/'
  ),
  memory: parseSpriteRows(
    '............/.....a....../....aaa...../...aacaa..../..aacccaa.../...aacaa..../....aaa...../.....a....../............/............/............/............'
  ),
};
/** @type {Record<string, string[]>} */
const COLOURS = {
  player: '#442f37/#e9794d/#f7dc9f/#e8be62'.split('/'),
  mira: '#48344a/#6995ab/#f4c89b/#e9dfa0'.split('/'),
  'uncle-vale': '#4d3532/#a47757/#edc297/#b7cb76'.split('/'),
  juniper: '#34364f/#9a719f/#f0cda5/#e8ce6f'.split('/'),
  pip: '#49382d/#dfb949/#f1cc9d/#76bba1'.split('/'),
  moth: '#283147/#acb4e4/#eee8b5/#7eceb8'.split('/'),
};

/**
 * Parse the slash-separated rows of a pixel sprite.
 * @param {string} rows Encoded sprite rows.
 * @returns {string[]} Pixel rows.
 */
function parseSpriteRows(rows) {
  return rows.split('/');
}

/**
 * Build original outlined actor or prop art for either presenter.
 * @param {{id?: string, kind?: string, x: number, y: number, facing?: string, art?: string[], colours?: string[]}} actor Actor or map prop.
 * @param {{x: number, y: number}} camera Viewport origin in tiles.
 * @param {number} tick Deterministic animation clock.
 * @returns {Array<{type: string,x: number,y: number,width: number,height: number,fill: string}>} Pixel shapes.
 */
export function spriteShapes(actor, camera, tick) {
  const identity = actor.id || 'player';
  const art =
    actor.art ||
    (actor.kind
      ? PROPS[actor.kind] || PROPS.memory
      : ACTORS[identity] || ACTORS.player);
  const colours = actor.colours || COLOURS[identity] || COLOURS.player;
  /** @type {Record<string, string>} */
  const palette = {
    k: '#172c34',
    h: colours[0],
    c: colours[1],
    s: colours[2],
    a: colours[3],
    b: '#f4e9ba',
  };
  /** @type {Array<{type: string,x: number,y: number,width: number,height: number,fill: string}>} */
  const shapes = [];
  const originX = (actor.x - camera.x) * 12;
  const originY = (actor.y - camera.y) * 12;
  const phase = Math.floor(tick / 8) % 2;
  art.forEach((row, y) =>
    Array.from(row).forEach((pixel, x) => {
      if (pixel === '.') return;
      const mirrored = actor.facing === 'left' ? 11 - x : x;
      const sway = !actor.kind && y === 10 ? phase : 0;
      const left = originX + mirrored;
      const top = originY + y - sway;
      if (left < 0 || left >= 160 || top < 0 || top >= 108) return;
      shapes.push({
        type: 'rect',
        x: left,
        y: top,
        width: 1,
        height: 1,
        fill: palette[pixel],
      });
    })
  );
  return shapes;
}
