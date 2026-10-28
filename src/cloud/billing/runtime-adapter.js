import { randomUUID } from 'node:crypto';
import { createBillingRuntime as createCoreBillingRuntime } from '../../core/cloud/billing/billing-runtime-core.js';

/**
 * Generate a purchase UUID at the external billing boundary.
 * @param {import('../../../types/allow-effects').AllowEffects} permission Request permission.
 * @returns {string} New UUID.
 */
export function createBillingPurchaseId(permission) {
  void permission;
  return randomUUID();
}

/**
 * Supply native purchase identity generation while preserving explicit overrides.
 * @param {Parameters<typeof createCoreBillingRuntime>[0]} db Billing database.
 * @param {Omit<Parameters<typeof createCoreBillingRuntime>[1], 'randomUUID'> & {randomUUID?: Parameters<typeof createCoreBillingRuntime>[1]['randomUUID']}} [runtime] Runtime overrides.
 * @returns {ReturnType<typeof createCoreBillingRuntime>} Composed billing service.
 */
export function createBillingRuntime(db, runtime = {}) {
  return createCoreBillingRuntime(db, {...runtime, randomUUID: runtime.randomUUID ?? createBillingPurchaseId});
}
