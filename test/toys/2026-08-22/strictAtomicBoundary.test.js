import { jest } from '@jest/globals';
import {
  strictAssignmentBoundary,
  formatAssignmentFailure,
} from '../../../src/core/browser/toys/2026-08-22/strictAssignmentCore.js';
import { formatCommitFailure } from '../../../src/core/browser/toys/2026-08-21/safeAssignmentPersistence.js';
import {
  evaluateWorldLine,
  evaluateWorldLineMany,
} from '../../../src/core/browser/toys/2026-08-21/segmentAssignmentFeasibilityCore.js';

test('public rejection formatters preserve compact field order and uncoerced reasons', () => {
  for (const reason of [
    'failure',
    null,
    undefined,
    0,
    { nested: ['reason'] },
  ]) {
    expect(formatCommitFailure(reason)).toBe(
      JSON.stringify({ committed: false, reason })
    );
    expect(formatAssignmentFailure(reason)).toBe(
      JSON.stringify({ appended: false, feasible: false, reason })
    );
  }
  expect(() => formatCommitFailure(1n)).toThrow(TypeError);
  expect(() => formatAssignmentFailure(1n)).toThrow(TypeError);
});

test.each([new Error('failure'), 'failure', null])(
  'atomic failure serializer receives the normalized reason for %p',
  failure => {
    const calculate = () => {
      throw failure;
    };
    expect(
      strictAssignmentBoundary('{}', new Map(), calculate, formatCommitFailure)
    ).toBe(
      JSON.stringify({
        committed: false,
        reason: failure instanceof Error ? failure.message : String(failure),
      })
    );
  }
);

test('atomic parsing failures reject before invoking calculation or persistence', () => {
  const calculate = jest.fn();
  const env = new Map([
    [
      'setLocalTemporaryData',
      () => {
        throw new Error('unexpected write');
      },
    ],
  ]);
  const result = JSON.parse(
    strictAssignmentBoundary('{broken', env, calculate, formatCommitFailure)
  );
  expect(result.committed).toBe(false);
  expect(result.reason).toEqual(expect.any(String));
  expect(calculate).not.toHaveBeenCalled();
  expect(
    strictAssignmentBoundary(
      '',
      env,
      () => '{"committed":true}',
      formatCommitFailure
    )
  ).toBe('{"committed":true}');
});

test.each(
  [[], [undefined], [null], [undefined, []], [null, null]].map(bounds => ({
    bounds,
  }))
)(
  'single-candidate adapter preserves optional bounds $bounds',
  ({ bounds }) => {
    const candidate = { segmentId: 'S', startPointId: 'A', endPointId: 'B' };
    const entry = { pointId: 'E' };
    expect(evaluateWorldLine([], [], candidate, entry, ...bounds)).toEqual(
      evaluateWorldLineMany([], [], [candidate], entry, ...bounds)
    );
  }
);
