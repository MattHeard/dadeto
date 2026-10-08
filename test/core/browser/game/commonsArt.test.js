import { generateCommonsTile } from '../../../../src/core/browser/game/the-commons-of-tomorrow/tiles.js';
import { commonsSpriteShapes } from '../../../../src/core/browser/game/the-commons-of-tomorrow/sprites.js';
import { createCommonsState } from '../../../../src/core/browser/game/the-commons-of-tomorrow/simulation.js';
import { renderCommons } from '../../../../src/core/browser/game/the-commons-of-tomorrow/renderer.js';
import { toFramePayload } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';

const palette = ['#173c3a', '#557b59', '#b6c878', '#f2bd62'];

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
    expect(path.map(pixel => pixel.fill)).toContain('#f2bd62');
    const wetland = generateCommonsTile({
      x: 2,
      y: 4,
      palette,
      region: 'shore',
    });
    expect(wetland).not.toEqual(path);
    expect(wetland.map(pixel => pixel.fill)).toContain('#173c3a');
    expect(
      generateCommonsTile({
        x: 1,
        y: 1,
        palette,
        region: 'village',
        blocked: true,
        roof: true,
      })
    ).toHaveLength(6);
    expect(
      generateCommonsTile({
        x: 1,
        y: 1,
        palette,
        region: 'shore',
        blocked: true,
      })
    ).toHaveLength(5);
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
      new Set(['#173c3a', '#f2bd62', '#497d67', '#d9e4b2'])
    );
    expect(prop.length).toBeGreaterThan(10);
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

  test('includes Commons-specific pixel art in serialized page and toy frames', () => {
    const frame = renderCommons(createCommonsState());
    expect(frame.palette).toEqual(palette);
    expect(frame.shapes.some(shape => shape.fill === '#f2bd62')).toBe(true);
    expect(frame.shapes.some(shape => shape.fill === '#315744')).toBe(false);
    expect(JSON.stringify(frame)).not.toContain('commonsSpriteShapes');
    expect(toFramePayload(createCommonsState()).width).toBe(160);
  });
});
