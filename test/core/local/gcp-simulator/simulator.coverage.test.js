import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createLocalGcpSimulator } from '../../../../src/local/gcp-simulator/simulator.js';
import { createLocalGcpSimulator as createCoreSimulator } from '../../../../src/core/local/gcp-simulator/simulator.js';

let simulator;

afterEach(async () => {
  if (simulator) {
    await simulator.clear();
    simulator = undefined;
  }
});

describe('gcp simulator coverage paths', () => {
  it('requires an external effects boundary when called without options', async () => {
    await expect(createCoreSimulator()).rejects.toThrow(
      'bindEffectBoundary must be provided'
    );
  });

  it('requires injected transaction and document effect adapters', async () => {
    const bindEffectBoundary = () => Object.freeze({});
    await expect(createCoreSimulator({ bindEffectBoundary })).rejects.toThrow(
      'createCreditEventEffectAdapters must be provided'
    );
    await expect(
      createCoreSimulator({
        bindEffectBoundary,
        createCreditEventEffectAdapters: () => ({}),
      })
    ).rejects.toThrow('setFirestoreDocument must be provided');
  });

  it('covers simulator helpers for missing dependencies and unmatched trigger parameters', async () => {
    simulator = await createLocalGcpSimulator({ baseUrl: 'http://simulator' });
    const utils = simulator.testUtils;
    expect(() => utils.requireSimulatorDb({ db: null })).toThrow(
      'not initialized'
    );
    expect(utils.readVerifiedUid({})).toBeNull();
    await expect(
      utils.resolveAuthorUuidInSimulator({
        headers: { authorization: 'Bearer invalid-uid-token' },
      })
    ).resolves.toMatchObject({ status: 401 });
    const dispatch = utils.createDispatchCommittedWrites({
      triggerRegistry: [
        {
          pathPattern: 'stories/{id}',
          eventName: 'onWrite',
          handler: jest.fn(),
        },
      ],
      createSnapshots: () => ({ before: null, after: {} }),
      shouldDispatchTrigger: () => true,
      extractParams: () => null,
      dispatchTrigger: jest.fn(),
    });
    await dispatch([{ path: 'stories/example', after: {} }]);
    expect(utils).toBeDefined();
    expect(utils.createSnapshot('stories/missing', undefined)).toMatchObject({
      exists: false,
    });
  });

  it('exposes the seed manifest and runs the rendering routes', async () => {
    simulator = await createLocalGcpSimulator({ baseUrl: 'http://simulator' });

    expect(simulator.getSeedManifest()).toMatchObject({
      storyTitle: 'E2E moderation fixture story',
      staticBucket: simulator.bucketName,
    });
    await expect(simulator.routes.triggerRenderContents()).resolves.toEqual({
      status: 200,
      body: { ok: true },
    });
    await expect(simulator.routes.generateStats()).resolves.toEqual({
      status: 200,
      body: { ok: true },
    });
    await expect(
      simulator.routes.objectMinuteRentalSearch({ body: {} })
    ).resolves.toEqual({
      status: 400,
      body: {
        valid: false,
        reason:
          'A possession context with start and end timestamps is required.',
      },
    });
    await expect(
      simulator.routes.objectMinuteRentalSearch({
        body: {
          requestText: 'football',
          possessionContext: {
            startPoint: {
              timestamp: '2026-01-01T15:00:00Z',
              latitude: 52.510833,
              longitude: 13.296667,
            },
            endPoint: {
              timestamp: '2026-01-01T15:30:00Z',
              latitude: 52.510833,
              longitude: 13.296667,
            },
          },
        },
      })
    ).resolves.toMatchObject({ status: 200 });
  });

  it('creates the delete sentinel used by the variant-write trigger', async () => {
    simulator = await createLocalGcpSimulator({ baseUrl: 'http://simulator' });
    expect(typeof simulator.testUtils.createDeleteSentinel()).toBe('symbol');
    await expect(
      simulator.routes.getAuthorUuid({
        headers: { authorization: 'Bearer token' },
      })
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      simulator.routes.submitModerationRating({
        headers: { authorization: 'Bearer token' },
        body: 'malformed-body',
      })
    ).resolves.toMatchObject({ status: 400 });
    await expect(
      simulator.routes.assignModerationJob({
        headers: { authorization: 'Bearer token' },
      })
    ).resolves.toMatchObject({ status: 201 });
    await expect(
      simulator.testUtils.assignModerationJob({
        headers: { authorization: 'Bearer token' },
      })
    ).resolves.toMatchObject({ status: 404 });
    const moderatorSnap = { get: async () => ({ data: () => ({}) }) };
    const missingPathDb = {
      collection: name =>
        name === 'moderators'
          ? { doc: () => moderatorSnap }
          : { get: async () => ({ docs: [] }) },
    };
    await expect(
      simulator.testUtils.assignModerationJob(
        { headers: { authorization: 'Bearer token' } },
        missingPathDb
      )
    ).resolves.toMatchObject({ status: 404 });
  });

  it('updates a matching variant through the dirty-route helper', async () => {
    simulator = await createLocalGcpSimulator({ baseUrl: 'http://simulator' });
    await expect(
      simulator.testUtils.markVariantDirty({ body: {} })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing pageNumber or variantName',
    });
    const update = jest.fn();
    const variantRef = { update };
    const pageRef = {
      collection: () => ({
        where: () => ({
          limit: () => ({
            get: async () => ({ empty: false, docs: [{ ref: variantRef }] }),
          }),
        }),
      }),
    };
    const fakeDb = {
      collectionGroup: () => ({
        where: () => ({
          limit: () => ({
            get: async () => ({ empty: false, docs: [{ ref: pageRef }] }),
          }),
        }),
      }),
    };

    await expect(
      simulator.testUtils.markVariantDirty(
        { body: { pageNumber: 1, variantName: 'a' } },
        fakeDb
      )
    ).resolves.toEqual({ status: 200, body: { ok: true } });
    expect(update).toHaveBeenCalledWith({ dirty: true });
  });
});
