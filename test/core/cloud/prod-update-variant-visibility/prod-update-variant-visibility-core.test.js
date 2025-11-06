import { jest } from '@jest/globals';
import {
  normalizeVariantPath,
  calculateUpdatedVisibility,
  createProdUpdateVariantVisibilityHandler,
} from '../../../../src/core/cloud/prod-update-variant-visibility/prod-update-variant-visibility-core.js';

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
});

describe('createProdUpdateVariantVisibilityHandler', () => {
  const createSnapshot = data => ({
    data: () => data,
  });

  it('throws when db is missing doc helper', () => {
    expect(() => createProdUpdateVariantVisibilityHandler({ db: {} })).toThrow(
      new TypeError('db must expose a doc helper')
    );
  });

  it('returns null when isApproved is not boolean', async () => {
    const variantRef = {
      get: jest.fn(),
      update: jest.fn(),
    };
    const db = { doc: jest.fn(() => variantRef) };
    const handler = createProdUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(createSnapshot({ variantId: 'foo' }))
    ).resolves.toBeNull();
    expect(db.doc).not.toHaveBeenCalled();
  });

  it('returns null when variant identifier is missing', async () => {
    const variantRef = {
      get: jest.fn(),
      update: jest.fn(),
    };
    const db = { doc: jest.fn(() => variantRef) };
    const handler = createProdUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(createSnapshot({ variantId: '   ', isApproved: true }))
    ).resolves.toBeNull();
    expect(db.doc).not.toHaveBeenCalled();
  });

  it('returns null when variant snapshot is missing or not found', async () => {
    const db = {
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      })),
    };
    const handler = createProdUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(createSnapshot({ variantId: 'variants/id', isApproved: true }))
    ).resolves.toBeNull();
  });

  it('returns null when the variant document does not exist', async () => {
    const db = {
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ get: jest.fn(), exists: false }),
        update: jest.fn(),
      })),
    };
    const handler = createProdUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(createSnapshot({ variantId: 'variants/id', isApproved: true }))
    ).resolves.toBeNull();
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
    const db = { doc: jest.fn(() => variantRef) };
    const handler = createProdUpdateVariantVisibilityHandler({ db });

    await expect(
      handler(createSnapshot({ variantId: '/variants/id', isApproved: true }))
    ).resolves.toBeNull();

    expect(db.doc).toHaveBeenCalledWith('variants/id');
    expect(variantRef.update).toHaveBeenCalledWith({
      visibility: (0.5 * 2 + 1) / 3,
      moderatorRatingCount: 3,
      moderatorReputationSum: 3,
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
    const db = { doc: jest.fn(() => variantRef) };
    const handler = createProdUpdateVariantVisibilityHandler({ db });

    await handler(
      createSnapshot({ variantId: 'variants/id', isApproved: false })
    );

    expect(variantRef.update).toHaveBeenCalledWith({
      visibility: (1 * 1 + 0) / 2,
      moderatorRatingCount: 2,
      moderatorReputationSum: 2,
    });
  });
});
