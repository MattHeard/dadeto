// @ts-nocheck -- billing uses injected Firestore transaction doubles at runtime boundaries.
/* eslint-disable jsdoc/reject-any-type */
import { calculateOperationCredits } from './pricing-core.js';
import { consumeCreditLots } from './credit-lots-core.js';
import { randomUUID as nodeRandomUUID } from 'node:crypto';
import {
  getApiKeyCreditDocument as creditRef,
  getApiKeyCreditEventDocument as eventRef,
} from '../get-api-key-credit-v2/get-api-key-credit-v2-core.js';

/** @typedef {any} BillingRuntimeValue Runtime-shaped billing value. */

/**
 * @typedef {{ status: number, body: object }} BillingResponse
 */

/**
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {string} id Document id.
 * @returns {BillingRuntimeValue} Document reference.
 */
function purchaseRef(db, id) {
  return db.collection('billing-purchases').doc(String(id));
}

/**
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {string} uuid API key UUID.
 * @param {string} purchaseId Purchase id.
 * @returns {BillingRuntimeValue} Document reference.
 */
function lotRef(db, uuid, purchaseId) {
  return creditRef(db, uuid).collection('lots').doc(String(purchaseId));
}

/**
 * @param {{ exists?: boolean, data?: () => unknown }} snapshot Snapshot.
 * @returns {Record<string, unknown>} Snapshot data.
 */
function readData(snapshot) {
  if (!snapshot.exists || typeof snapshot.data !== 'function') return {};
  const data = snapshot.data();
  if (!data || typeof data !== 'object') return {};
  return /** @type {Record<string, unknown>} */ (data);
}

/**
 * Read a document from a named collection.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {string} collectionName Collection name.
 * @param {string} id Document identifier.
 * @returns {Promise<BillingRuntimeValue|null>} Document data.
 */
async function readDocument(db, collectionName, id) {
  const snapshot = await db.collection(collectionName).doc(id).get();
  if (!snapshot.exists) return null;
  return snapshot.data();
}

/**
 * Create Firestore-backed accessors for the billing domain.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {{ randomUUID?: () => string, now?: () => Date }} [runtime] Runtime helpers.
 * @returns {BillingRuntimeValue} Billing service.
 */
export function createBillingRuntime(db, runtime = {}) {
  const randomUUID = runtime.randomUUID ?? nodeRandomUUID;
  const now = runtime.now ?? (() => new Date());

  /**
   * @param {string} snapshotId Snapshot identifier.
   * @returns {Promise<BillingRuntimeValue|null>} Pricing snapshot.
   */
  async function getPricingSnapshot(snapshotId) {
    return readDocument(db, 'billing-pricing-snapshots', snapshotId);
  }

  /** @returns {Promise<BillingRuntimeValue|null>} Current pricing snapshot. */
  async function getCurrentPricingSnapshot() {
    const cutoff = now().toISOString();
    const snap = await db
      .collection('billing-pricing-snapshots')
      .orderBy('effectiveAt', 'desc')
      .get();
    const current = snap.docs.find(doc => doc.data()?.effectiveAt <= cutoff);
    if (!current) return null;
    return current.data();
  }

  /**
   * @param {string} packageId Package identifier.
   * @returns {Promise<BillingRuntimeValue|null>} Credit package.
   */
  async function getPackage(packageId) {
    return readDocument(db, 'billing-packages', packageId);
  }

  /**
   * @param {string} purchaseId Purchase identifier.
   * @returns {Promise<BillingRuntimeValue|null>} Purchase record.
   */
  async function getPurchase(purchaseId) {
    const snap = await purchaseRef(db, purchaseId).get();
    if (!snap.exists) return null;
    return readData(snap);
  }

  /**
   * Find a purchase by its Stripe Checkout Session ID.
   * @param {string} checkoutSessionId Stripe Checkout Session ID.
   * @returns {Promise<BillingRuntimeValue|null>} Matching purchase.
   */
  async function getPurchaseByCheckoutSession(checkoutSessionId) {
    const snap = await db
      .collection('billing-purchases')
      .where('checkoutSessionId', '==', checkoutSessionId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return readData(snap.docs[0]);
  }

  /**
   * @param {string} purchaseId Purchase identifier.
   * @param {BillingRuntimeValue} session Checkout session.
   * @returns {Promise<void>} Resolves after persistence.
   */
  async function savePurchaseCheckout(purchaseId, session) {
    await purchaseRef(db, purchaseId).set(
      {
        checkoutSessionId: session.checkoutSessionId,
        checkoutUrl: session.url,
        checkoutExpiresAt: session.expiresAt,
      },
      { merge: true }
    );
  }

  /**
   * @param {BillingRuntimeValue} input Purchase input.
   * @returns {Promise<BillingRuntimeValue>} Created purchase.
   */
  async function createPurchase(input) {
    const purchaseId = input.purchaseId ?? randomUUID();
    const purchase = {
      ...input,
      purchaseId,
      status: 'pending',
      creditsRemaining: input.creditsIssued,
      refundedUsdMinor: 0,
      createdAt: input.createdAt ?? now(),
    };
    await purchaseRef(db, purchaseId).set(purchase);
    return purchase;
  }

  /**
   * @param {BillingRuntimeValue} input Payment input.
   * @returns {Promise<BillingResponse>} Payment response.
   */
  async function markPurchasePaid(input) {
    const ref = purchaseRef(db, input.purchaseId);
    return db.runTransaction(async transaction => {
      const purchaseSnap = await transaction.get(ref);
      if (!purchaseSnap.exists)
        return { status: 404, body: { error: 'purchase_not_found' } };
      const purchase = readData(purchaseSnap);
      if (
        purchase.status === 'paid' ||
        purchase.status === 'partially_refunded'
      ) {
        return {
          status: 200,
          body: { duplicate: true, purchaseId: input.purchaseId },
        };
      }
      const balance = await transaction.get(creditRef(db, purchase.apiKeyUuid));
      const before = Number(readData(balance).credit ?? 0);
      const after = before + purchase.creditsIssued;
      const legacyReference = lotRef(db, purchase.apiKeyUuid, 'legacy');
      const legacy = await transaction.get(legacyReference);
      if (before > 0 && !legacy.exists)
        transaction.set(legacyReference, createLegacyLot(before, now()));
      const lot = {
        purchaseId: purchase.purchaseId,
        issuedCredits: purchase.creditsIssued,
        remainingCredits: purchase.creditsIssued,
        createdAt: purchase.createdAt,
        refundable: true,
        pricingSnapshotId: purchase.pricingSnapshotId,
      };
      transaction.set(
        lotRef(db, purchase.apiKeyUuid, purchase.purchaseId),
        lot
      );
      transaction.set(creditRef(db, purchase.apiKeyUuid), {
        credit: after,
        lastEventId: input.eventId,
      });
      transaction.set(eventRef(db, purchase.apiKeyUuid, input.eventId), {
        type: 'credit_added',
        eventId: input.eventId,
        amount: purchase.creditsIssued,
        purchaseId: purchase.purchaseId,
        pricingSnapshotId: purchase.pricingSnapshotId,
        balanceBefore: before,
        balanceAfter: after,
        createdAt: now(),
      });
      transaction.set(ref, {
        ...purchase,
        status: 'paid',
        stripePaymentIntentId: input.stripePaymentIntentId,
        paidAt: now(),
      });
      return {
        status: 201,
        body: { purchaseId: purchase.purchaseId, credit: after, applied: true },
      };
    });
  }

  /**
   * @param {string} uuid API key UUID.
   * @returns {Promise<Array<{ ref: object, data: object }>>} Available lots.
   */
  async function listLots(uuid) {
    const snap = await creditRef(db, uuid)
      .collection('lots')
      .orderBy('createdAt', 'asc')
      .get();
    return snap.docs
      .map(doc => ({ ref: doc.ref, data: readData(doc) }))
      .filter(lot => Number(lot.data.remainingCredits ?? 0) > 0);
  }

  /**
   * @param {BillingRuntimeValue} input Charge input.
   * @returns {Promise<BillingResponse>} Charge response.
   */
  async function applyOperationCharge(input) {
    const amount = calculateOperationCredits(
      input.operationId,
      input.pricingSnapshot
    );
    const candidates = await listLots(input.uuid);
    return db.runTransaction(transaction =>
      chargeOperationTransaction({
        db,
        now,
        transaction,
        input,
        amount,
        candidates,
      })
    );
  }

  /**
   * Charge an operation using the current server-side pricing snapshot.
   * @param {{ uuid: string, operationId: string, eventId: string, executedAt?: Date }} input Charge inputs.
   * @returns {Promise<BillingResponse>} Charge response.
   */
  async function chargeOperation(input) {
    const pricingSnapshot = await getCurrentPricingSnapshot();
    if (!pricingSnapshot)
      return { status: 503, body: { error: 'pricing_unavailable' } };
    return applyOperationCharge({ ...input, pricingSnapshot });
  }

  /**
   * Apply a Stripe refund to a purchase.
   * @param {BillingRuntimeValue} input Refund input.
   * @returns {Promise<BillingResponse>} Refund response.
   */
  async function applyRefundEvent(input) {
    return applyRefund(db, now, input);
  }

  /**
   * Mark a matching pending purchase expired exactly once.
   * @param {{ purchaseId: string, eventId: string }} input Expiry event.
   * @returns {Promise<BillingResponse>} Expiry response.
   */
  async function markPurchaseExpired(input) {
    return db.runTransaction(async transaction => {
      const ref = purchaseRef(db, input.purchaseId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists)
        return { status: 404, body: { error: 'purchase_not_found' } };
      const purchase = readData(snapshot);
      if (purchase.status === 'expired')
        return {
          status: 200,
          body: { duplicate: true, purchaseId: input.purchaseId },
        };
      if (purchase.status !== 'pending')
        return {
          status: 200,
          body: {
            ignored: true,
            purchaseId: input.purchaseId,
            status: purchase.status,
          },
        };
      transaction.set(ref, {
        ...purchase,
        status: 'expired',
        expiredEventId: input.eventId,
        expiredAt: now(),
      });
      return {
        status: 200,
        body: { purchaseId: input.purchaseId, status: 'expired' },
      };
    });
  }

  return {
    getPricingSnapshot,
    getCurrentPricingSnapshot,
    getPackage,
    getPurchase,
    getPurchaseByCheckoutSession,
    createPurchase,
    savePurchaseCheckout,
    markPurchasePaid,
    applyOperationCharge,
    chargeOperation,
    applyRefundEvent,
    markPurchaseExpired,
  };
}

export { creditRef, eventRef, lotRef, purchaseRef };

export const billingRuntimeTestUtils = { readTransactionLots };

/**
 * Apply an operation charge inside a Firestore transaction.
 * @param {{ db: object, now: () => Date, transaction: object, input: object, amount: number, candidates: Array<{ ref: object, data: object }> }} db Charge transaction input.
 * @returns {Promise<BillingResponse>} Charge response.
 */
async function chargeOperationTransaction({
  db,
  now,
  transaction,
  input,
  amount,
  candidates,
}) {
  const event = await transaction.get(eventRef(db, input.uuid, input.eventId));
  if (event.exists)
    return { status: 200, body: { duplicate: true, eventId: input.eventId } };
  const lots = await readTransactionLots(transaction, candidates);
  const balanceSnapshot = await transaction.get(creditRef(db, input.uuid));
  const before = Number(readData(balanceSnapshot).credit ?? 0);
  if (lots.length === 0 && before > 0)
    lots.push({
      ref: lotRef(db, input.uuid, 'legacy'),
      data: createLegacyLot(before, now()),
    });
  const consumed = consumeLotsOrNull(lots, amount);
  if (!consumed) return { status: 409, body: { error: 'insufficient_credit' } };
  const after = before - amount;
  if (after < 0) return { status: 409, body: { error: 'insufficient_credit' } };
  consumed.lots.forEach((lot, index) => transaction.set(lots[index].ref, lot));
  transaction.set(creditRef(db, input.uuid), {
    credit: after,
    lastEventId: input.eventId,
  });
  transaction.set(eventRef(db, input.uuid, input.eventId), {
    type: 'operation_charged',
    eventId: input.eventId,
    operationId: input.operationId,
    amount,
    pricingSnapshotId: input.pricingSnapshot.snapshotId,
    allocations: consumed.allocations,
    balanceBefore: before,
    balanceAfter: after,
    executedAt: input.executedAt ?? now(),
  });
  return {
    status: 200,
    body: { credit: after, amount, eventId: input.eventId, applied: true },
  };
}

/**
 * Read candidate lots through a transaction.
 * @param {BillingRuntimeValue} transaction Firestore transaction.
 * @param {Array<{ ref: object, data: object }>} candidates Candidate lots.
 * @returns {Promise<Array<{ ref: object, data: object }>>} Current lots.
 */
async function readTransactionLots(transaction, candidates) {
  const lots = [];
  for (const candidate of candidates) {
    const snap = await transaction.get(candidate.ref);
    if (snap.exists) lots.push({ ref: candidate.ref, data: readData(snap) });
  }
  return lots;
}

/**
 * Consume lots, converting the expected shortage into a null result.
 * @param {Array<{ purchaseId: string, remainingCredits: number }>} lots Lots.
 * @param {number} amount Credits to consume.
 * @returns {BillingRuntimeValue|null} Consumption result.
 */
function consumeLotsOrNull(lots, amount) {
  try {
    return consumeCreditLots(
      lots.map(lot => lot.data),
      amount
    );
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'Insufficient credit')
      return null;
    throw cause;
  }
}

/**
 * Create a non-refundable lot representing a pre-lot balance.
 * @param {number} credits Credit balance.
 * @param {Date} createdAt Migration timestamp.
 * @returns {BillingRuntimeValue} Legacy lot.
 */
function createLegacyLot(credits, createdAt) {
  return {
    purchaseId: 'legacy',
    issuedCredits: credits,
    remainingCredits: credits,
    createdAt,
    refundable: false,
    pricingSnapshotId: 'legacy',
  };
}

/**
 * Apply a refund transaction.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {() => Date} now Clock callback.
 * @param {BillingRuntimeValue} input Refund input.
 * @returns {Promise<BillingResponse>} Refund response.
 */
async function applyRefund(db, now, input) {
  const ref = purchaseRef(db, input.purchaseId);
  return db.runTransaction(async transaction => {
    const purchaseSnap = await transaction.get(ref);
    if (!purchaseSnap.exists)
      return { status: 404, body: { error: 'purchase_not_found' } };
    const purchase = readData(purchaseSnap);
    const lotReference = lotRef(db, purchase.apiKeyUuid, purchase.purchaseId);
    const lotSnap = await transaction.get(lotReference);
    const lot = readData(lotSnap);
    const refundable = Number(lot.remainingCredits ?? 0);
    if (refundable <= 0)
      return {
        status: 200,
        body: { purchaseId: input.purchaseId, refunded: false },
      };
    const balanceReference = creditRef(db, purchase.apiKeyUuid);
    const balanceSnap = await transaction.get(balanceReference);
    const before = Number(readData(balanceSnap).credit ?? 0);
    const after = before - refundable;
    if (after < 0)
      return { status: 409, body: { error: 'refund_balance_conflict' } };
    transaction.set(lotReference, {
      ...lot,
      remainingCredits: 0,
      refundable: false,
    });
    transaction.set(balanceReference, {
      credit: after,
      lastEventId: input.eventId,
    });
    transaction.set(eventRef(db, purchase.apiKeyUuid, input.eventId), {
      type: 'credit_deducted',
      eventId: input.eventId,
      amount: refundable,
      purchaseId: input.purchaseId,
      reason: 'refund',
      balanceBefore: before,
      balanceAfter: after,
      refundedUsdMinor: input.refundedUsdMinor,
      pricingSnapshotId: input.pricingSnapshotId,
      createdAt: now(),
    });
    transaction.set(ref, {
      ...purchase,
      status: resolveRefundStatus(refundable, purchase.creditsIssued),
      creditsRemaining: 0,
      refundedUsdMinor: input.refundedUsdMinor,
    });
    return {
      status: 200,
      body: {
        purchaseId: input.purchaseId,
        refunded: true,
        creditsReversed: refundable,
      },
    };
  });
}

/**
 * Resolve the purchase status after a refund.
 * @param {number} remainingCredits Remaining credits before reversal.
 * @param {number} issuedCredits Credits originally issued.
 * @returns {string} Purchase status.
 */
function resolveRefundStatus(remainingCredits, issuedCredits) {
  if (remainingCredits === issuedCredits) return 'refunded';
  return 'partially_refunded';
}
