import { expect, jest, test } from '@jest/globals';
import { resolveLegacyRunnerShift } from '../../../src/core/browser/toys/2026-08-21/segmentAssignmentFeasibilityCore.js';
import {
  legacyAssignmentBoundary,
  formatCommitFailure,
} from '../../../src/core/browser/toys/2026-08-21/safeAssignmentPersistence.js';

test('legacy boundary does not turn empty input into an empty request', () => {
  const write = jest.fn();
  const result = JSON.parse(
    legacyAssignmentBoundary('', new Map(), write, formatCommitFailure)
  );
  expect(result.committed).toBe(false);
  expect(result.reason).toMatch(/JSON/);
  expect(write).not.toHaveBeenCalled();
});

test('legacy boundary preserves missing messages on non-Error thrown values', () => {
  const write = () => {
    throw 'legacy failure';
  };
  expect(
    JSON.parse(
      legacyAssignmentBoundary('{}', new Map(), write, formatCommitFailure)
    )
  ).toEqual({ committed: false });
});

test('legacy shift matching does not silently skip malformed shift endpoints', () => {
  const request = {
    points: [
      { pointId: 'A', timestamp: '2026-01-01T00:00:00Z' },
      { pointId: 'B', timestamp: '2026-01-01T01:00:00Z' },
    ],
    candidateSegment: { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
    shifts: [{}],
  };
  expect(() => resolveLegacyRunnerShift(request)).toThrow(TypeError);
});
