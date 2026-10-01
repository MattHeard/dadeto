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

  expect(tile[0].fill).toBe(palette[0]);
  expect(tile).toHaveLength(3);
});
