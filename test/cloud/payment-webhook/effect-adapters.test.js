import { describe, expect, it, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { createMarkProcessedEventWriter } from '../../../src/cloud/payment-webhook/effect-adapters.js';
import { createDeferredPaymentEventReader } from '../../../src/cloud/payment-webhook/deferred-event-adapter.js';
import {
  createPersistedPaymentEvent,
  readPersistedPaymentEvent,
} from '../../../src/core/cloud/payment-webhook/deferred-event-core.js';
import { createRefundReconciliationWriter } from '../../../src/cloud/payment-webhook/refund-reconciliation-effect-adapter.js';
import {
  logPaymentWebhookError,
  sendPaymentWebhookResponse,
} from '../../../src/cloud/payment-webhook/response-effect-adapters.js';

describe('payment webhook event status adapter', () => {
  it('requires a capability for response delivery and status promotion', () => {
    const response = {
      status: jest.fn(() => response),
      json: jest.fn(),
      send: jest.fn(),
      set: jest.fn(),
    };
    const permission = createAllowEffects();
    sendPaymentWebhookResponse(permission, response, {
      status: 200,
      body: { type: 'credit_added', applied: true },
      headers: { 'content-type': 'application/json' },
    });
    expect(response.set).toHaveBeenCalledWith(
      'content-type',
      'application/json'
    );
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      type: 'credit_added',
      applied: true,
    });
  });

  it('requires a capability for failure logging', () => {
    const error = new Error('webhook failure');
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    logPaymentWebhookError(createAllowEffects(), error);
    expect(log).toHaveBeenCalledWith('payment webhook request failed', error);
    log.mockRestore();
  });

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
      livemode: true,
      ['api_version']: '2025-01-27',
      request: { id: 'req-1', ['idempotency_key']: 'key-1' },
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
        verifiedEvent: {
          ...event,
          data: event.data,
        },
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
        verifiedEvent: { id: 'evt-2', type: 'customer.created', data: {} },
        createdAt: new Date(1234),
      },
      { merge: true }
    );
    now.mockRestore();
  });

  it('reads and orders valid deferred events for one purchase only', async () => {
    const allowEffects = createAllowEffects();
    const records = [
      {
        status: 'deferred',
        verifiedEvent: { id: 'evt-later', type: 'refund.updated', created: 20 },
      },
      {
        status: 'deferred',
        verifiedEvent: {
          id: 'evt-first-z',
          type: 'refund.updated',
          created: 10,
        },
      },
      {
        status: 'deferred',
        verifiedEvent: {
          id: 'evt-first-a',
          type: 'refund.updated',
          created: 10,
        },
      },
      {
        status: 'applied',
        verifiedEvent: { id: 'evt-applied', type: 'refund.updated' },
      },
      { status: 'deferred', verifiedEvent: { type: 'missing-id' } },
    ];
    const get = jest.fn(async () => ({
      docs: records.map(data => ({ data: () => data })),
    }));
    const where = jest.fn(() => ({ get }));
    const collection = jest.fn(() => ({ where }));

    await expect(
      createDeferredPaymentEventReader({ collection })(
        allowEffects,
        'purchase-1'
      )
    ).resolves.toEqual([
      { id: 'evt-first-a', type: 'refund.updated', created: 10 },
      { id: 'evt-first-z', type: 'refund.updated', created: 10 },
      { id: 'evt-later', type: 'refund.updated', created: 20 },
    ]);
    expect(collection).toHaveBeenCalledWith('payment-events');
    expect(where).toHaveBeenCalledWith('purchaseId', '==', 'purchase-1');
  });

  it('validates persisted event snapshots and optional provider fields', () => {
    expect(
      createPersistedPaymentEvent({ id: 'evt-minimal', type: 'refund.updated' })
    ).toEqual({ id: 'evt-minimal', type: 'refund.updated', data: {} });
    expect(readPersistedPaymentEvent(null)).toBeNull();
    expect(
      readPersistedPaymentEvent({ id: 1, type: 'refund.updated' })
    ).toBeNull();
    expect(readPersistedPaymentEvent({ id: 'evt-no-type' })).toBeNull();
    expect(
      readPersistedPaymentEvent({
        id: 'evt-bad-data',
        type: 'refund.updated',
        data: 'invalid',
      })
    ).toBeNull();
    expect(
      readPersistedPaymentEvent({ id: 'evt-no-data', type: 'refund.updated' })
    ).toEqual({ id: 'evt-no-data', type: 'refund.updated' });
  });

  it('persists refund reconciliation through a permission-first writer', async () => {
    const allowEffects = createAllowEffects();
    const set = jest.fn().mockResolvedValue(undefined);
    const doc = jest.fn(() => ({ set }));
    const collection = jest.fn(() => ({ doc }));
    const record = {
      type: 'unmatched_stripe_refund',
      status: 'pending',
      eventId: 'evt-refund',
      recordedAt: new Date('2026-10-12T00:00:00.000Z'),
    };

    await createRefundReconciliationWriter({ collection })(
      allowEffects,
      'evt-refund',
      record
    );

    expect(collection).toHaveBeenCalledWith('billing-reconciliation');
    expect(doc).toHaveBeenCalledWith('evt-refund');
    expect(set).toHaveBeenCalledWith(record);
  });
});
