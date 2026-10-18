import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  addUncoveredFiles,
  listUncoveredBranches,
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

  test('reports uncovered branch arms with source locations', () => {
    expect(
      listUncoveredBranches({
        'src/example.js': {
          b: { 0: [1, 0] },
          branchMap: {
            0: {
              locations: [
                { start: { line: 3, column: 1 } },
                { start: { line: 5, column: 2 } },
              ],
            },
          },
        },
      })
    ).toEqual([
      {
        file: 'src/example.js',
        branch: '0',
        arm: 1,
        line: 5,
        column: 2,
      },
    ]);
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
