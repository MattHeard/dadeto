import { describe, expect, test } from '@jest/globals';
import { changeTogetherExplorer } from '../../../src/core/browser/toys/2026-06-15/changeTogetherExplorer.js';
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
});
