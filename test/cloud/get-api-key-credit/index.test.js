import { describe, expect, it, jest } from '@jest/globals';

describe('get-api-key-credit entry point', () => {
  it('mints a fresh frozen capability for each HTTP request', async () => {
    const internalHandler = jest.fn(async () => {});
    let mod;

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule(
        '../../../src/cloud/get-api-key-credit/get-api-key-credit-gcf.js',
        () => ({ Firestore: jest.fn() })
      );
      await jest.unstable_mockModule(
        '../../../src/core/cloud/get-api-key-credit/get-api-key-credit-core.js',
        () => ({
          createGetApiKeyCreditExpressHandle: jest.fn(() => internalHandler),
          createFirestore: jest.fn(),
          createGetApiKeyCreditHandler: jest.fn(),
          fetchApiKeyCreditDocument: jest.fn(),
          findUuidFromRequest: jest.fn(),
          isMissingDocument: jest.fn(),
        })
      );
      mod = await import('../../../src/cloud/get-api-key-credit/index.js');
    });

    await mod.handle({}, {});
    await mod.handle({}, {});

    const firstPermission = internalHandler.mock.calls[0][0];
    const secondPermission = internalHandler.mock.calls[1][0];
    expect(Object.isFrozen(firstPermission)).toBe(true);
    expect(Object.isFrozen(secondPermission)).toBe(true);
    expect(firstPermission).not.toBe(secondPermission);
  });
});
