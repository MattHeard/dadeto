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
    expect(() =>
      normalizeBillingOffers({ packages: [{ ...offer, markupBps: 1 }] })
    ).not.toThrow();
    expect(() =>
      normalizeBillingOffers({ packages: [{ ...offer, credits: 0 }] })
    ).toThrow();
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
});
