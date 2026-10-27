import { authenticatePurchaseRequest } from './authentication-core.js';

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{status: number, body: string|Record<string, unknown>}} RefundResponse */

/**
 * Build an authenticated handler for DADETO-originated unused-credit refunds.
 * @param {{ billingEnabled: boolean, stripeConfigured: boolean, sha256Utf8: (identity: string) => string, verifyIdToken: (token: string) => Promise<{uid?: string}>, getPurchase: (purchaseId: string) => Promise<Record<string, any>|null>, createRefundIntent: (allowEffects: AllowEffects, input: {refundIntentId: string, purchaseId: string}) => Promise<RefundResponse>, createStripeRefund: (allowEffects: AllowEffects, input: {payment_intent: string, amount: number, reason: string, metadata: {purchase_id: string, refund_intent_id: string}}, options: {idempotencyKey: string}) => Promise<{id: string, status?: string}>, recordRefundSubmission: (allowEffects: AllowEffects, input: {refundIntentId: string, stripeRefundId: string, stripeStatus: string}) => Promise<RefundResponse>, markRefundIntentAmbiguous: (allowEffects: AllowEffects, refundIntentId: string) => Promise<RefundResponse> }} deps Handler dependencies.
 * @returns {(allowEffects: AllowEffects, request: {authorization?: unknown, purchaseId?: unknown, idempotencyKey?: unknown}) => Promise<RefundResponse>} Refund request handler.
 */
export function createBillingRefundRequestHandler(deps) {
  return async function handleRefundRequest(allowEffects, request) {
    if (!deps.billingEnabled)
      return { status: 503, body: { error: 'billing_disabled' } };
    if (!deps.stripeConfigured)
      return { status: 503, body: { error: 'payment_provider_unavailable' } };
    if (
      typeof request.purchaseId !== 'string' ||
      request.purchaseId.length === 0 ||
      request.purchaseId.length > 150 ||
      request.purchaseId.includes('/')
    ) {
      return { status: 400, body: { error: 'invalid_purchase_id' } };
    }
    if (
      typeof request.idempotencyKey !== 'string' ||
      request.idempotencyKey.trim().length === 0 ||
      request.idempotencyKey.length > 255
    ) {
      return { status: 400, body: { error: 'idempotency_key_required' } };
    }
    const result = await authenticatePurchaseRequest({
      authorization: request.authorization,
      parseToken: readBearerToken,
      verifyIdToken: deps.verifyIdToken,
      purchaseId: request.purchaseId,
      loadPurchase: deps.getPurchase,
    });
    if ('response' in result) return result.response;
    const { claims } = result;
    if (typeof claims.uid !== 'string' || claims.uid.length === 0)
      return { status: 401, body: { error: 'authentication_required' } };
    const refundIntentId = createRefundIntentId(
      claims.uid,
      request.purchaseId,
      request.idempotencyKey.trim(),
      deps.sha256Utf8
    );
    const intentResult = await deps.createRefundIntent(allowEffects, {
      refundIntentId,
      purchaseId: request.purchaseId,
    });
    if (intentResult.status !== 200 && intentResult.status !== 201)
      return intentResult;
    const intent = readRefundIntent(intentResult.body);
    if (!intent)
      return { status: 500, body: { error: 'invalid_refund_intent_result' } };
    if (!['requested', 'ambiguous'].includes(intent.status)) {
      return {
        status: 200,
        body: { duplicate: true, refundIntent: intent },
      };
    }

    let stripeRefund;
    try {
      stripeRefund = await deps.createStripeRefund(
        allowEffects,
        {
          ['payment_intent']: intent.stripePaymentIntentId,
          amount: intent.amountUsdMinor,
          reason: 'requested_by_customer',
          metadata: {
            ['purchase_id']: intent.purchaseId,
            ['refund_intent_id']: intent.refundIntentId,
          },
        },
        { idempotencyKey: `dadeto-refund-${intent.refundIntentId}` }
      );
    } catch {
      await deps.markRefundIntentAmbiguous(allowEffects, refundIntentId);
      return {
        status: 503,
        body: { error: 'refund_submission_ambiguous', refundIntentId },
      };
    }
    return deps.recordRefundSubmission(allowEffects, {
      refundIntentId,
      stripeRefundId: stripeRefund.id,
      stripeStatus: stripeRefund.status ?? 'unknown',
    });
  };
}

/**
 * Derive a stable Firestore-safe ID without persisting the caller's raw key.
 * @param {string} uid Authenticated user identifier.
 * @param {string} purchaseId Purchase identifier.
 * @param {string} idempotencyKey Caller retry key.
 * @param {(identity: string) => string} sha256Utf8 Injected SHA-256 UTF-8 operation.
 * @returns {string} Stable intent identifier.
 */
function createRefundIntentId(uid, purchaseId, idempotencyKey, sha256Utf8) {
  const identity = [uid, purchaseId, idempotencyKey].join('\u0000');
  return `refund-${sha256Utf8(identity)}`;
}

/**
 * @param {unknown} authorization Authorization header.
 * @returns {string} Bearer token or empty string.
 */
function readBearerToken(authorization) {
  if (typeof authorization !== 'string') return '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1] ?? '';
}

/**
 * @param {unknown} body Billing result body.
 * @returns {Record<string, any>|null} Persisted refund intent when available.
 */
function readRefundIntent(body) {
  if (!body || typeof body !== 'object' || !('refundIntent' in body))
    return null;
  const intent = body.refundIntent;
  if (typeof intent !== 'object') return null;
  return intent;
}

/** Focused access to persisted-result parsing. */
export const refundRequestTestOnly = { readRefundIntent };
