const WGS84_ASSETS = [
  ['adapters/wgs84.js', 'adapters/wgs84.js'],
  [
    'logic/boundary/wgs84/coordinates.js',
    'logic/boundary/wgs84/coordinates.js',
  ],
  ['logic/core/wgs84/wgs84.js', 'logic/core/wgs84/wgs84.js'],
  ['build/assets/wgs84/root.js.txt', 'core/wgs84.js'],
  ['build/assets/wgs84/index.js.txt', 'core/wgs84/index.js'],
  ['build/assets/wgs84/math.js.txt', 'core/wgs84/wgs84.js'],
  [
    'build/assets/wgs84/toy.js.txt',
    'core/browser/toys/2026-08-20/wgs84Distance.js',
  ],
];

/**
 * Project authoritative WGS84 sources into a complete browser or cloud package.
 * Compatibility modules are build outputs preserving existing published URLs.
 * @param {string} srcDir Source root.
 * @param {string} outputDir Artifact root.
 * @param {(first: string, ...rest: string[]) => string} join Injected path join.
 * @returns {Array<{source: string, target: string}>} Exact module copies.
 */
export function createWgs84AssetCopies(srcDir, outputDir, join) {
  return WGS84_ASSETS.map(([source, target]) => ({
    source: join(srcDir, source),
    target: join(outputDir, target),
  }));
}
