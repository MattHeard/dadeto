import { describe, expect, it, jest } from '@jest/globals';

describe('object-minute rental search HTTP boundary', () => {
  it('exposes the search handler through the HTTP effect boundary', async () => {
    let mod;

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('firebase-admin/app', () => ({
        initializeApp: jest.fn(() => ({ app: true })),
      }));
      await jest.unstable_mockModule('firebase-admin/firestore', () => ({
        getFirestore: jest.fn(() => ({ db: true })),
        FieldValue: {},
      }));
      await jest.unstable_mockModule('@google-cloud/storage', () => ({
        Storage: jest.fn(() => ({ storage: true })),
      }));
      mod = await import(
        '../../../src/cloud/object-minute-rental-search/index.js'
      );
    });

    const request = { method: 'OPTIONS' };
    const response = {
      json: jest.fn(),
      status: jest.fn(() => response),
    };
    await mod.handle(request, response);
    await mod.handle(request, response);

    expect(response.status).toHaveBeenCalledTimes(2);
    expect(response.status).toHaveBeenNthCalledWith(1, 204);
    expect(response.status).toHaveBeenNthCalledWith(2, 204);
    expect(response.json).toHaveBeenCalledTimes(2);
    expect(response.json).toHaveBeenNthCalledWith(1, {});
    expect(response.json).toHaveBeenNthCalledWith(2, {});
  });
});
