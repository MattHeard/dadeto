import { describe, expect, it, jest } from '@jest/globals';
import { createCheckoutSessionHandler } from '../../../../src/core/cloud/create-checkout-session/create-checkout-session-core.js';

const request = (body = { packageId: 'credits-100' }, key = '7af49d79-1943-4724-b57e-48310bca15d0') => ({
  method: 'POST', headers: { authorization: 'Bearer token', 'idempotency-key': key }, body,
});

function setup(overrides = {}) {
  const create = jest.fn().mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/x', expires_at: 1785869100 });
  return { create, handler: createCheckoutSessionHandler({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'uid-1' }),
    resolveApiKeyUuidForUid: jest.fn().mockResolvedValue({ apiKeyUuid: 'key-1' }),
    resolveBillingCustomer: jest.fn().mockResolvedValue({ stripeCustomerId: 'cus-1' }),
    createBillingCustomer: jest.fn(), saveCustomerMappings: jest.fn(),
    getCreditPackage: jest.fn().mockImplementation(packageId =>
      Promise.resolve(
        packageId === 'credits-100'
          ? { stripePriceId: 'price-100', credits: 100, active: true }
          : null
      )
    ),
    createStripeCheckoutSession: create, publicBillingOrigin: 'https://example.com',
    now: () => new Date('2026-08-04T00:00:00Z'), ...overrides,
  }) };
}

describe('createCheckoutSessionHandler', () => {
  it('creates a server-priced session for the owned key', async () => {
    const { handler, create } = setup();
    await expect(handler(request())).resolves.toMatchObject({ status: 201, body: { checkoutSessionId: 'cs_test_1' } });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ client_reference_id: 'key-1', line_items: [{ price: 'price-100', quantity: 1 }], success_url: 'https://example.com/billing/success?session_id={CHECKOUT_SESSION_ID}' }), { idempotencyKey: 'checkout-session:uid-1:7af49d79-1943-4724-b57e-48310bca15d0' });
    expect(create.mock.calls[0][0]).not.toHaveProperty('amount');
  });
  it.each([
    [{}, 401, 'authentication_required'],
    [{ headers: { authorization: 'Bearer token' } }, 400, 'invalid_idempotency_key'],
    [request({ packageId: 'missing' }), 400, 'invalid_package'],
  ])('rejects invalid input', async (input, status, code) => {
    const { handler } = setup();
    await expect(handler(input)).resolves.toMatchObject({ status, body: { error: { code } } });
  });
  it('does not create a session without an eligible key', async () => {
    const { handler, create } = setup({ resolveApiKeyUuidForUid: jest.fn().mockResolvedValue(null) });
    await expect(handler(request())).resolves.toMatchObject({ status: 403 });
    expect(create).not.toHaveBeenCalled();
  });
  it('returns an existing idempotent result and detects conflicts', async () => {
    const existing = { checkoutSessionId: 'cs_old', url: 'https://checkout.stripe.com/old', expiresAt: new Date().toISOString() };
    const first = setup({ resolveIdempotency: jest.fn().mockResolvedValue({ session: existing }) });
    await expect(first.handler(request())).resolves.toEqual({ status: 201, body: existing });
    const conflict = setup({ resolveIdempotency: jest.fn().mockResolvedValue({ conflict: true }) });
    await expect(conflict.handler(request())).resolves.toMatchObject({ status: 409 });
  });
});
