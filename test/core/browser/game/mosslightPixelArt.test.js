import { jest } from '@jest/globals';
import { drawPixelText } from '../../../../src/core/browser/pixelFont.js';
import { spriteShapes } from '../../../../src/core/browser/game/mosslight-valley/sprites.js';
import { CONTENT } from '../../../../src/core/browser/game/mosslight-valley/content.js';

test('bitmap glyphs use only solid integer pixels, fixed advance and visible fallback', () => {
  const context = { fillRect: jest.fn() };
  drawPixelText(context, 'Aa ♥!? ↑↓ › … ☃', 4.2, 12.2);
  expect(
    context.fillRect.mock.calls.every(
      call => call.every(Number.isInteger) && call[2] === 1 && call[3] === 1
    )
  ).toBe(true);
  const lower = { fillRect: jest.fn() };
  const upper = { fillRect: jest.fn() };
  drawPixelText(lower, 'a', 0, 6);
  drawPixelText(upper, 'A', 0, 6);
  expect(lower.fillRect.mock.calls).toEqual(upper.fillRect.mock.calls);
  const blank = { fillRect: jest.fn() };
  drawPixelText(blank, ' ', 0, 6);
  expect(blank.fillRect).not.toHaveBeenCalled();
});

test('original cast sprites are distinct, outlined and animate deterministically', () => {
  const camera = { x: 0, y: 0 };
  const ids = ['player', 'mira', 'uncle-vale', 'juniper', 'pip', 'moth'];
  const art = ids.map(id => spriteShapes({ id, x: 2, y: 2 }, camera, 0));
  expect(new Set(art.map(JSON.stringify)).size).toBe(ids.length);
  expect(
    art.every(shapes => new Set(shapes.map(shape => shape.fill)).size >= 3)
  ).toBe(true);
  const actor = { x: 2, y: 2 };
  expect(spriteShapes(actor, camera, 0)).toEqual(art[0]);
  expect(spriteShapes(actor, camera, 8)).not.toEqual(art[0]);
  expect(spriteShapes(actor, camera, 16)).toEqual(art[0]);
  expect(spriteShapes({ ...actor, facing: 'left' }, camera, 0)).toEqual(
    art[0].map(shape => ({ ...shape, x: 24 + 11 - (shape.x - 24) }))
  );
  expect(spriteShapes({ ...actor, id: 'unknown' }, camera, 0)).toEqual(art[0]);
});

test('authored props render shared detailed art and off-screen pixels are clipped', () => {
  for (const map of Object.values(CONTENT.maps))
    for (const prop of map.objects) {
      const art = spriteShapes({ ...prop, x: 1, y: 1 }, { x: 0, y: 0 }, 0);
      expect(art.length).toBeGreaterThan(8);
      expect(new Set(art.map(shape => shape.fill)).size).toBeGreaterThan(1);
    }
  for (const [x, y] of [
    [-1, 1],
    [14, 1],
    [1, -1],
    [1, 9],
  ])
    expect(spriteShapes({ x, y }, { x: 0, y: 0 }, 0)).toEqual([]);
});
