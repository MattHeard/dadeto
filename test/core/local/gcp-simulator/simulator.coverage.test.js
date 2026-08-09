import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createLocalGcpSimulator } from '../../../../src/core/local/gcp-simulator/simulator.js';

let simulator;

afterEach(async () => {
  if (simulator) {
    await simulator.clear();
    simulator = undefined;
  }
});

describe('gcp simulator coverage paths', () => {
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
  });

  it('creates the delete sentinel used by the variant-write trigger', async () => {
    simulator = await createLocalGcpSimulator({ baseUrl: 'http://simulator' });
    expect(typeof simulator.testUtils.createDeleteSentinel()).toBe('symbol');
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
          limit: () => ({ get: async () => ({ empty: false, docs: [{ ref: variantRef }] }) }),
        }),
      }),
    };
    const fakeDb = {
      collectionGroup: () => ({
        where: () => ({
          limit: () => ({ get: async () => ({ empty: false, docs: [{ ref: pageRef }] }) }),
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
