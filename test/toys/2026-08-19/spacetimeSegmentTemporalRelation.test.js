import { describe, expect, test } from '@jest/globals';
import {
  classify,
  isJsonObject,
  normalizeSegmentId,
  parseRequest,
  resolveInterval,
  sharesBoundaryPoint,
  spacetimeSegmentTemporalRelation,
} from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentTemporalRelation.js';

const payload = (firstSegmentId, secondSegmentId) =>
  JSON.stringify({
    firstSegmentId,
    secondSegmentId,
    points: [
      { pointId: 'A', timestamp: '2026-08-19T09:00Z' },
      { pointId: 'B', timestamp: '2026-08-19T10:00Z' },
      { pointId: 'C', timestamp: '2026-08-19T11:00Z' },
      { pointId: 'D', timestamp: '2026-08-19T12:00Z' },
    ],
    segments: [
      { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
      { segmentId: 'BC', startPointId: 'B', endPointId: 'C' },
      { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
    ],
  });

describe('spacetimeSegmentTemporalRelation', () => {
  test('classifies shared endpoint as touching', () => {
    expect(
      JSON.parse(spacetimeSegmentTemporalRelation(payload('AB', 'BC'))).relation
    ).toBe('touching');
  });

  test('does not call equal-time different points touching', () => {
    const result = JSON.parse(
      spacetimeSegmentTemporalRelation(
        JSON.stringify({
          firstSegmentId: 'AB',
          secondSegmentId: 'CD',
          points: [
            { pointId: 'A', timestamp: '2026-08-19T09:00Z' },
            { pointId: 'B', timestamp: '2026-08-19T10:00Z' },
            { pointId: 'C', timestamp: '2026-08-19T10:00Z' },
            { pointId: 'D', timestamp: '2026-08-19T11:00Z' },
          ],
          segments: [
            { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
            { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
          ],
        })
      )
    );
    expect(result.relation).toBe('disjoint');
  });

  test('classifies shared duration as overlapping', () => {
    expect(
      JSON.parse(spacetimeSegmentTemporalRelation(payload('AB', 'CD'))).relation
    ).toBe('disjoint');
    const result = JSON.parse(
      spacetimeSegmentTemporalRelation(
        JSON.stringify({
          ...JSON.parse(payload('AB', 'BC')),
          firstSegmentId: 'AB',
          secondSegmentId: 'AC',
          segments: [
            { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
            { segmentId: 'AC', startPointId: 'A', endPointId: 'C' },
          ],
        })
      )
    );
    expect(result.relation).toBe('overlapping');
  });

  test('classifies separate intervals as disjoint', () => {
    expect(
      JSON.parse(spacetimeSegmentTemporalRelation(payload('AB', 'CD'))).relation
    ).toBe('disjoint');
  });

  test('returns a structured error for missing references', () => {
    expect(
      JSON.parse(spacetimeSegmentTemporalRelation(payload('AB', 'missing')))
    ).toMatchObject({ valid: false });
    expect(JSON.parse(spacetimeSegmentTemporalRelation('{'))).toMatchObject({
      valid: false,
    });
    expect(JSON.parse(spacetimeSegmentTemporalRelation(''))).toEqual({
      valid: false,
      error: 'points and segments arrays are required.',
    });
    expect(
      JSON.parse(
        spacetimeSegmentTemporalRelation(
          JSON.stringify({
            ...JSON.parse(payload('AB', 'BC')),
            firstSegmentId: '',
          })
        )
      )
    ).toMatchObject({ valid: false });
  });

  test('resolves points through spacePoints references', () => {
    const result = JSON.parse(
      spacetimeSegmentTemporalRelation(
        JSON.stringify({
          points: [
            { pointId: 'A', spacePointId: 'SP-A', timestamp: '2026-08-19T09:00Z' },
            { pointId: 'B', spacePointId: 'SP-B', timestamp: '2026-08-19T10:00Z' },
          ],
          spacePoints: [
            { spacePointId: 'SP-A', latitude: 0, longitude: 0, timestamp: '2026-08-19T09:00Z' },
            { spacePointId: 'SP-B', latitude: 0, longitude: 1, timestamp: '2026-08-19T10:00Z' },
          ],
          segments: [{ segmentId: 'AB', startPointId: 'A', endPointId: 'B' }],
          firstSegmentId: 'AB',
          secondSegmentId: 'AB',
        })
      )
    );
    expect(result.relation).toBe('overlapping');
  });

  test('validates relation request shape and identifiers', () => {
    expect(isJsonObject({})).toBe(true);
    expect(isJsonObject(null)).toBe(false);
    expect(isJsonObject([])).toBe(false);
    expect(isJsonObject('request')).toBe(false);
    expect(normalizeSegmentId(123)).toBe('123');
    expect(normalizeSegmentId(null)).toBe('');
    expect(() => parseRequest('null')).toThrow('Input must be a JSON object.');
    expect(() => parseRequest('[]')).toThrow('Input must be a JSON object.');
    expect(() => parseRequest(JSON.stringify({}))).toThrow(
      'points and segments arrays are required.'
    );
    expect(() =>
      parseRequest(JSON.stringify({ points: [], segments: [] }))
    ).toThrow('firstSegmentId and secondSegmentId are required.');
    expect(() =>
      parseRequest(JSON.stringify({ points: {}, segments: [] }))
    ).toThrow('points and segments arrays are required.');
    expect(parseRequest(payload(' AB ', 'BC')).firstSegmentId).toBe('AB');
    expect(
      parseRequest(
        JSON.stringify({
          points: [],
          segments: [],
          firstSegmentId: 123,
          secondSegmentId: 456,
        })
      )
    ).toMatchObject({ firstSegmentId: '123', secondSegmentId: '456' });
    expect(() =>
      parseRequest(
        JSON.stringify({
          points: [],
          segments: [],
          firstSegmentId: '',
          secondSegmentId: 'B',
        })
      )
    ).toThrow('firstSegmentId and secondSegmentId are required.');
    expect(() =>
      parseRequest(
        JSON.stringify({
          points: [],
          segments: [],
          firstSegmentId: 'A',
          secondSegmentId: '',
        })
      )
    ).toThrow('firstSegmentId and secondSegmentId are required.');
    expect(() =>
      parseRequest(
        JSON.stringify({ points: [], segments: [], secondSegmentId: 'B' })
      )
    ).toThrow('firstSegmentId and secondSegmentId are required.');
    expect(() =>
      parseRequest(
        JSON.stringify({ points: [], segments: [], firstSegmentId: 'A' })
      )
    ).toThrow('firstSegmentId and secondSegmentId are required.');
    expect(
      parseRequest(
        JSON.stringify({
          points: [],
          segments: [],
          firstSegmentId: { id: 'A' },
          secondSegmentId: { id: 'B' },
        })
      )
    ).toMatchObject({
      firstSegmentId: '[object Object]',
      secondSegmentId: '[object Object]',
    });
  });

  test('resolves valid and invalid segment intervals directly', () => {
    const points = new Map([
      ['A', { pointId: 'A', timestamp: '2026-08-19T09:00Z' }],
      ['B', { pointId: 'B', timestamp: '2026-08-19T10:00Z' }],
    ]);
    const segments = new Map([
      ['AB', { segmentId: 'AB', startPointId: 'A', endPointId: 'B' }],
    ]);
    expect(resolveInterval(segments, points, 'AB')).toMatchObject({
      startPointId: 'A',
      endPointId: 'B',
    });
    expect(() => resolveInterval(segments, points, 'missing')).toThrow(
      'Unknown segment: missing'
    );
    expect(() =>
      resolveInterval(
        new Map([
          ['AB', { segmentId: 'AB', startPointId: 'X', endPointId: 'B' }],
        ]),
        points,
        'AB'
      )
    ).toThrow('Segment AB references an unknown point.');
    expect(() =>
      resolveInterval(
        new Map([
          ['AB', { segmentId: 'AB', startPointId: 'B', endPointId: 'A' }],
        ]),
        points,
        'AB'
      )
    ).toThrow('Segment AB must have an ordered valid time interval.');
    expect(() =>
      resolveInterval(
        new Map([
          ['AB', { segmentId: 'AB', startPointId: 'A', endPointId: 'B' }],
        ]),
        new Map([
          ['A', { timestamp: 'bad' }],
          ['B', { timestamp: '2026-08-19T10:00Z' }],
        ]),
        'AB'
      )
    ).toThrow('Segment AB must have an ordered valid time interval.');
    expect(
      resolveInterval(
        new Map([
          ['AB', { segmentId: 'AB', startPointId: 'A', endPointId: 'B' }],
        ]),
        new Map([
          ['A', { timestamp: '2026-08-19T10:00Z' }],
          ['B', { timestamp: '2026-08-19T10:00Z' }],
        ]),
        'AB'
      )
    ).toMatchObject({
      start: '2026-08-19T10:00Z',
      end: '2026-08-19T10:00Z',
    });
  });

  test('classifies all interval and boundary relations', () => {
    const first = {
      startTime: 0,
      endTime: 10,
      startPointId: 'A',
      endPointId: 'B',
    };
    const second = {
      startTime: 10,
      endTime: 20,
      startPointId: 'B',
      endPointId: 'C',
    };
    expect(sharesBoundaryPoint(first, second)).toBe(true);
    expect(sharesBoundaryPoint(second, first)).toBe(true);
    expect(
      sharesBoundaryPoint(
        {
          ...first,
          startTime: 10,
          endTime: 20,
          startPointId: 'B',
          endPointId: 'C',
        },
        {
          ...second,
          startTime: 0,
          endTime: 10,
          startPointId: 'A',
          endPointId: 'B',
        }
      )
    ).toBe(true);
    expect(
      sharesBoundaryPoint(
        {
          ...first,
          startTime: 10,
          endTime: 20,
          startPointId: 'X',
          endPointId: 'C',
        },
        {
          ...second,
          startTime: 0,
          endTime: 10,
          startPointId: 'A',
          endPointId: 'B',
        }
      )
    ).toBe(false);
    expect(
      sharesBoundaryPoint(
        { startTime: 0, endTime: 10, startPointId: 'A', endPointId: 'B' },
        { startTime: 20, endTime: 30, startPointId: 'B', endPointId: 'C' }
      )
    ).toBe(false);
    expect(
      sharesBoundaryPoint(
        { startTime: 20, endTime: 30, startPointId: 'B', endPointId: 'C' },
        { startTime: 0, endTime: 10, startPointId: 'A', endPointId: 'B' }
      )
    ).toBe(false);
    expect(
      sharesBoundaryPoint(
        { startTime: 0, endTime: 10, startPointId: 'X', endPointId: 'Y' },
        { startTime: 10, endTime: 20, startPointId: 'A', endPointId: 'B' }
      )
    ).toBe(false);
    expect(classify(first, second)).toBe('touching');
    expect(classify(first, { ...second, startPointId: 'X' })).toBe('disjoint');
    expect(
      classify(first, {
        startTime: 5,
        endTime: 15,
        startPointId: 'X',
        endPointId: 'Y',
      })
    ).toBe('overlapping');
    expect(
      classify(first, {
        startTime: 20,
        endTime: 30,
        startPointId: 'X',
        endPointId: 'Y',
      })
    ).toBe('disjoint');
  });
});
/* eslint max-lines-per-function: off */
