import { describe, expect, test } from '@jest/globals';
import {
  changeTogetherExplorer,
  changeTogetherExplorerTestOnly,
} from '../../../src/core/browser/toys/2026-06-15/changeTogetherExplorer.js';
import {
  COCHANGE_FIXTURE,
  FALLBACK_FIXTURE,
  INVALID_JSON_INPUT,
  NON_RECORD_INPUT,
  NON_ARRAY_CHANGESETS_FIXTURE,
  PARTNER_COUNT_TIE_FIXTURE,
  TIE_FIXTURE,
} from './changeTogetherExplorer.fixtures.js';

/**
 * Parse a co-change result.
 * @param {string} input Toy JSON input.
 * @returns {{ rankedPairs: Array<Record<string, unknown>>, rankedFiles: Array<Record<string, unknown>>, summary: Record<string, unknown> }} Parsed co-change payload.
 */
function parseResult(input) {
  return JSON.parse(changeTogetherExplorer(input));
}

describe('changeTogetherExplorer', () => {
  test('returns an empty co-change report for invalid and non-record input', () => {
    expect(parseResult(INVALID_JSON_INPUT)).toEqual({
      rankedPairs: [],
      rankedFiles: [],
      summary: {
        changeSetCount: 0,
        fileCount: 0,
        pairCount: 0,
      },
    });
    expect(parseResult(NON_RECORD_INPUT)).toEqual({
      rankedPairs: [],
      rankedFiles: [],
      summary: {
        changeSetCount: 0,
        fileCount: 0,
        pairCount: 0,
      },
    });
  });

  test('returns an empty co-change report when changeSets is not an array', () => {
    expect(parseResult(JSON.stringify(NON_ARRAY_CHANGESETS_FIXTURE))).toEqual({
      rankedPairs: [],
      rankedFiles: [],
      summary: {
        changeSetCount: 0,
        fileCount: 0,
        pairCount: 0,
      },
    });
  });

  test('ranks the strongest co-change pair and file hotspots from static input', () => {
    const result = parseResult(JSON.stringify(COCHANGE_FIXTURE));

    expect(result.summary).toEqual({
      changeSetCount: 5,
      fileCount: 3,
      pairCount: 3,
    });
    expect(result.rankedPairs[0]).toMatchObject({
      files: ['src/a.js', 'src/b.js'],
      coChangeCount: 2,
      supportingChangeSetIds: ['commit-1', 'commit-4'],
      reason: 'changed together in 2 change sets',
    });
    expect(result.rankedFiles[0]).toMatchObject({
      file: 'src/a.js',
      touchCount: 4,
      partnerCount: 2,
      partnerFiles: ['src/b.js', 'src/c.js'],
      reason: 'appears in 4 change sets and pairs with 2 files',
    });
  });

  test('falls back for primitive and incomplete change-set entries', () => {
    const result = parseResult(JSON.stringify(FALLBACK_FIXTURE));

    expect(result.summary).toEqual({
      changeSetCount: 2,
      fileCount: 1,
      pairCount: 0,
    });
    expect(result.rankedPairs).toEqual([]);
    expect(result.rankedFiles[0]).toMatchObject({
      file: 'src/solo.js',
      touchCount: 1,
      partnerCount: 0,
      partnerFiles: [],
    });
  });

  test('breaks ties by pair name and then by file name', () => {
    const result = parseResult(JSON.stringify(TIE_FIXTURE));

    expect(result.rankedPairs.map(pair => pair.files)).toEqual([
      ['src/a.js', 'src/d.js'],
      ['src/b.js', 'src/c.js'],
    ]);
    expect(result.rankedFiles.map(file => file.file)).toEqual([
      'src/a.js',
      'src/b.js',
      'src/c.js',
      'src/d.js',
    ]);
  });

  test('prefers files with more partners when touch counts tie', () => {
    const result = parseResult(JSON.stringify(PARTNER_COUNT_TIE_FIXTURE));

    expect(result.rankedFiles.slice(0, 2).map(file => file.file)).toEqual([
      'src/c.js',
      'src/a.js',
    ]);
  });

  test('covers normalization, parsing, and deterministic helper contracts', () => {
    expect(
      changeTogetherExplorerTestOnly.normalizeFileList([
        'b.js',
        'a.js',
        'a.js',
        3,
      ])
    ).toEqual(['a.js', 'b.js']);
    expect(changeTogetherExplorerTestOnly.normalizeFileList(null)).toEqual([]);
    expect(changeTogetherExplorerTestOnly.normalizeChangeSet({}, 2)).toEqual({
      id: 'change-set-3',
      files: [],
    });
    expect(
      changeTogetherExplorerTestOnly.normalizeChangeSets([
        null,
        { id: 'x', files: ['a'] },
      ])
    ).toEqual([
      { id: 'change-set-1', files: [] },
      { id: 'x', files: ['a'] },
    ]);
    expect(
      changeTogetherExplorerTestOnly.parseChangeTogetherInput('{')
    ).toEqual({ changeSets: [] });
    expect(
      changeTogetherExplorerTestOnly.parseChangeTogetherInput('[]')
    ).toStrictEqual({ changeSets: [] });
    expect(
      changeTogetherExplorerTestOnly.parseChangeTogetherInput(
        JSON.stringify({ changeSets: [] })
      )
    ).toEqual({ changeSets: [] });
    expect(changeTogetherExplorerTestOnly.isRecord({})).toBe(true);
    expect(changeTogetherExplorerTestOnly.isRecord([])).toBe(false);
    expect(changeTogetherExplorerTestOnly.isRecord(null)).toBe(false);
    expect(changeTogetherExplorerTestOnly.isRecord('text')).toBe(false);
    expect(changeTogetherExplorerTestOnly.toText('x')).toBe('x');
    expect(changeTogetherExplorerTestOnly.toText(3)).toBe('');
    expect(changeTogetherExplorerTestOnly.pairKey('z', 'a')).toBe('a\u0000z');
  });

  test('builds pair and file statistics for duplicate and singleton sets', () => {
    const stats = changeTogetherExplorerTestOnly.buildCoChangeStats([
      { id: 'b', files: ['b.js', 'a.js'] },
      { id: 'a', files: ['a.js', 'b.js'] },
      { id: 'solo', files: ['c.js'] },
      { id: 'empty', files: [] },
    ]);
    const pair = stats.pairStats.get('a.js\u0000b.js');
    expect(pair.coChangeCount).toBe(2);
    expect(pair.supportingChangeSetIds).toEqual(new Set(['a', 'b']));
    expect(stats.fileStats.get('a.js').touchCount).toBe(2);
    expect(changeTogetherExplorerTestOnly.scorePair(pair)).toMatchObject({
      files: ['b.js', 'a.js'],
      supportingChangeSetIds: ['a', 'b'],
    });
    expect(
      changeTogetherExplorerTestOnly.scoreFile(
        'a.js',
        stats.fileStats.get('a.js')
      )
    ).toMatchObject({
      partnerCount: 1,
      partnerFiles: ['b.js'],
    });
    expect(
      changeTogetherExplorerTestOnly.scoreFile('x.js', {
        touchCount: 1,
        partners: new Set(['z.js', 'a.js']),
      }).partnerFiles
    ).toEqual(['a.js', 'z.js']);
    expect(
      changeTogetherExplorerTestOnly.compareRankedPairs(
        { files: ['z', 'z'], coChangeCount: 2 },
        { files: ['a', 'a'], coChangeCount: 1 }
      )
    ).toBeLessThan(0);
    expect(
      changeTogetherExplorerTestOnly.compareRankedPairs(
        { files: ['a', 'z'], coChangeCount: 1 },
        { files: ['a', 'b'], coChangeCount: 1 }
      )
    ).toBeGreaterThan(0);
    expect(
      changeTogetherExplorerTestOnly.compareRankedFiles(
        { file: 'a', touchCount: 2, partnerCount: 0 },
        { file: 'b', touchCount: 1, partnerCount: 4 }
      )
    ).toBeLessThan(0);
    expect(
      changeTogetherExplorerTestOnly.compareRankedFiles(
        { file: 'a', touchCount: 1, partnerCount: 2 },
        { file: 'b', touchCount: 1, partnerCount: 1 }
      )
    ).toBeLessThan(0);
    expect(
      changeTogetherExplorerTestOnly.compareRankedFiles(
        { file: 'a', touchCount: 1, partnerCount: 1 },
        { file: 'b', touchCount: 1, partnerCount: 1 }
      )
    ).toBeLessThan(0);
    const triple = changeTogetherExplorerTestOnly.buildCoChangeStats([
      { id: 'triple', files: ['a.js', 'b.js', 'c.js'] },
    ]);
    expect(triple.pairStats.size).toBe(3);
    expect(triple.fileStats.get('c.js').partners).toEqual(
      new Set(['a.js', 'b.js'])
    );
  });
});
