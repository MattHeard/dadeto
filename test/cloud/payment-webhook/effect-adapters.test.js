import { describe, expect, it, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { createMarkProcessedEventWriter } from '../../../src/cloud/payment-webhook/effect-adapters.js';

describe('payment webhook event status adapter', () => {
  it('writes the normalized status with merge semantics', async () => {
    const allowEffects = createAllowEffects();
    const set = jest.fn();
    const db = {
      collection: jest.fn(name => ({
        doc: jest.fn(id => ({
          set: (value, options) => set(name, id, value, options),
        })),
      })),
    };
    const event = {
      id: 'evt-1',
      type: 'payment_intent.succeeded',
      created: 10,
      data: {
        object: { metadata: { ['purchase_id']: 'purchase-1', ignored: 3 } },
      },
    };

    await createMarkProcessedEventWriter(db)(
      allowEffects,
      event,
      'key-1',
      'received'
    );

    expect(set).toHaveBeenCalledWith(
      'payment-events',
      'evt-1',
      {
        apiKeyUuid: 'key-1',
        type: 'payment_intent.succeeded',
        status: 'received',
        purchaseId: 'purchase-1',
        createdAt: new Date(10_000),
      },
      { merge: true }
    );
  });

  it('uses the current time and null purchase id when optional fields are absent', async () => {
    const allowEffects = createAllowEffects();
    const set = jest.fn();
    const db = {
      collection: () => ({ doc: () => ({ set }) }),
    };
    const now = jest.spyOn(Date, 'now').mockReturnValue(1234);

    await createMarkProcessedEventWriter(db)(
      allowEffects,
      { id: 'evt-2', type: 'customer.created' },
      'key-2'
    );

    expect(set).toHaveBeenCalledWith(
      {
        apiKeyUuid: 'key-2',
        type: 'customer.created',
        status: 'applied',
        purchaseId: null,
        createdAt: new Date(1234),
      },
      { merge: true }
    );
    now.mockRestore();
  });
});
