import { spacetimeWorldLine } from '../../../src/core/browser/toys/2026-08-19/spacetimeWorldLine.js';
import { spacetimeSegmentTemporalRelation } from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentTemporalRelation.js';

test('world-line success retains field order and exact readable indentation', () => {
  expect(
    spacetimeWorldLine('{"segments":[],"startPointId":"A","endPointId":"A"}')
  ).toBe(
    JSON.stringify(
      { startPointId: 'A', endPointId: 'A', segments: [] },
      null,
      2
    )
  );
});

test.each([spacetimeWorldLine, spacetimeSegmentTemporalRelation])(
  'spacetime validation retains the common pretty error envelope',
  evaluate => {
    expect(evaluate('null')).toBe(
      JSON.stringify(
        { valid: false, error: 'Input must be a JSON object.' },
        null,
        2
      )
    );
  }
);
