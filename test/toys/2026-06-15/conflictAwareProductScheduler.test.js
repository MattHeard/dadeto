import { describe, expect, test } from '@jest/globals';
import { conflictAwareProductScheduler } from '../../../src/core/browser/toys/2026-06-15/conflictAwareProductScheduler.js';
import {
  DEFAULTS_FIXTURE,
  INVALID_JSON_INPUT,
  NON_RECORD_INPUT,
  OVERLAP_FIXTURE,
  PRIMITIVE_FALLBACK_FIXTURE,
  QUALITY_OVERLAP_FIXTURE,
  TIE_BY_ID_FIXTURE,
  TIE_BY_TITLE_FIXTURE,
} from './conflictAwareProductScheduler.fixtures.js';

/**
 * Parse a scheduler result.
 * @param {string} input Toy JSON input.
 * @returns {{ ranked: Array<Record<string, unknown>>, summary: Record<string, unknown> }} Parsed scheduler payload.
 */
function parseResult(input) {
  return JSON.parse(conflictAwareProductScheduler(input));
}

describe('conflictAwareProductScheduler', () => {
  test('returns an empty recommendation list for invalid JSON input', () => {
    const result = parseResult(INVALID_JSON_INPUT);

    expect(result).toEqual({
      ranked: [],
      summary: {
        candidateCount: 0,
        activeWorkCount: 0,
      },
    });
  });

  test('treats non-record parsed payloads as empty scheduler input', () => {
    const result = parseResult(NON_RECORD_INPUT);

    expect(result).toEqual({
      ranked: [],
      summary: {
        candidateCount: 0,
        activeWorkCount: 0,
      },
    });
  });

  test('ranks a high-value, low-overlap candidate ahead of a conflicted one', () => {
    const result = parseResult(JSON.stringify(OVERLAP_FIXTURE));

    expect(result.summary).toEqual({
      candidateCount: 2,
      activeWorkCount: 1,
    });
    expect(result.ranked[0]).toMatchObject({
      id: 'fresh',
      score: 10,
      penalties: {
        expectedFileOverlap: 0,
        expectedSharedInfrastructureTouch: 1,
        expectedTestRefactorCollision: 0,
        expectedDeploymentRisk: 0,
      },
    });
    expect(result.ranked[1]).toMatchObject({
      id: 'conflicted',
      score: 7,
      penalties: {
        expectedFileOverlap: 1,
        expectedSharedInfrastructureTouch: 2,
        expectedTestRefactorCollision: 1,
        expectedDeploymentRisk: 1,
      },
    });
  });

  test('defers candidates that overlap active quality work', () => {
    const result = parseResult(JSON.stringify(QUALITY_OVERLAP_FIXTURE));

    expect(result.ranked.map(candidate => candidate.id)).toEqual([
      'isolated',
      'quality-overlap',
    ]);
    expect(result.ranked[1]).toMatchObject({
      score: 8,
      penalties: {
        expectedFileOverlap: 1,
        expectedSharedInfrastructureTouch: 1,
        expectedTestRefactorCollision: 1,
        expectedDeploymentRisk: 1,
      },
    });
  });

  test('defaults missing fields and ignores non-string touch entries', () => {
    const result = parseResult(JSON.stringify(DEFAULTS_FIXTURE));

    expect(result.summary).toEqual({
      candidateCount: 1,
      activeWorkCount: 1,
    });
    expect(result.ranked[0]).toMatchObject({
      id: 'candidate-1',
      title: 'Untitled Draft',
      score: -1,
      penalties: {
        expectedFileOverlap: 1,
        expectedSharedInfrastructureTouch: 0,
        expectedTestRefactorCollision: 0,
        expectedDeploymentRisk: 0,
      },
    });
    expect(result.ranked[0].reason).toContain('1 file overlap');
  });

  test('falls back for primitive candidate and active-work entries', () => {
    const result = parseResult(JSON.stringify(PRIMITIVE_FALLBACK_FIXTURE));

    expect(result.summary).toEqual({
      candidateCount: 1,
      activeWorkCount: 1,
    });
    expect(result.ranked[0]).toMatchObject({
      id: 'candidate-1',
      title: 'candidate-1',
      score: 0,
      penalties: {
        expectedFileOverlap: 0,
        expectedSharedInfrastructureTouch: 0,
        expectedTestRefactorCollision: 0,
        expectedDeploymentRisk: 0,
      },
    });
  });

  test('breaks ties by id for stable ordering', () => {
    const result = parseResult(JSON.stringify(TIE_BY_ID_FIXTURE));

    expect(result.ranked.map(candidate => candidate.id)).toEqual([
      'alpha',
      'beta',
    ]);
    expect(result.ranked[0].reason).toContain('no coordination penalties');
  });

  test('breaks exact-score and id ties by title for stable ordering', () => {
    const result = parseResult(JSON.stringify(TIE_BY_TITLE_FIXTURE));

    expect(result.ranked.map(candidate => candidate.title)).toEqual([
      'Alpha Title',
      'Zulu Title',
    ]);
  });
});
