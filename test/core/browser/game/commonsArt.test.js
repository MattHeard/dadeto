import { generateCommonsTile } from '../../../../src/core/browser/game/the-commons-of-tomorrow/tiles.js';
import { commonsSpriteShapes } from '../../../../src/core/browser/game/the-commons-of-tomorrow/sprites.js';
import { createCommonsState } from '../../../../src/core/browser/game/the-commons-of-tomorrow/simulation.js';
import { renderCommons } from '../../../../src/core/browser/game/the-commons-of-tomorrow/renderer.js';
import { toFramePayload } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { COMMONS_CONTENT } from '../../../../src/core/browser/game/the-commons-of-tomorrow/content.js';

const palette = ['#193b43', '#c7b98f', '#789c7f', '#e29162', '#397e89'];

describe('Commons visual identity', () => {
  test('builds coordinate-stable solar path and wetland tile motifs', () => {
    const path = generateCommonsTile({
      x: 2,
      y: 4,
      palette,
      region: 'village',
    });
    expect(
      generateCommonsTile({ x: 2, y: 4, palette, region: 'village' })
    ).toEqual(path);
    expect(path).toHaveLength(1);
    const walkway = generateCommonsTile({
      x: 2,
      y: 4,
      palette,
      region: 'village',
      walkway: true,
    });
    expect(walkway.map(pixel => pixel.fill)).toContain('#d8c78f');
    expect(walkway).not.toEqual(path);
    const terrace = generateCommonsTile({
      x: 1,
      y: 1,
      palette,
      region: 'village',
    });
    expect(terrace[0]).toMatchObject({
      width: 12,
      height: 12,
      fill: '#416d56',
    });
    const wetland = generateCommonsTile({
      x: 2,
      y: 4,
      palette,
      region: 'shore',
    });
    expect(wetland).not.toEqual(path);
    expect(wetland.map(pixel => pixel.fill)).toContain('#355760');
    expect(wetland.map(pixel => pixel.fill)).toContain('#617369');
    expect(
      generateCommonsTile({
        x: 1,
        y: 1,
        palette,
        region: 'village',
        blocked: true,
        roof: true,
      })
    ).toHaveLength(8);
    expect(
      generateCommonsTile({
        x: 1,
        y: 1,
        palette,
        region: 'shore',
        blocked: true,
      })
    ).toHaveLength(4);
  });

  test('draws original Commons clothing and landmark glyphs as clipped pixels', () => {
    const resident = commonsSpriteShapes(
      { id: 'elian', x: 2, y: 3 },
      { x: 0, y: 0 },
      4
    );
    const prop = commonsSpriteShapes(
      { kind: 'charter', x: 3, y: 3 },
      { x: 0, y: 0 },
      4
    );
    expect(new Set(resident.map(pixel => pixel.fill))).toEqual(
      new Set(['#11121e', '#fff078', '#5887ff', '#fff4d4'])
    );
    expect(resident.some(pixel => pixel.fill === '#e29162')).toBe(false);
    const player = commonsSpriteShapes(
      { id: 'player', controlled: true, facing: 'up', x: 2, y: 3 },
      { x: 0, y: 0 },
      4
    );
    expect(
      player.filter(pixel => pixel.fill === '#fff078').length
    ).toBeGreaterThan(
      resident.filter(pixel => pixel.fill === '#fff078').length
    );
    expect(prop.length).toBeGreaterThan(10);
    const playerDirections = ['up', 'right', 'down', 'left'].map(facing =>
      commonsSpriteShapes(
        { id: 'player', controlled: true, facing, x: 5, y: 5 },
        { x: 0, y: 0 },
        4
      ).filter(pixel => pixel.fill === '#fff078')
    );
    expect(playerDirections).toHaveLength(4);
    expect(
      new Set(
        playerDirections.map(points =>
          points
            .map(point => `${point.x},${point.y}`)
            .slice(-3)
            .join('|')
        )
      ).size
    ).toBe(4);
    const npcShapes = commonsSpriteShapes(
      { id: 'autonomy', x: 5, y: 5 },
      { x: 0, y: 0 },
      4
    );
    expect(playerDirections[0]).not.toEqual(
      npcShapes.filter(pixel => pixel.fill === '#fff078')
    );
    expect(
      commonsSpriteShapes({ id: 'player', x: -1, y: 0 }, { x: 0, y: 0 }, 4)
    ).toHaveLength(0);
    expect(
      commonsSpriteShapes(
        { id: 'unlisted', x: 2, y: 3, facing: 'left' },
        { x: 0, y: 0 },
        12
      )
    ).toHaveLength(
      commonsSpriteShapes(
        { id: 'player', x: 2, y: 3, facing: 'left' },
        { x: 0, y: 0 },
        12
      ).length
    );
    expect(
      commonsSpriteShapes({ kind: 'unlisted', x: 3, y: 3 }, { x: 0, y: 0 }, 4)
    ).toEqual(
      commonsSpriteShapes({ kind: 'discovery', x: 3, y: 3 }, { x: 0, y: 0 }, 4)
    );
  });

  test('gives Weir water and bank tiles strong foreground separation', () => {
    const weir = generateCommonsTile({
      x: 4,
      y: 4,
      palette: ['#182f36', '#617369', '#68786d', '#e29162', '#355760'],
      region: 'shore',
    });
    expect(weir.map(pixel => pixel.fill)).toContain('#355760');
    expect(weir.map(pixel => pixel.fill)).toContain('#617369');
    const luminance = hex => {
      const values = hex
        .match(/[a-f0-9]{2}/gi)
        .map(value => parseInt(value, 16) / 255);
      const linear = values.map(value =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      );
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    expect(
      Math.abs(luminance('#617369') - luminance('#355760'))
    ).toBeGreaterThan(0.07);
    const state = createCommonsState();
    state.world.mapId = 'weir';
    state.world.map = COMMONS_CONTENT.maps.weir;
    const frame = renderCommons(state);
    expect(frame.palette).toEqual([
      '#182f36',
      '#617369',
      '#68786d',
      '#e29162',
      '#355760',
    ]);
    expect(frame.shapes.some(shape => shape.fill === '#21b6cb')).toBe(true);
    expect(
      Math.abs(luminance('#21b6cb') - luminance('#355760'))
    ).toBeGreaterThan(0.2);
    const terrainLuminances = [...new Set(weir.map(pixel => pixel.fill))].map(
      luminance
    );
    expect(
      Math.max(...terrainLuminances) - Math.min(...terrainLuminances)
    ).toBeLessThan(0.15);
  });

  test('includes Commons-specific pixel art in serialized page and toy frames', () => {
    const frame = renderCommons(createCommonsState());
    expect(frame.palette).toEqual(palette);
    expect(frame.shapes.some(shape => shape.fill === '#fff078')).toBe(true);
    expect(frame.shapes.some(shape => shape.fill === '#315744')).toBe(false);
    expect(frame.commons.path).toContain('6,8');
    expect(
      frame.shapes.some(shape => shape.text === 'WEIR → · FOLLOW LIGHT PATH')
    ).toBe(true);
    expect(palette).toContain('#397e89');
    expect(JSON.stringify(frame)).not.toContain('commonsSpriteShapes');
    expect(toFramePayload(createCommonsState()).width).toBe(160);
  });
});
