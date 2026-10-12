import { describe, expect, it, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { createPaymentWebhookStartupDb } from '../../../src/cloud/payment-webhook/startup-effect-adapter.js';

describe('payment-webhook startup effect adapter', () => {
  it('requires a capability before constructing the configured Firestore client', () => {
    const allowEffects = createAllowEffects();
    const firestore = {};
    const FirestoreConstructor = jest.fn(() => firestore);

    expect(
      createPaymentWebhookStartupDb(allowEffects, FirestoreConstructor, {
        DATABASE_ID: 'billing-test',
      })
    ).toBe(firestore);
    expect(FirestoreConstructor).toHaveBeenCalledWith({
      databaseId: 'billing-test',
    });
  });

  it('constructs the default Firestore client when no database is configured', () => {
    const allowEffects = createAllowEffects();
    const FirestoreConstructor = jest.fn(() => ({}));

    createPaymentWebhookStartupDb(allowEffects, FirestoreConstructor, {});

    expect(FirestoreConstructor).toHaveBeenCalledWith();
  });
});
