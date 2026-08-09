import { describe, expect, it } from '@jest/globals';
import { observeBillingSettlement } from '../../../src/core/browser/billing/billing-return-core.js';
describe('billing settlement observer', () => {
  it('polls pending then reaches paid and bounds delayed polling', async () => {
    const responses = [{ status: 'pending' }, { status: 'paid' }];
    await expect(
      observeBillingSettlement({
        readStatus: async () => responses.shift(),
        wait: async () => {},
      })
    ).resolves.toMatchObject({ state: 'paid' });
    await expect(
      observeBillingSettlement({
        readStatus: async () => ({ status: 'pending' }),
        wait: async () => {},
        maxAttempts: 2,
      })
    ).resolves.toEqual({ state: 'delayed' });
  });
});
