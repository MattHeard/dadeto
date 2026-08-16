import { describe, expect, it } from '@jest/globals';
import {
  normalizeCatalogSnapshot,
  quoteSeededPackage,
  seedBillingCatalog,
} from '../../../../src/core/cloud/billing/catalog-seed-core.js';

const snapshot = {
  snapshotId: 'initial',
  effectiveAt: '2026-08-09T00:00:00.000Z',
  eurPerUsdMicros: 920_000,
  creditEurMicros: 1,
  markupBps: 0,
  operations: {},
};

describe('billing catalog seed core', () => {
  it('requires matching snapshot document ids and normalizes operation maps', () => {
    expect(normalizeCatalogSnapshot('initial', snapshot).operations).toEqual(
      {}
    );
    expect(() => normalizeCatalogSnapshot('wrong', snapshot)).toThrow(
      'document ID'
    );
    expect(
      normalizeCatalogSnapshot('initial', { ...snapshot, operations: [] })
        .operations
    ).toEqual({});
    expect(
      normalizeCatalogSnapshot('initial', {
        ...snapshot,
        operations: { invoke: { costEurMicros: 1 } },
      }).operations
    ).toEqual({ invoke: { id: 'invoke', costEurMicros: 1 } });
    expect(
      normalizeCatalogSnapshot('initial', { ...snapshot, operations: null })
        .operations
    ).toEqual({});
  });

  it('creates, updates packages, and makes identical snapshot reseeds no-ops', async () => {
    const packages = new Map();
    const snapshots = new Map();
    const store = {
      getPackage: async id => packages.get(id) ?? null,
      setPackage: async (id, value) => packages.set(id, value),
      getSnapshot: async id => snapshots.get(id) ?? null,
      createSnapshot: async (id, value) => snapshots.set(id, value),
    };
    await expect(
      seedBillingCatalog(store, {
        packages: { 'usd-10': { active: true, amountUsdMinor: 1000 } },
        snapshots: { initial: snapshot },
      })
    ).resolves.toEqual({
      packagesCreated: 1,
      packagesUpdated: 0,
      snapshotsCreated: 1,
      snapshotsUnchanged: 0,
    });
    await expect(
      seedBillingCatalog(store, {
        packages: { 'usd-10': { active: false, amountUsdMinor: 1000 } },
        snapshots: { initial: snapshot },
      })
    ).resolves.toMatchObject({ packagesUpdated: 1, snapshotsUnchanged: 1 });
    await expect(
      seedBillingCatalog(store, {
        packages: { 'usd-10': { active: false, amountUsdMinor: 1000 } },
        snapshots: {},
      })
    ).resolves.toMatchObject({ packagesUpdated: 0 });
    await expect(
      seedBillingCatalog(store, {
        packages: {},
        snapshots: { initial: { ...snapshot, markupBps: 1 } },
      })
    ).rejects.toThrow('different data');
  });

  it('quotes the seeded package with positive credits', () => {
    expect(
      quoteSeededPackage('usd-10', { amountUsdMinor: 1000 }, snapshot)
    ).toEqual({
      packageId: 'usd-10',
      amountUsdMinor: 1000,
      credits: 9_200_000,
      snapshotId: 'initial',
    });
  });

  it('rejects malformed package definitions', async () => {
    const store = {
      getPackage: async () => null,
      setPackage: async () => {},
      getSnapshot: async () => null,
      createSnapshot: async () => {},
    };
    await expect(
      seedBillingCatalog(store, {
        packages: { bad: { active: 'yes', amountUsdMinor: 1 } },
        snapshots: {},
      })
    ).rejects.toThrow('active must be boolean');
    await expect(
      seedBillingCatalog(store, {
        packages: { bad: { active: true, amountUsdMinor: 0 } },
        snapshots: {},
      })
    ).rejects.toThrow('amountUsdMinor must be positive');
    await expect(
      seedBillingCatalog(store, {
        packages: { bad: { active: true, amountUsdMinor: 1.5 } },
        snapshots: {},
      })
    ).rejects.toThrow('amountUsdMinor must be positive');
  });
});
