import { appendReferenceList } from '../../src/core/browser/toys/2026-08-18/memoryObjectListAppend.js';
import { legacyFeasibilityBoundary } from '../../src/core/browser/toys/2026-08-21/segmentAssignmentFeasibilityCore.js';

describe.each([
  [
    'append',
    fail => appendReferenceList('request', new Map(), fail),
    { appended: false },
    'error',
  ],
  [
    'feasibility',
    fail => legacyFeasibilityBoundary('{}', fail),
    { feasible: false },
    'reason',
  ],
])('%s message-only rejection contract', (name, evaluate, flags, field) => {
  test('reads the original message once without coercing or changing compact field order', () => {
    let reads = 0;
    const failure = {
      get message() {
        reads++;
        return 42;
      },
    };
    const result = evaluate(() => {
      throw failure;
    });
    expect(result).toBe(JSON.stringify({ ...flags, [field]: 42 }));
    expect(reads).toBe(1);
  });

  test.each(['plain string', 17, { other: 'no message' }])(
    'omits missing messages for %p without converting the thrown value',
    failure => {
      expect(
        evaluate(() => {
          throw failure;
        })
      ).toBe(JSON.stringify(flags));
    }
  );

  test.each([null, undefined])(
    'retains the legacy escaping TypeError for %p',
    failure => {
      expect(() =>
        evaluate(() => {
          throw failure;
        })
      ).toThrow(TypeError);
    }
  );

  test('does not catch a failure thrown while reading the rejection message', () => {
    const failure = new Error('message read failed');
    const thrown = {
      get message() {
        throw failure;
      },
    };
    expect(() =>
      evaluate(() => {
        throw thrown;
      })
    ).toThrow(failure);
  });
});
