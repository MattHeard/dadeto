import { describe, expect, it, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { createBillingTransactionRunner } from '../../../src/cloud/billing/transaction-effect-adapter.js';

describe('billing transaction adapter', () => {
  it('runs the transaction callback after receiving the request capability', async () => {
    const allowEffects = createAllowEffects();
    const transaction = { get: jest.fn(), set: jest.fn() };
    const runTransaction = jest.fn(async update => update(transaction));
    const db = { runTransaction };
    const update = jest.fn(async received => {
      received.set('purchase-ref', { status: 'paid' });
      return { status: 201, body: { settled: true } };
    });

    await expect(
      createBillingTransactionRunner(db)(allowEffects, update)
    ).resolves.toEqual({ status: 201, body: { settled: true } });

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(transaction);
    expect(transaction.set).toHaveBeenCalledWith('purchase-ref', {
      status: 'paid',
    });
  });
});
