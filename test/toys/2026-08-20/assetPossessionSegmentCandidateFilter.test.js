import { describe, expect, test } from '@jest/globals';
import {
  assetPossessionSegmentCandidateFilter,
  overlap,
  normalizeSku,
  resolve,
} from '../../../src/core/browser/toys/2026-08-20/assetPossessionSegmentCandidateFilter.js';

const points = [
  { pointId: 'P1', timestamp: '2026-01-01T00:00:00Z' },
  { pointId: 'P2', timestamp: '2026-01-01T01:00:00Z' },
  { pointId: 'P3', timestamp: '2026-01-01T02:00:00Z' },
];
const segments = [
  { segmentId: 'S1', startPointId: 'P1', endPointId: 'P2' },
  { segmentId: 'S2', startPointId: 'P2', endPointId: 'P3' },
  { segmentId: 'S3', startPointId: 'P1', endPointId: 'P3' },
];

describe('assetPossessionSegmentCandidateFilter', () => {
  test('filters by SKU, same-asset overlap, and duplicate IDs', () => {
    expect(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({
          points,
          segments,
          possessionSegmentId: 'S2',
          requestedSku: ' sku ',
          assets: [
            { assetId: 'A1', sku: 'sku' },
            { assetId: 'A1', sku: 'sku' },
            { assetId: 'A2', sku: 'sku' },
            { assetId: 'A3', sku: 'other' },
            { assetId: '', sku: 'sku' },
            null,
          ],
          existingAssetAssignments: [
            null,
            [],
            { assetId: 'A1', segmentId: 'S1' },
          ],
        })
      )
    ).toBe('["A1","A2"]');
    expect(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({
          points,
          segments,
          possessionSegmentId: 'S2',
          requestedSku: 7,
          assets: [{ assetId: 'A7', sku: '7' }],
          existingAssetAssignments: [],
        })
      )
    ).toBe('["A7"]');
    expect(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({
          points,
          segments,
          possessionSegmentId: 'S2',
          requestedSku: '7',
          assets: [{ assetId: 'A8', sku: 7 }],
          existingAssetAssignments: [],
        })
      )
    ).toBe('["A8"]');
    expect(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({
          points,
          segments,
          possessionSegmentId: 'S2',
          requestedSku: '7',
          assets: [{ assetId: 'A9', sku: '7' }],
          existingAssetAssignments: [],
        })
      )
    ).toBe('["A9"]');
    expect(normalizeSku({ toString: () => '7' })).toBe('7');
  });

  test('uses the legacy assignment field only when the primary field is absent', () => {
    const request = {
      points,
      segments,
      possessionSegmentId: 'S3',
      requestedSku: 7,
      assets: [{ assetId: 'A1', sku: 7 }],
      assetAssignments: [{ assetId: 'A1', segmentId: 'S1' }],
    };
    expect(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({ ...request, existingAssetAssignments: null })
      )
    ).toBe('[]');
    expect(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({ ...request, existingAssetAssignments: [] })
      )
    ).toBe('["A1"]');
  });

  test('handles malformed input and non-array assignment fallbacks', () => {
    expect(assetPossessionSegmentCandidateFilter('{')).toBe('[]');
    expect(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({ points, segments, possessionSegmentId: 'S2', assets: [] })
      )
    ).toBe('[]');
    expect(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({
          points,
          segments,
          possessionSegmentId: 'S2',
          requestedSku: 'sku',
          assets: [{ assetId: 'A1', sku: 'sku' }],
          existingAssetAssignments: {},
          assetAssignments: [],
        })
      )
    ).toBe('["A1"]');
  });

  test('resolves valid intervals and rejects invalid references or times', () => {
    const pointMap = new Map(points.map(point => [point.pointId, point]));
    const segmentMap = new Map(segments.map(segment => [segment.segmentId, segment]));
    expect(resolve(segmentMap, pointMap, 'S1')).toEqual({
      startTime: Date.parse(points[0].timestamp),
      endTime: Date.parse(points[1].timestamp),
    });
    expect(() => resolve(segmentMap, pointMap, 'missing')).toThrow('Unknown segment');
    expect(() =>
      resolve(
        new Map([['S', { startPointId: 'P1', endPointId: 'missing' }]]),
        pointMap,
        'S'
      )
    ).toThrow('Unknown point');
    expect(() =>
      resolve(
        new Map([['S', { startPointId: 'P1', endPointId: 'P2' }]]),
        new Map([
          ['P1', { pointId: 'P1', timestamp: 'invalid' }],
          ['P2', points[1]],
        ]),
        'S'
      )
    ).toThrow('Invalid interval');
    expect(() =>
      resolve(
        new Map([['S', { startPointId: 'P2', endPointId: 'P1' }]]),
        pointMap,
        'S'
      )
    ).toThrow('Invalid interval');
  });

  test('overlap is strict, allowing touching and zero-duration intervals', () => {
    expect(overlap({ startTime: 0, endTime: 1 }, { startTime: 1, endTime: 2 })).toBe(false);
    expect(overlap({ startTime: 0, endTime: 2 }, { startTime: 1, endTime: 3 })).toBe(true);
    expect(overlap({ startTime: 1, endTime: 1 }, { startTime: 1, endTime: 2 })).toBe(false);
    expect(
      resolve(
        new Map([['S', { startPointId: 'P1', endPointId: 'P1' }]]),
        new Map([['P1', points[0]]]),
        'S'
      )
    ).toEqual({
      startTime: Date.parse(points[0].timestamp),
      endTime: Date.parse(points[0].timestamp),
    });
  });
});
