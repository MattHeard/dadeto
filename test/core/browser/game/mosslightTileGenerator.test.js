import { generateBackgroundTile } from '../../../../src/core/browser/game/mosslight-valley/tileGenerator.js';

const palette = ['#182f36', '#315744', '#bfd77c', '#e9d88d'];

test('generates stable, bounded pixel details for each region', () => {
  const regions = ['village', 'shore', 'orchard', 'hollow'];
  const patterns = regions.map(region =>
    generateBackgroundTile({ x: 5, y: 7, palette, region })
  );

  expect(new Set(patterns.map(JSON.stringify)).size).toBe(regions.length);
  expect(
    generateBackgroundTile({ x: 5, y: 7, palette, region: 'village' })
  ).toEqual(patterns[0]);
  for (const pattern of patterns)
    for (const rect of pattern) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(12);
      expect(rect.y + rect.height).toBeLessThanOrEqual(12);
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
    }
});

test('gives blocked ground its own stable stone treatment', () => {
  const tile = generateBackgroundTile({
    x: 3,
    y: 4,
    palette,
    region: 'village',
    blocked: true,
  });

  expect(tile[0].fill).toBe(palette[1]);
  expect(tile.length).toBeGreaterThan(3);
});

test('keeps walkable terrain continuous and puts variation in pixel-art details', () => {
  const regions = ['village', 'shore', 'orchard', 'hollow'];
  for (const region of regions) {
    const tiles = Array.from({ length: 12 }, (_, x) =>
      generateBackgroundTile({ x, y: 6, palette, region })
    );

    expect(tiles.every(tile => tile[0].fill === palette[1])).toBe(true);
    expect(tiles.every(tile => tile.length > 2)).toBe(true);
    expect(
      new Set(tiles.map(tile => JSON.stringify(tile.slice(1)))).size
    ).toBeGreaterThan(1);
  }
});
