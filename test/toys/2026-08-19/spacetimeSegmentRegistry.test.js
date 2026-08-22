import { describe, expect, test } from '@jest/globals';
import {
  normalizeSegment,
  spacetimeSegmentRegistry,
} from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentRegistry.js';

describe('spacetimeSegmentRegistry', () => {
  test('normalizes ordered references to spacetime points', () => {
    const result = JSON.parse(
      spacetimeSegmentRegistry(
        JSON.stringify({
          segments: [
            { segmentId: 'SEG002', startPointId: 'P002', endPointId: 'P003' },
            { segmentId: 'SEG001', startPointId: 'P001', endPointId: 'P002' },
          ],
        })
      )
    );
    expect(result.segments).toEqual([
      { segmentId: 'SEG001', startPointId: 'P001', endPointId: 'P002' },
      { segmentId: 'SEG002', startPointId: 'P002', endPointId: 'P003' },
    ]);
    expect(result.summary).toEqual({ segmentCount: 2 });
  });

  test('ignores incomplete segments without adding domain fields', () => {
    const result = JSON.parse(
      spacetimeSegmentRegistry(
        JSON.stringify({
          segments: [
            {
              segmentId: 'SEG001',
              startPointId: 'P001',
              endPointId: 'P002',
              distance: 4,
            },
            { segmentId: 'SEG002', startPointId: 'P002' },
          ],
        })
      )
    );
    expect(result.segments).toEqual([
      { segmentId: 'SEG001', startPointId: 'P001', endPointId: 'P002' },
    ]);
  });

  test('returns an empty registry for invalid input', () => {
    expect(JSON.parse(spacetimeSegmentRegistry('{'))).toEqual({
      segments: [],
      summary: { segmentCount: 0 },
    });
  });

  test('rejects every non-object and incomplete segment shape', () => {
    expect(normalizeSegment(null)).toBeNull();
    expect(normalizeSegment([])).toBeNull();
    expect(
      normalizeSegment([
        { segmentId: 'S', startPointId: 'P001', endPointId: 'P002' },
      ])
    ).toBeNull();
    const arrayWithSegmentFields = [];
    Object.assign(arrayWithSegmentFields, {
      segmentId: 'S',
      startPointId: 'P001',
      endPointId: 'P002',
    });
    expect(normalizeSegment(arrayWithSegmentFields)).toBeNull();
    const functionWithSegmentFields = Object.assign(() => {}, {
      segmentId: 'S',
      startPointId: 'P001',
      endPointId: 'P002',
    });
    expect(normalizeSegment(functionWithSegmentFields)).toBeNull();
    expect(normalizeSegment('segment')).toBeNull();
    expect(normalizeSegment({ startPointId: 'P001', endPointId: 'P002' })).toBeNull();
    expect(normalizeSegment({ segmentId: 'S', endPointId: 'P002' })).toBeNull();
    expect(normalizeSegment({ segmentId: 'S', startPointId: 'P001' })).toBeNull();
  });
});
