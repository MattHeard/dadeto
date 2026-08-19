import { describe, expect, test } from '@jest/globals';
import { spacetimeSegmentTemporalRelation } from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentTemporalRelation.js';

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
  });
});
