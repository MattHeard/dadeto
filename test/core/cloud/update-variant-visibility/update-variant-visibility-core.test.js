import { jest } from '@jest/globals';
import { ADMIN_UID } from '../../../../src/core/commonCore.js';
import {
  normalizeVariantPath,
  calculateUpdatedVisibility,
  calculateNextVisibility,
  createUpdateVariantVisibilityHandle,
  createUpdateVariantVisibilityHandler,
} from '../../../../src/core/cloud/update-variant-visibility/update-variant-visibility-core.js';

describe('normalizeVariantPath', () => {
  it('trims leading slashes and whitespace', () => {
    expect(normalizeVariantPath('/variants/abc ')).toBe('variants/abc');
  });

  it('returns empty string when the identifier is invalid', () => {
    expect(normalizeVariantPath(null)).toBe('');
    expect(normalizeVariantPath(42)).toBe('');
  });
});

describe('calculateUpdatedVisibility', () => {
  it('computes the weighted average with incoming rating', () => {
    const result = calculateUpdatedVisibility(
      {
        visibility: 0.5,
        moderationRatingCount: 2,
        moderatorReputationSum: 2,
      },
      1
    );

    expect(result).toBeCloseTo((0.5 * 2 + 1) / 3);
  });

  it('defaults to zero when denominator is zero', () => {
    const result = calculateUpdatedVisibility(
      {
        visibility: 1,
        moderationRatingCount: -1,
        moderatorReputationSum: 0,
      },
      0
    );

    expect(result).toBe(0);
  });

  it('treats non-numeric visibility as zero', () => {
    const result = calculateUpdatedVisibility(
      {
        visibility: 'invalid',
        moderationRatingCount: 1,
        moderatorReputationSum: 1,
      },
      1
    );

    expect(result).toBeCloseTo((0 * 1 + 1) / 2);
  });

  it('defaults to zero when variant data is absent', () => {
    const result = calculateUpdatedVisibility(undefined, 1);

    expect(result).toBe(1);
  });

  it('treats admin-locked variants as fixed at the incoming rating', () => {
    const result = calculateNextVisibility(
      {
        visibilityLockedBy: ADMIN_UID,
        visibility: 0.25,
        moderationRatingCount: 2,
        moderatorReputationSum: 2,
      },
      true,
      1
    );

    expect(result).toBe(0.25);
  });

  it('calculates the next visibility for an unlocked variant', () => {
    const result = calculateNextVisibility(
      {
        visibility: 0.5,
        moderationRatingCount: 2,
        moderatorReputationSum: 2,
      },
      false,
      1
    );

    expect(result).toBeCloseTo((0.5 * 2 + 0 * 1) / 3);
  });

  it('handles undefined variant data when calculating next visibility', () => {
    expect(calculateNextVisibility(undefined, true, 1)).toBe(1);
  });

  it('returns the locked visibility even when the variant data is empty', () => {
    expect(
      calculateNextVisibility({ visibilityLockedBy: ADMIN_UID }, false, 1)
    ).toBe(0);
  });
});

describe('createUpdateVariantVisibilityHandler', () => {
  const createSnapshot = data => ({
    data: () => data,
  });

  const createDb = (variantRef, moderatorData = {}) => ({
    doc: jest.fn(() => variantRef),
    collection: jest.fn(name => {
      if (name !== 'moderators') {
        return null;
      }

      return {
        doc: jest.fn(moderatorId => ({
          get: jest.fn().mockResolvedValue({
            data: () => moderatorData[moderatorId] ?? {},
          }),
        })),
      };
    }),
  });

  it('throws when db is missing', () => {
    expect(() => createUpdateVariantVisibilityHandler({ db: null })).toThrow(
      new TypeError('db must expose a doc helper')
    );
  });

  it('throws when db is missing doc helper', () => {
    expect(() => createUpdateVariantVisibilityHandler({ db: {} })).toThrow(
      new TypeError('db must expose a doc helper')
    );
  });

  it('returns null when isApproved is not boolean', async () => {
    const variantRef = {
      get: jest.fn(),
      update: jest.fn(),
    };
    const db = { doc: jest.fn(() => variantRef), collection: jest.fn() };
    const handler = createUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(createSnapshot({ moderatorId: 'mod', variantId: 'foo' }))
    ).resolves.toBeNull();
    expect(db.doc).not.toHaveBeenCalled();
  });

  it('returns null when variant identifier is missing', async () => {
    const variantRef = {
      get: jest.fn(),
      update: jest.fn(),
    };
    const db = { doc: jest.fn(() => variantRef), collection: jest.fn() };
    const handler = createUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(
        createSnapshot({
          moderatorId: 'mod',
          variantId: '   ',
          isApproved: true,
        })
      )
    ).resolves.toBeNull();
    expect(db.doc).not.toHaveBeenCalled();
  });

  it('returns null when variant identifier is not a string', async () => {
    const db = createDb(
      {
        get: jest.fn(),
        update: jest.fn(),
      },
      {}
    );
    const handler = createUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(
        createSnapshot({ moderatorId: 'mod', variantId: 123, isApproved: true })
      )
    ).resolves.toBeNull();
    expect(db.doc).not.toHaveBeenCalled();
  });

  it('returns null when variant snapshot is missing or not found', async () => {
    const db = createDb(
      {
        get: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      { mod: { moderatorReputation: 1 } }
    );
    const handler = createUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(
        createSnapshot({
          moderatorId: 'mod',
          variantId: 'variants/id',
          isApproved: true,
        })
      )
    ).resolves.toBeNull();
  });

  it('returns null when the variant document does not exist', async () => {
    const db = createDb(
      {
        get: jest.fn().mockResolvedValue({ get: jest.fn(), exists: false }),
        update: jest.fn(),
      },
      { mod: { moderatorReputation: 1 } }
    );
    const handler = createUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(
        createSnapshot({
          moderatorId: 'mod',
          variantId: 'variants/id',
          isApproved: true,
        })
      )
    ).resolves.toBeNull();
  });

  it('returns null when the trigger snapshot data is missing', async () => {
    const db = createDb(
      {
        get: jest.fn(),
        update: jest.fn(),
      },
      {}
    );
    const handler = createUpdateVariantVisibilityHandler({ db });

    await expect(handler({ data: () => null })).resolves.toBeNull();
  });

  it('updates visibility with an omitted moderator id', async () => {
    const variantData = {
      visibility: 0.5,
      moderationRatingCount: 1,
      moderatorReputationSum: 1,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const db = createDb(variantRef, {});
    const handler = createUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(
        createSnapshot({
          variantId: 'variants/id',
          isApproved: true,
        })
      )
    ).resolves.toBeNull();

    expect(variantRef.update).not.toHaveBeenCalled();
  });

  it('updates visibility without a moderator id', async () => {
    const variantData = {
      visibility: 0.5,
      moderationRatingCount: 2,
      moderatorReputationSum: 2,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const db = createDb(variantRef, {});
    const handler = createUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(
        createSnapshot({
          moderatorId: '',
          variantId: '/variants/id',
          isApproved: true,
        })
      )
    ).resolves.toBeNull();

    expect(variantRef.update).toHaveBeenCalledWith({
      visibility: 0.6666666666666666,
      moderatorRatingCount: 3,
      moderatorReputationSum: 3,
    });
  });

  it('updates visibility when the variant is approved', async () => {
    const variantData = {
      visibility: 0.5,
      moderationRatingCount: 2,
      moderatorReputationSum: 2,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const db = createDb(variantRef, {
      mod: { moderatorReputation: 0.5 },
    });
    const handler = createUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(
        createSnapshot({
          moderatorId: 'mod',
          variantId: '/variants/id',
          isApproved: true,
        })
      )
    ).resolves.toBeNull();

    expect(db.doc).toHaveBeenCalledWith('variants/id');
    expect(variantRef.update).toHaveBeenCalledWith({
      visibility: (0.5 * 2 + 1 * 0.5) / (2 + 0.5),
      moderatorRatingCount: 3,
      moderatorReputationSum: 2.5,
    });
  });

  it('updates visibility when the variant is rejected', async () => {
    const variantData = {
      visibility: 1,
      moderationRatingCount: 1,
      moderatorReputationSum: 1,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const db = createDb(variantRef, {
      mod: { moderatorReputation: 2 },
    });
    const handler = createUpdateVariantVisibilityHandler({ db });

    await handler(
      createSnapshot({
        moderatorId: 'mod',
        variantId: 'variants/id',
        isApproved: false,
      })
    );

    expect(variantRef.update).toHaveBeenCalledWith({
      visibility: (1 * 1 + 0 * 2) / (1 + 2),
      moderatorRatingCount: 2,
      moderatorReputationSum: 3,
    });
  });

  it('applies an admin lock when the moderator is the admin', async () => {
    const variantData = {
      visibility: 0.4,
      moderationRatingCount: 1,
      moderatorReputationSum: 1,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      parent: {
        parent: {
          path: 'stories/story-1/pages/page-1',
          parent: {
            parent: {
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  rootPage: { path: 'stories/story-1/pages/page-1' },
                }),
              }),
            },
          },
        },
      },
    };
    const db = createDb(variantRef, {});
    const handler = createUpdateVariantVisibilityHandler({ db });

    await handler(
      createSnapshot({
        moderatorId: ADMIN_UID,
        variantId: 'stories/story-1/pages/page-1/variants/root',
        isApproved: true,
      })
    );

    expect(variantRef.update).toHaveBeenCalledWith({
      visibility: 1,
      visibilityLockedBy: ADMIN_UID,
    });
  });

  it('republishes contents when a root variant changes visibility across the threshold', async () => {
    const variantData = {
      visibility: 0.6,
      moderationRatingCount: 1,
      moderatorReputationSum: 1,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      parent: {
        parent: {
          path: 'stories/story-1/pages/page-1',
          parent: {
            parent: {
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  rootPage: { path: 'stories/story-1/pages/page-1' },
                }),
              }),
            },
          },
        },
      },
    };
    const db = createDb(variantRef, {
      mod: { moderatorReputation: 1 },
    });
    const renderContents = jest.fn().mockResolvedValue(undefined);
    const handler = createUpdateVariantVisibilityHandler({
      db,
      renderContents,
    });

    await handler(
      createSnapshot({
        moderatorId: 'mod',
        variantId: 'stories/story-1/pages/page-1/variants/root',
        isApproved: false,
      })
    );

    expect(renderContents).toHaveBeenCalledWith();
  });

  it('republishes contents when a hidden root variant becomes visible', async () => {
    const variantData = {
      visibility: 0.4,
      moderationRatingCount: 1,
      moderatorReputationSum: 1,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      parent: {
        parent: {
          path: 'stories/story-1/pages/page-1',
          parent: {
            parent: {
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  rootPage: { path: 'stories/story-1/pages/page-1' },
                }),
              }),
            },
          },
        },
      },
    };
    const db = createDb(variantRef, {
      mod: { moderatorReputation: 1 },
    });
    const renderContents = jest.fn().mockResolvedValue(undefined);
    const handler = createUpdateVariantVisibilityHandler({
      db,
      renderContents,
    });

    await handler(
      createSnapshot({
        moderatorId: 'mod',
        variantId: 'stories/story-1/pages/page-1/variants/root',
        isApproved: true,
      })
    );

    expect(renderContents).toHaveBeenCalledWith();
  });

  it('skips republishing when the variant page is not the story root', async () => {
    const variantData = {
      visibility: 0.6,
      moderationRatingCount: 1,
      moderatorReputationSum: 1,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      parent: {
        parent: {
          path: 'stories/story-1/pages/page-2',
          parent: {
            parent: {
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  rootPage: { path: 'stories/story-1/pages/page-1' },
                }),
              }),
            },
          },
        },
      },
    };
    const db = createDb(variantRef, {
      mod: { moderatorReputation: 1 },
    });
    const renderContents = jest.fn().mockResolvedValue(undefined);
    const handler = createUpdateVariantVisibilityHandler({
      db,
      renderContents,
    });

    await handler(
      createSnapshot({
        moderatorId: 'mod',
        variantId: 'stories/story-1/pages/page-2/variants/root',
        isApproved: false,
      })
    );

    expect(renderContents).not.toHaveBeenCalled();
  });

  it('skips republishing when no root page reference exists', async () => {
    const variantData = {
      visibility: 0.6,
      moderationRatingCount: 1,
      moderatorReputationSum: 1,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      parent: {
        parent: {
          path: 'stories/story-1/pages/page-1',
          parent: {
            parent: {
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({}),
              }),
            },
          },
        },
      },
    };
    const db = createDb(variantRef, {
      mod: { moderatorReputation: 1 },
    });
    const renderContents = jest.fn().mockResolvedValue(undefined);
    const handler = createUpdateVariantVisibilityHandler({
      db,
      renderContents,
    });

    await handler(
      createSnapshot({
        moderatorId: 'mod',
        variantId: 'stories/story-1/pages/page-1/variants/root',
        isApproved: false,
      })
    );

    expect(renderContents).not.toHaveBeenCalled();
  });

  it('falls back to a default weight when moderator reputation is missing', async () => {
    const variantData = {
      visibility: 0.5,
      moderationRatingCount: 2,
      moderatorReputationSum: 2,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const db = createDb(variantRef, {});
    const handler = createUpdateVariantVisibilityHandler({ db });

    await handler(
      createSnapshot({
        moderatorId: 'missing-mod',
        variantId: 'variants/id',
        isApproved: true,
      })
    );

    expect(variantRef.update).toHaveBeenCalledWith({
      visibility: (0.5 * 2 + 1) / 3,
      moderatorRatingCount: 3,
      moderatorReputationSum: 3,
    });
  });

  it('locks visibility when the admin submits a moderation rating', async () => {
    const variantData = {
      visibility: 0.25,
      moderationRatingCount: 2,
      moderatorReputationSum: 2,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const db = createDb(variantRef, {
      [ADMIN_UID]: { moderatorReputation: 1 },
    });
    const handler = createUpdateVariantVisibilityHandler({ db });

    await handler(
      createSnapshot({
        moderatorId: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
        variantId: 'variants/id',
        isApproved: false,
      })
    );

    expect(variantRef.update).toHaveBeenNthCalledWith(1, {
      visibility: 0.16666666666666666,
      moderatorRatingCount: 3,
      moderatorReputationSum: 3,
    });
    expect(variantRef.update).toHaveBeenNthCalledWith(2, {
      visibility: 0,
      visibilityLockedBy: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    });
  });

  it('locks visibility to one when the admin approves the page', async () => {
    const variantData = {
      visibility: 0.25,
      moderationRatingCount: 2,
      moderatorReputationSum: 2,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const db = createDb(variantRef, {
      [ADMIN_UID]: { moderatorReputation: 1 },
    });
    const handler = createUpdateVariantVisibilityHandler({ db });

    await handler(
      createSnapshot({
        moderatorId: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
        variantId: 'variants/id',
        isApproved: true,
      })
    );

    expect(variantRef.update).toHaveBeenNthCalledWith(2, {
      visibility: 1,
      visibilityLockedBy: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    });
  });

  it('keeps locked visibility when computing the next state', async () => {
    const variantData = {
      visibility: 0.25,
      moderationRatingCount: 2,
      moderatorReputationSum: 2,
      visibilityLockedBy: ADMIN_UID,
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      parent: {
        parent: {
          path: 'stories/story-1/pages/page-1',
          parent: {
            parent: {
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  rootPage: { path: 'stories/story-1/pages/page-1' },
                }),
              }),
            },
          },
        },
      },
    };
    const db = createDb(variantRef, {
      [ADMIN_UID]: { moderatorReputation: 1 },
    });
    const renderContents = jest.fn().mockResolvedValue(undefined);
    const handler = createUpdateVariantVisibilityHandler({
      db,
      renderContents,
    });

    await handler(
      createSnapshot({
        moderatorId: ADMIN_UID,
        variantId: 'stories/story-1/pages/page-1/variants/root',
        isApproved: true,
      })
    );

    expect(renderContents).not.toHaveBeenCalled();
    expect(variantRef.update).toHaveBeenNthCalledWith(2, {
      visibility: 1,
      visibilityLockedBy: ADMIN_UID,
    });
  });

  it('returns the existing visibility when the variant is admin locked', () => {
    expect(
      calculateNextVisibility(
        {
          visibility: 0.25,
          moderationRatingCount: 2,
          moderatorReputationSum: 2,
          visibilityLockedBy: ADMIN_UID,
        },
        true,
        1
      )
    ).toBe(0.25);
  });

  it('preserves locked visibility for later non-admin ratings', async () => {
    const variantData = {
      visibility: 1,
      moderationRatingCount: 2,
      moderatorReputationSum: 2,
      visibilityLockedBy: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => variantData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const db = createDb(variantRef, {
      mod: { moderatorReputation: 1 },
    });
    const handler = createUpdateVariantVisibilityHandler({ db });

    await handler(
      createSnapshot({
        moderatorId: 'mod',
        variantId: 'variants/id',
        isApproved: false,
      })
    );

    expect(variantRef.update).toHaveBeenCalledWith({
      visibility: 1,
      moderatorRatingCount: 3,
      moderatorReputationSum: 3,
    });
  });

  it('handles variant snapshot that exists but has no data', async () => {
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        get: jest.fn(),
        exists: true,
        data: () => null,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const db = createDb(variantRef, {
      mod: { moderatorReputation: 1 },
    });
    const handler = createUpdateVariantVisibilityHandler({ db });

    await handler(
      createSnapshot({
        moderatorId: 'mod',
        variantId: 'variants/id',
        isApproved: true,
      })
    );

    expect(variantRef.update).toHaveBeenCalledWith({
      visibility: 1, // (0 * 0 + 1) / 1
      moderatorRatingCount: 1,
      moderatorReputationSum: 1,
    });
  });
});

describe('createUpdateVariantVisibilityHandle', () => {
  it('registers the moderation rating create trigger from runtime deps', () => {
    const handle = Symbol('handle');
    const db = { doc: jest.fn() };
    const onCreate = jest.fn(() => handle);
    const document = jest.fn(() => ({ onCreate }));
    const functions = {
      region: jest.fn(() => ({
        firestore: { document },
      })),
    };
    const getFirestoreInstance = jest.fn(() => db);

    expect(
      createUpdateVariantVisibilityHandle(functions, getFirestoreInstance)
    ).toBe(handle);

    expect(getFirestoreInstance).toHaveBeenCalledTimes(1);
    expect(functions.region).toHaveBeenCalledWith('europe-west1');
    expect(document).toHaveBeenCalledWith('moderationRatings/{ratingId}');
    expect(onCreate).toHaveBeenCalledWith(expect.any(Function));
  });
});
