import { describe, expect, it } from '@jest/globals';
import { observeBillingSettlement } from '../../../src/core/browser/billing/billing-return-core.js';
describe('billing settlement observer', () => {
  it('polls pending then reaches paid and bounds delayed polling', async () => {
    const responses = [{ status: 'pending' }, { status: 'paid' }];
    const waits = [];
    await expect(
      observeBillingSettlement({
        readStatus: async () => responses.shift(),
        wait: async milliseconds => waits.push(milliseconds),
      })
    ).resolves.toEqual({ state: 'paid', status: { status: 'paid' } });
    expect(waits).toEqual([1000]);

    const expired = await observeBillingSettlement({
      readStatus: async () => ({ status: 'expired' }),
      wait: async () => {
        throw new Error('expired must not wait');
      },
    });
    expect(expired).toEqual({
      state: 'expired',
      status: { status: 'expired' },
    });

    const delayedWaits = [];
    await expect(
      observeBillingSettlement({
        readStatus: async () => ({ status: 'pending' }),
        wait: async milliseconds => delayedWaits.push(milliseconds),
        maxAttempts: 2,
      })
    ).resolves.toEqual({ state: 'delayed' });
    expect(delayedWaits).toEqual([1000]);

    const noWaits = [];
    let reads = 0;
    await expect(
      observeBillingSettlement({
        readStatus: async () => {
          reads += 1;
          return { status: 'pending' };
        },
        wait: async milliseconds => noWaits.push(milliseconds),
        maxAttempts: 1,
      })
    ).resolves.toEqual({ state: 'delayed' });
    expect(reads).toBe(1);
    expect(noWaits).toEqual([]);
  });
});
