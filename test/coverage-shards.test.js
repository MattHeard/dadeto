import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  addUncoveredFiles,
  mergeCoverageFragment,
  partitionValues,
} from '../scripts/coverage-shards.js';

describe('coverage shard helpers', () => {
  test('partitions values deterministically', () => {
    expect(partitionValues(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e'],
    ]);
  });

  test('rejects invalid shard sizes', () => {
    expect(() => partitionValues(['a'], 0)).toThrow(
      'Coverage shard size must be a positive integer.'
    );
  });

  test('merges fragments and creates zero coverage for absent files', () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'coverage-shards-')
    );
    const sourcePath = path.join(directory, 'example.js');
    const storePath = path.join(directory, 'store');
    fs.writeFileSync(sourcePath, 'export const value = 1;\n');
    mergeCoverageFragment(
      { 'src/example.js': createCoverage('src/example.js') },
      storePath,
      ['src/example.js']
    );
    mergeCoverageFragment(
      { 'src/example.js': createCoverage('src/example.js') },
      storePath,
      ['src/example.js']
    );
    addUncoveredFiles([sourcePath], {}, storePath);
    expect(fs.readdirSync(storePath)).toHaveLength(2);
    fs.rmSync(directory, { recursive: true, force: true });
  });
});

/**
 *
 * @param filePath
 */
/**
 * Build a minimal Istanbul file coverage record.
 * @param {string} filePath Coverage path.
 * @returns {Record<string, unknown>} Coverage record.
 */
function createCoverage(filePath) {
  return {
    path: filePath,
    statementMap: {
      0: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
    },
    fnMap: {},
    branchMap: {},
    s: { 0: 1 },
    f: {},
    b: {},
  };
}
