import { jest } from '@jest/globals';
import {
  assignModerationJobTestUtils,
  createAssignModerationWorkflow,
  createRunVariantQuery,
} from '../../../src/core/cloud/assign-moderation-job/assign-moderation-job-core.js';

describe('assignModerationJobTestUtils', () => {
  test('hasTokenMessage recognizes string property', () => {
    const result = assignModerationJobTestUtils.hasTokenMessage({
      message: 'Oops',
    });
    expect(result).toBe(true);
  });

  test('hasTokenMessage returns false for non-object', () => {
    expect(assignModerationJobTestUtils.hasTokenMessage('oops')).toBe(false);
  });

  test('createEnsureValidIdToken returns guard error when missing id token', async () => {
    const guard = assignModerationJobTestUtils.createEnsureValidIdToken({
      verifyIdToken: jest.fn(),
    });
    const outcome = await guard({});
    expect(outcome.error?.status).toBe(401);
  });

  test('createEnsureUserRecord errors when decoded token missing', async () => {
    const guard = assignModerationJobTestUtils.createEnsureUserRecord({
      getUser: jest.fn(),
    });
    const outcome = await guard({});
    expect(outcome.error?.status).toBe(401);
  });

  test('buildCorsOptions enforces POST method', () => {
    const handler = () => null;
    const options = assignModerationJobTestUtils.buildCorsOptions(handler, {
      allowedOrigins: ['https://example.com'],
    });
    expect(options.methods).toEqual(['POST']);
  });

  test('buildCorsOptions defaults allowed origins when missing', () => {
    const handler = () => null;
    const options = assignModerationJobTestUtils.buildCorsOptions(handler, {});
    expect(Array.isArray(options.origin)).toBe(false);
    expect(options.origin).toBeDefined();
  });

  test('ensureSnapshot provides empty marker when missing', () => {
    expect(assignModerationJobTestUtils.ensureSnapshot(undefined)).toEqual({
      empty: true,
    });
  });

  test('resolveContextFromResult prefers guard context when present', () => {
    const context = { foo: 'bar' };
    expect(
      assignModerationJobTestUtils.resolveContextFromResult(context, {
        foo: 'baz',
      })
    ).toBe(context);
  });

  test('resolveContextFromResult falls back when guard context missing', () => {
    const fallback = { foo: 'baz' };
    expect(
      assignModerationJobTestUtils.resolveContextFromResult(undefined, fallback)
    ).toBe(fallback);
  });

  test('ensureVariantDocAvailability throws when variant missing', () => {
    expect(() =>
      assignModerationJobTestUtils.ensureVariantDocAvailability(
        undefined,
        undefined
      )
    ).toThrow();
  });

  test('isResponse rejects objects without status', () => {
    expect(assignModerationJobTestUtils.isResponse({})).toBe(false);
  });

  test('isResponse rejects non-objects', () => {
    expect(assignModerationJobTestUtils.isResponse(null)).toBe(false);
  });

  test('createRunVariantQuery filters already moderated pages and sorts by urgency', async () => {
    const candidates = [
      fireStoreDoc('variants/c', 0.3),
      fireStoreDoc('variants/a', 0.9),
      fireStoreDoc('variants/e', 0.5),
      fireStoreDoc('variants/b', 0.7),
      fireStoreDoc('variants/d', 0.8),
      fireStoreDoc('variants/f', 0.1),
    ];
    const db = {
      collectionGroup: jest.fn(name => {
        expect(name).toBe('variants');
        return {
          async get() {
            return {
              docs: candidates,
            };
          },
        };
      }),
      collection: jest.fn(name => {
        expect(name).toBe('moderationRatings');
        return {
          where(field, op, value) {
            expect(field).toBe('moderatorId');
            expect(op).toBe('==');
            expect(value).toBe('mod-1');
            return {
              async get() {
                return {
                  docs: [
                    {
                      data: () => ({ variantId: 'variants/b' }),
                    },
                  ],
                };
              },
            };
          },
        };
      }),
    };

    const fetchVariantSnapshots = createRunVariantQuery(db);
    const result = await fetchVariantSnapshots('mod-1');

    expect(result.map(entry => entry.variantDoc.ref.path)).toEqual([
      'variants/c',
      'variants/a',
      'variants/e',
      'variants/d',
      'variants/f',
    ]);
  });

  test('createAssignModerationWorkflow samples from the top five urgent candidates', async () => {
    const runGuards = jest.fn().mockResolvedValue({
      context: { userRecord: { uid: 'mod-1' } },
    });
    const fetchVariantSnapshots = jest
      .fn()
      .mockResolvedValue([
        candidate('variants/1', 0.1),
        candidate('variants/2', 0.2),
        candidate('variants/3', 0.3),
        candidate('variants/4', 0.4),
        candidate('variants/5', 0.5),
        candidate('variants/6', 0.6),
      ]);
    const selectVariantDoc = jest.fn(snapshot => ({
      variantDoc: snapshot.variantDoc,
    }));
    const createModeratorRef = jest.fn(() => ({
      set: jest.fn().mockResolvedValue(undefined),
    }));
    const workflow = createAssignModerationWorkflow({
      runGuards,
      fetchVariantSnapshots,
      selectVariantDoc,
      createModeratorRef,
      now: jest.fn(() => 'ts'),
      random: jest.fn(() => 0),
    });

    await expect(workflow({ req: {} })).resolves.toEqual({
      status: 201,
      body: '',
    });

    expect(selectVariantDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        variantDoc: expect.objectContaining({
          ref: expect.objectContaining({ path: 'variants/6' }),
        }),
      })
    );
    expect(createModeratorRef).toHaveBeenCalledWith('mod-1');
  });
});

/**
 * Build a fake candidate snapshot for moderation assignment tests.
 * @param {string} path Variant document path.
 * @param {number} moderationUrgency Moderation urgency score.
 * @returns {{ variantDoc: { ref: { path: string }, data: () => { moderationUrgency: number, pagePath: string } } }} Candidate snapshot.
 */
function candidate(path, moderationUrgency) {
  return {
    variantDoc: {
      ref: { path },
      data: () => ({
        moderationUrgency,
        pagePath: path,
      }),
    },
  };
}

/**
 * Build a fake Firestore document for branch coverage.
 * @param {string} path Document path.
 * @param {number} moderationUrgency Moderation urgency score.
 * @returns {{ ref: { path: string }, data: () => { moderationUrgency: number, pagePath: string } }} Fake document.
 */
function fireStoreDoc(path, moderationUrgency) {
  return {
    ref: { path },
    data: () => ({
      moderationUrgency,
      pagePath: path,
    }),
  };
}
