import {
  createLocalGcpSimulator,
  resolvePaymentCreatedAt,
  resolvePaymentCustomerApiKeyUuid,
} from '../../../../src/core/local/gcp-simulator/simulator.js';
import { describe, expect, it } from '@jest/globals';

describe('gcp simulator payment webhook route', () => {
  it('applies checkout credits and deduplicates event ids', async () => {
    const simulator = await createLocalGcpSimulator();
    const event = {
      id: 'evt_simulated_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'sim-api-key',
          metadata: { credit_amount: '80' },
        },
      },
    };

    const first = await simulator.routes.paymentWebhook({
      body: event,
    });
    expect(first).toMatchObject({
      status: 201,
      body: {
        credit: 80,
        type: 'credit_added',
        eventId: 'evt_simulated_checkout',
        applied: true,
      },
    });

    const balance = await simulator.routes.getApiKeyCreditV2({
      method: 'GET',
      params: { uuid: 'sim-api-key' },
    });
    expect(balance).toMatchObject({
      status: 200,
      body: { credit: 80 },
    });

    const duplicate = await simulator.routes.paymentWebhook({
      body: event,
    });
    expect(duplicate).toEqual({
      status: 200,
      body: { duplicate: true, eventId: 'evt_simulated_checkout' },
    });

    await simulator.clear();
  });

  it('resolves customer mappings and stores timestamps without created values', async () => {
    const simulator = await createLocalGcpSimulator();
    await simulator.db.collection('payment-customers').doc('cus_map').set({
      apiKeyUuid: 'mapped-api-key',
    });

    const event = {
      id: 'evt_customer_mapping',
      type: 'payment_intent.succeeded',
      created: undefined,
      data: {
        object: {
          customer: 'cus_map',
          metadata: { credit_amount: '12' },
        },
      },
    };

    await expect(
      simulator.routes.paymentWebhook({
        body: event,
      })
    ).resolves.toMatchObject({
      status: 201,
      body: {
        credit: 12,
        type: 'credit_added',
        eventId: 'evt_customer_mapping',
        applied: true,
      },
    });

    await simulator.clear();
  });

  it('covers the standalone payment timestamp and customer helpers', () => {
    expect(resolvePaymentCustomerApiKeyUuid('api-key')).toBe('api-key');
    expect(resolvePaymentCustomerApiKeyUuid(123)).toBeNull();
    expect(resolvePaymentCreatedAt({ created: 10 })).toEqual(new Date(10000));
    expect(resolvePaymentCreatedAt({})).toBeInstanceOf(Date);
  });
});
