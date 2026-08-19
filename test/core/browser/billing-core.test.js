import { describe, expect, it, jest } from '@jest/globals';
import {
  createBillingController,
  normalizeBillingOffers,
} from '../../../src/core/browser/billing/billing-core.js';

const offer = {
  packageId: 'usd-10',
  currency: 'usd',
  amountUsdMinor: 1000,
  credits: 9200000,
};
/**
 *
 * @param overrides
 */
/**
 * Build a controller fixture.
 * @param {Record<string, unknown>} overrides Dependency overrides.
 * @returns {{ deps: Record<string, unknown>, controller: object }} Fixture.
 */
function setup(overrides = {}) {
  const deps = {
    loadOffers: jest.fn(async () => ({ packages: [offer] })),
    getFreshToken: jest.fn(async () => 'token'),
    signIn: jest.fn(),
    createUuid: jest.fn(() => 'attempt-1'),
    postCheckout: jest.fn(async () => ({
      url: 'https://checkout.test/session',
    })),
    navigate: jest.fn(),
    ...overrides,
  };
  return { deps, controller: createBillingController(deps) };
}

describe('billing browser core', () => {
  it('normalizes only safe display-ready offers', () => {
    expect(normalizeBillingOffers({ packages: [offer] })).toEqual([offer]);
    expect(() => normalizeBillingOffers(null)).toThrow(
      new TypeError('Invalid billing package response')
    );
    expect(() => normalizeBillingOffers({ packages: 'not-an-array' })).toThrow(
      'Invalid billing package response'
    );
    expect(() => normalizeBillingOffers({ packages: [] })).not.toThrow();
    expect(() => normalizeBillingOffers({ packages: [null] })).toThrow(
      'Invalid billing package'
    );
    expect(() => normalizeBillingOffers({ packages: [10] })).toThrow(
      'Invalid billing package'
    );
    const callableOffer = () => {};
    Object.assign(callableOffer, offer);
    expect(() => normalizeBillingOffers({ packages: [callableOffer] })).toThrow(
      'Invalid billing package'
    );
    expect(() =>
      normalizeBillingOffers({ packages: [{ ...offer, currency: 'eur' }] })
    ).toThrow('Invalid billing package');
    expect(() =>
      normalizeBillingOffers({ packages: [{ ...offer, packageId: 10 }] })
    ).toThrow('Invalid billing package');
    expect(() =>
      normalizeBillingOffers({ packages: [{ ...offer, amountUsdMinor: 1.5 }] })
    ).toThrow('Invalid billing package');
    expect(() =>
      normalizeBillingOffers({ packages: [{ ...offer, amountUsdMinor: 0 }] })
    ).toThrow('Invalid billing package');
    expect(() =>
      normalizeBillingOffers({ packages: [{ ...offer, credits: 1.5 }] })
    ).toThrow('Invalid billing package');
    expect(() =>
      normalizeBillingOffers({ packages: [{ ...offer, markupBps: 1 }] })
    ).not.toThrow();
    expect(() =>
      normalizeBillingOffers({ packages: [{ ...offer, credits: 0 }] })
    ).toThrow('Invalid billing package');
  });
  it('uses one UUID, fresh token, minimal body, and navigates on success', async () => {
    const { deps, controller } = setup();
    await expect(controller.startPurchase('usd-10')).resolves.toMatchObject({
      url: expect.any(String),
    });
    expect(deps.createUuid).toHaveBeenCalledTimes(1);
    expect(deps.postCheckout).toHaveBeenCalledWith(
      'usd-10',
      'token',
      'attempt-1'
    );
    expect(deps.navigate).toHaveBeenCalledWith('https://checkout.test/session');
  });
  it('signs in when needed and retries with the same UUID', async () => {
    const token = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue('fresh-token');
    const { deps, controller } = setup({ getFreshToken: token });
    await controller.startPurchase('usd-10');
    await controller.retry();
    expect(deps.signIn).toHaveBeenCalledTimes(1);
    expect(deps.createUuid).toHaveBeenCalledTimes(1);
    expect(deps.postCheckout).toHaveBeenLastCalledWith(
      'usd-10',
      'fresh-token',
      'attempt-1'
    );
  });
  it('suppresses concurrent double clicks', async () => {
    let resolve;
    const postCheckout = jest.fn(
      () =>
        new Promise(r => {
          resolve = r;
        })
    );
    const { controller } = setup({ postCheckout });
    const first = controller.startPurchase('usd-10');
    await expect(controller.startPurchase('usd-10')).resolves.toEqual({
      ignored: true,
    });
    resolve({ url: 'https://checkout.test/session' });
    await first;
  });
  it('rejects invalid checkout responses and missing authentication', async () => {
    const navigate = jest.fn();
    const invalidCheckout = setup({
      postCheckout: jest.fn(async () => ({ nope: true })),
      navigate,
    });
    await expect(
      invalidCheckout.controller.startPurchase('usd-10')
    ).rejects.toEqual(new Error('Invalid checkout response'));
    expect(navigate).not.toHaveBeenCalled();

    for (const response of [null, { url: 42 }]) {
      const invalid = setup({
        postCheckout: jest.fn(async () => response),
      });
      await expect(invalid.controller.startPurchase('usd-10')).rejects.toEqual(
        new Error('Invalid checkout response')
      );
      expect(invalid.deps.navigate).not.toHaveBeenCalled();
    }

    const missingAuth = setup({
      getFreshToken: jest.fn(async () => null),
    });
    await expect(
      missingAuth.controller.startPurchase('usd-10')
    ).rejects.toThrow('Authentication required');
    await expect(setup().controller.retry()).rejects.toThrow(
      'No billing package selected'
    );
  });
  it('creates a new attempt when changing packages', async () => {
    const { deps, controller } = setup();
    await controller.startPurchase('usd-10');
    deps.createUuid.mockReturnValueOnce('attempt-2');
    await controller.startPurchase('usd-20');
    expect(deps.createUuid).toHaveBeenCalledTimes(2);
    expect(controller.getAttemptId()).toBe('attempt-2');
  });
  it('loads and normalizes offers through the controller', async () => {
    const { controller } = setup();
    await expect(controller.loadOffers()).resolves.toEqual([offer]);
  });
  it('repairs a missing generated attempt id', async () => {
    const createUuid = jest
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValue('attempt-2');
    const { controller } = setup({ createUuid });
    await controller.startPurchase('usd-10');
    expect(createUuid).toHaveBeenCalledTimes(2);
    expect(controller.getAttemptId()).toBe('attempt-2');
  });
});
