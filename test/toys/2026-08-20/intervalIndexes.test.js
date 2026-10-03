import { createIntervalIndexes } from '../../../src/core/browser/toys/2026-08-20/assignmentIntervals.js';

test('interval indexes preserve original keys and records while later duplicate IDs win', () => {
  const point = { pointId: 7, timestamp: 'old' };
  const replacement = { pointId: 7, timestamp: 'new' };
  const distinct = { pointId: '7', timestamp: 'string' };
  const segment = { segmentId: 'AB', startPointId: 'A', endPointId: 'B' };
  const latest = { ...segment, endPointId: 'C' };
  const indexes = createIntervalIndexes({
    points: [point, replacement, distinct],
    segments: [segment, latest],
  });

  expect([...indexes.points.keys()]).toEqual([7, '7']);
  expect(indexes.points.get(7)).toBe(replacement);
  expect(indexes.points.get('7')).toBe(distinct);
  expect([...indexes.segments.keys()]).toEqual(['AB']);
  expect(indexes.segments.get('AB')).toBe(latest);
  expect(point.timestamp).toBe('old');
});

test('point indexing fails before reading segment input', () => {
  const events = [];
  const failure = new Error('point ID unavailable');
  const request = {
    points: [
      {
        get pointId() {
          events.push('point');
          throw failure;
        },
      },
    ],
    get segments() {
      events.push('segments');
      return [];
    },
  };

  expect(() => createIntervalIndexes(request)).toThrow(failure);
  expect(events).toEqual(['point']);
});
