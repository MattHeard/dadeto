import { describe, expect, test } from '@jest/globals';
import { spacetimeWorldLine } from '../../../src/core/browser/toys/2026-08-19/spacetimeWorldLine.js';

describe('spacetimeWorldLine', () => {
  test('orders every segment into a contiguous world line', () => {
    const result = JSON.parse(
      spacetimeWorldLine(
        JSON.stringify({
          startPointId: 'A',
          endPointId: 'D',
          segments: [
            { segmentId: 'BC', startPointId: 'B', endPointId: 'C' },
            { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
            { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
          ],
        })
      )
    );
    expect(result.segments.map(segment => segment.segmentId)).toEqual([
      'AB',
      'BC',
      'CD',
    ]);
  });

  test('rejects disconnected or branching segments', () => {
    expect(
      JSON.parse(
        spacetimeWorldLine(
          JSON.stringify({
            startPointId: 'A',
            endPointId: 'D',
            segments: [
              { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
              { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
            ],
          })
        )
      )
    ).toMatchObject({ valid: false });
    expect(
      JSON.parse(
        spacetimeWorldLine(
          JSON.stringify({
            startPointId: 'A',
            endPointId: 'D',
            segments: [
              { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
              { segmentId: 'AC', startPointId: 'A', endPointId: 'C' },
            ],
          })
        )
      )
    ).toMatchObject({ valid: false });
  });

  test('rejects unused segments', () => {
    expect(
      JSON.parse(
        spacetimeWorldLine(
          JSON.stringify({
            startPointId: 'A',
            endPointId: 'B',
            segments: [
              { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
              { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
            ],
          })
        )
      )
    ).toMatchObject({ valid: false });
  });
});
