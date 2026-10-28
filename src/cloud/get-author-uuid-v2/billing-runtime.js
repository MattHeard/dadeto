import { createBillingRuntime } from '../billing/runtime-adapter.js';
import { createBillingTransactionRunner } from '../billing/transaction-effect-adapter.js';

/**
 * Compose the optional billing capability for the author UUID function.
 * @param {object} db Firestore database.
 * @param {Record<string, string|undefined>} environment Runtime environment.
 * @param {(allowEffects: import('../../../types/allow-effects').AllowEffects, uid: string) => Promise<string|null>} resolveBillingIdentity Billing identity reader.
 * @returns {{enabled: boolean, service: ReturnType<typeof createBillingRuntime>, resolveBillingIdentity: typeof resolveBillingIdentity}} Billing capability.
 */
export function createGetAuthorUuidV2BillingRuntime(
  db,
  environment,
  resolveBillingIdentity
) {
  const enabled = environment.BILLING_ENABLED === 'true';
  return {
    enabled,
    service: createBillingRuntime(db, {
      billingEnabled: enabled,
      runBillingTransaction: createBillingTransactionRunner(db),
    }),
    resolveBillingIdentity,
  };
}
