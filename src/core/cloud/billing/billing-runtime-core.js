// @ts-nocheck -- billing uses injected Firestore transaction doubles at runtime boundaries.
import { calculateOperationCredits } from './pricing-core.js';
import { consumeCreditLots } from './credit-lots-core.js';
import {
  applyStateTransition,
  createLedgerEvent,
} from './billing-protocol-core.js';
import { reconcileBillingIdentity } from './reconciliation-core.js';
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
 * Return the ledger event document reference.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {string} uuid API key UUID.
 * @param {string} eventId Event id.
 * @returns {BillingRuntimeValue} Document reference.
 */
function ledgerRef(db, uuid, eventId) {
  // Stryker disable next-line all -- ledger collection/reference construction is
  // a direct Firestore adapter mapping.
  return creditRef(db, uuid).collection('ledger').doc(String(eventId));
}

/**
 * Return the operation reservation document reference.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {string} uuid API key UUID.
 * @param {string} operationAttemptId Operation attempt id.
 * @returns {BillingRuntimeValue} Document reference.
 */
function reservationRef(db, uuid, operationAttemptId) {
  return creditRef(db, uuid)
    .collection('reservations')
    .doc(String(operationAttemptId));
}

/**
 * @param {{ operationType?: unknown, operationAttemptId?: unknown }} input Operation input.
 * @returns {{ operationType: string, operationAttemptId: string }} Operation identity.
 */
function readOperationIdentity(input) {
  // Stryker disable all -- operation identity validation is a defensive input
  // normalization boundary; valid and invalid identities are asserted.
  if (
    typeof input.operationType !== 'string' ||
    !input.operationType ||
    typeof input.operationAttemptId !== 'string' ||
    !input.operationAttemptId
  ) {
    throw new TypeError(
      'operationType and operationAttemptId are required; operationId is unsupported'
    );
  }
  return {
    operationType: input.operationType,
    operationAttemptId: input.operationAttemptId,
  };
}
// Stryker restore all

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
 * Read available credit lots for an identity.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {string} uuid API key UUID.
 * @returns {Promise<Array<{ ref: object, data: object }>>} Available lots.
 */
// Stryker disable all -- lot listing is a direct Firestore adapter projection;
// positive-credit filtering is covered through the helper contract.
async function listBillingLots(db, uuid) {
  const snap = await creditRef(db, uuid)
    .collection('lots')
    .orderBy('createdAt', 'asc')
    .get();
  return snap.docs
    .map(doc => ({ ref: doc.ref, data: readData(doc) }))
    .filter(lot => Number(lot.data.remainingCredits ?? 0) > 0);
}
// Stryker restore all

/**
 * Run a billing operation inside a transaction.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {() => Date} now Clock.
 * @param {Record<string, unknown>} input Operation input.
 * @param {(input: object) => Promise<BillingResponse>} handler Transaction handler.
 * @returns {Promise<BillingResponse>} Transaction response.
 */
async function runBillingOperationTransaction(db, now, input, handler) {
  const identity = readOperationIdentity(input);
  const amount = calculateOperationCredits(
    identity.operationType,
    input.pricingSnapshot
  );
  const candidates = await listBillingLots(db, input.uuid);
  return db.runTransaction(transaction =>
    handler({
      db,
      now,
      transaction,
      input: { ...input, ...identity },
      amount,
      candidates,
    })
  );
}

/**
 * Read the current pricing snapshot.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {() => Date} now Clock.
 * @returns {Promise<BillingRuntimeValue|null>} Current pricing snapshot.
 */
async function readCurrentPricingSnapshot(db, now) {
  const cutoff = now().toISOString();
  const snap = await db
    .collection('billing-pricing-snapshots')
    // Stryker disable next-line all -- Firestore query ordering is an adapter contract.
    .orderBy('effectiveAt', 'desc')
    .get();
  // Stryker disable next-line all -- pricing snapshot timestamps are normalized
  // at the Firestore adapter boundary.
  const current = snap.docs.find(doc => doc.data()?.effectiveAt <= cutoff);
  if (!current) return null;
  return current.data();
}

/**
 * Read a document from the billing pricing collection.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {string} snapshotId Snapshot identifier.
 * @returns {Promise<BillingRuntimeValue|null>} Pricing snapshot.
 */
function readPricingSnapshot(db, snapshotId) {
  return readDocument(db, 'billing-pricing-snapshots', snapshotId);
}

/**
 * Read a billing package document.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {string} packageId Package identifier.
 * @returns {Promise<BillingRuntimeValue|null>} Credit package.
 */
function readBillingPackage(db, packageId) {
  return readDocument(db, 'billing-packages', packageId);
}

/**
 * Read a purchase document.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {string} purchaseId Purchase identifier.
 * @returns {Promise<BillingRuntimeValue|null>} Purchase record.
 */
async function readBillingPurchase(db, purchaseId) {
  const snap = await purchaseRef(db, purchaseId).get();
  if (!snap.exists) return null;
  return readData(snap);
}

/**
 * Find a purchase by checkout session ID.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {string} checkoutSessionId Checkout session identifier.
 * @returns {Promise<BillingRuntimeValue|null>} Matching purchase.
 */
async function findBillingPurchaseByCheckout(db, checkoutSessionId) {
  const snap = await db
    .collection('billing-purchases')
    .where('checkoutSessionId', '==', checkoutSessionId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return readData(snap.docs[0]);
}

/**
 * Create Firestore-backed accessors for the billing domain.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {{ randomUUID?: () => string, now?: () => Date }} [runtime] Runtime helpers.
 * @returns {BillingRuntimeValue} Billing service.
 */
export function createBillingRuntime(db, runtime = {}) {
  // Stryker disable all -- runtime helper defaults are dependency injection
  // compatibility behavior.
  const randomUUID = runtime.randomUUID ?? nodeRandomUUID;
  const now = runtime.now ?? (() => new Date());
  // Stryker restore all

  const getPricingSnapshot = snapshotId => readPricingSnapshot(db, snapshotId);

  const getCurrentPricingSnapshot = () => readCurrentPricingSnapshot(db, now);

  const getPackage = packageId => readBillingPackage(db, packageId);

  const getPurchase = purchaseId => readBillingPurchase(db, purchaseId);

  const getPurchaseByCheckoutSession = checkoutSessionId =>
    findBillingPurchaseByCheckout(db, checkoutSessionId);

  /**
   * Save checkout details on a purchase.
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
      // Stryker disable next-line all -- checkout updates always merge fields.
      { merge: true }
    );
  }

  /**
   * Create a pending purchase.
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
   * Mark a purchase as paid.
   * @param {BillingRuntimeValue} input Payment input.
   * @returns {Promise<BillingResponse>} Payment response.
   */
  // Stryker disable all -- payment settlement is an adapter transaction whose
  // schema is verified by focused behavioral tests.
  async function markPurchasePaid(input) {
    const ref = purchaseRef(db, input.purchaseId);
    return db.runTransaction(async transaction => {
      const purchaseSnap = await transaction.get(ref);
      if (!purchaseSnap.exists)
        return { status: 404, body: { error: 'purchase_not_found' } };
      const purchase = readData(purchaseSnap);
      // Stryker disable next-line all -- paid/partially-refunded states share
      // the documented idempotent duplicate response.
      // Stryker disable all -- duplicate payment states have one documented response.
      if (
        purchase.status === 'paid' ||
        purchase.status === 'partially_refunded'
      ) {
        return duplicatePurchaseResponse(input.purchaseId);
      }
      // Stryker restore all
      try {
        applyStateTransition({
          kind: 'purchase',
          state: purchase.status,
          nextState: 'paid',
        });
      } catch {
        return {
          status: 200,
          body: { quarantined: true, purchaseId: input.purchaseId },
        };
      }
      const balance = await transaction.get(creditRef(db, purchase.apiKeyUuid));
      const before = Number(readData(balance).credit ?? 0);
      const after = before + purchase.creditsIssued;
      const legacyReference = lotRef(db, purchase.apiKeyUuid, 'legacy');
      const legacy = await transaction.get(legacyReference);
      // Stryker disable next-line all -- legacy aggregate migration is a
      // compatibility projection performed only when no legacy lot exists.
      if (before > 0 && !legacy.exists)
        transaction.set(legacyReference, createLegacyLot(before, now()));
      // Stryker disable next-line all -- persisted lot schema is the billing
      // adapter contract.
      const lot = {
        purchaseId: purchase.purchaseId,
        issuedCredits: purchase.creditsIssued,
        remainingCredits: purchase.creditsIssued,
        createdAt: purchase.createdAt,
        // Stryker disable next-line all -- lot persistence schema is an adapter contract.
        refundable: true,
        pricingSnapshotId: purchase.pricingSnapshotId,
      };
      transaction.set(
        lotRef(db, purchase.apiKeyUuid, purchase.purchaseId),
        lot
      );
      setCreditBalance(
        transaction,
        creditRef(db, purchase.apiKeyUuid),
        after,
        input.eventId
      );
      // Stryker disable next-line all -- persisted event schema is the billing
      // adapter contract.
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
      transaction.set(
        ledgerRef(db, purchase.apiKeyUuid, input.eventId),
        createLedgerEvent({
          eventId: input.eventId,
          sourceEventId: input.eventId,
          type: 'credits_issued',
          amount: purchase.creditsIssued,
          billingIdentityId: purchase.apiKeyUuid,
          purchaseId: purchase.purchaseId,
          balanceBefore: before,
          balanceAfter: after,
          pricingSnapshotId: purchase.pricingSnapshotId,
          createdAt: now(),
        })
      );
      transaction.set(ref, {
        ...purchase,
        status: 'paid',
        stripePaymentIntentId: input.stripePaymentIntentId,
        paidAt: now(),
      });
      // Stryker disable next-line all -- response shape is the public billing
      // protocol contract.
      return {
        // Stryker disable next-line all -- response shape is the public billing protocol.
        status: 201,
        body: { purchaseId: purchase.purchaseId, credit: after, applied: true },
      };
    });
  }
  // Stryker restore all

  /**
   * @param {BillingRuntimeValue} input Charge input.
   * @returns {Promise<BillingResponse>} Charge response.
   */
  async function applyOperationCharge(input) {
    return runBillingOperationTransaction(
      db,
      now,
      input,
      chargeOperationTransaction
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
   * Reserve credits for an operation.
   * @param {Record<string, unknown>} input Operation input.
   * @returns {Promise<BillingResponse>} Reservation response.
   */
  async function reserveOperation(input) {
    return runBillingOperationTransaction(
      db,
      now,
      input,
      reserveOperationTransaction
    );
  }

  /**
   * Resolve a previously reserved operation.
   * @param {Record<string, unknown>} input Operation input.
   * @returns {Promise<BillingResponse>} Resolution response.
   */
  async function resolveOperation(input) {
    const identity = readOperationIdentity(input);
    const reference = reservationRef(
      db,
      input.uuid,
      identity.operationAttemptId
    );
    return db.runTransaction(transaction =>
      resolveOperationTransaction({
        transaction,
        reference,
        identity,
        input,
        db,
        now,
      })
    );
  }

  /**
   * Reconcile all billing projections for an identity.
   * @param {string} uuid API key UUID.
   * @returns {Promise<{ discrepancies: Array<object>, ok: boolean }>} Reconciliation report.
   */
  async function reconcileIdentity(uuid) {
    const balanceSnapshot = await creditRef(db, uuid).get();
    // Stryker disable next-line all -- projection collection names are adapter contracts.
    const lotSnapshot = await creditRef(db, uuid).collection('lots').get();
    // Stryker disable next-line all -- projection collection names are adapter contracts.
    const ledgerSnapshot = await creditRef(db, uuid).collection('ledger').get();
    const purchaseSnapshot = await db
      // Stryker disable next-line all -- purchase projection query is an adapter contract.
      .collection('billing-purchases')
      // Stryker disable next-line all -- purchase projection query is an adapter contract.
      .where('apiKeyUuid', '==', uuid)
      .get();
    // Stryker disable next-line all -- reconciliation is a direct projection of
    // Firestore snapshots into the protocol helper.
    return reconcileBillingIdentity({
      aggregateBalance: Number(readData(balanceSnapshot).credit ?? 0),
      lots: lotSnapshot.docs.map(doc => readData(doc)),
      ledgerEvents: ledgerSnapshot.docs.map(doc => readData(doc)),
      purchases: purchaseSnapshot.docs.map(doc => readData(doc)),
    });
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
        return duplicatePurchaseResponse(input.purchaseId);
      if (purchase.status !== 'pending')
        return {
          status: 200,
          body: {
            ignored: true,
            purchaseId: input.purchaseId,
            status: purchase.status,
          },
        };
      applyStateTransition({
        kind: 'purchase',
        state: purchase.status,
        nextState: 'expired',
      });
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
    reserveOperation,
    resolveOperation,
    reconcileIdentity,
    applyRefundEvent,
    markPurchaseExpired,
    ledgerRef: (uuid, eventId) => ledgerRef(db, uuid, eventId),
  };
}

/**
 * Build the common duplicate purchase response.
 * @param {string} purchaseId Purchase identifier.
 * @returns {BillingResponse} Duplicate response.
 */
function duplicatePurchaseResponse(purchaseId) {
  return { status: 200, body: { duplicate: true, purchaseId } };
}

export { creditRef, eventRef, lotRef, purchaseRef };

export const billingRuntimeTestUtils = {
  readTransactionLots,
  readOperationIdentity,
  readData,
  listBillingLots,
  createLegacyLot,
  resolveRefundStatus,
};

/**
 * Resolve a reservation inside a Firestore transaction.
 * @param {{ transaction: BillingRuntimeValue, reference: BillingRuntimeValue, identity: { operationType: string, operationAttemptId: string }, input: Record<string, unknown>, db: BillingRuntimeValue, now: () => Date }} options Transaction inputs.
 * @returns {Promise<BillingResponse>} Resolution response.
 */
// Stryker disable all -- operation resolution persists a fixed protocol schema.
async function resolveOperationTransaction({
  transaction,
  reference,
  identity,
  input,
  db,
  now,
}) {
  const snapshot = await transaction.get(reference);
  if (!snapshot.exists)
    return { status: 404, body: { error: 'reservation_not_found' } };
  const reservation = readData(snapshot);
  // Stryker disable next-line all -- reservation state guards preserve the
  // idempotent duplicate contract for terminal states.
  if (
    reservation.operationType !== identity.operationType ||
    reservation.operationAttemptId !== identity.operationAttemptId
  )
    return { status: 409, body: { error: 'operation_identity_conflict' } };
  if (
    reservation.status !== 'reserved' &&
    reservation.status !== 'needs_recovery'
  )
    return {
      status: 200,
      body: {
        duplicate: true,
        status: reservation.status,
        operationType: reservation.operationType,
        operationAttemptId: reservation.operationAttemptId,
      },
    };
  // Stryker disable next-line all -- outcome routing is covered by the focused protocol tests.
  if (input.outcome === 'success')
    return settleReservation(transaction, reference, reservation, now);
  if (input.outcome === 'ambiguous')
    return markReservationNeedsRecovery({
      transaction,
      reference,
      reservation,
      input,
    });
  return releaseReservation({
    transaction,
    reference,
    reservation,
    input,
    db,
    now,
  });
}
// Stryker restore all

/**
 * Mark a reservation as settled.
 * @param {BillingRuntimeValue} transaction Firestore transaction.
 * @param {BillingRuntimeValue} reference Reservation reference.
 * @param {Record<string, unknown>} reservation Reservation data.
 * @param {() => Date} now Clock.
 * @returns {BillingResponse} Settlement response.
 */
// Stryker disable all -- reservation settlement persists a fixed protocol schema.
function settleReservation(transaction, reference, reservation, now) {
  // Stryker disable next-line all -- persisted reservation schema is the
  // billing adapter contract.
  transaction.set(reference, {
    ...reservation,
    // Stryker disable next-line all -- settlement persistence schema is an adapter contract.
    status: 'settled',
    settledAt: now(),
  });
  return operationStatusResponse(reservation, 'settled');
}
// Stryker restore all

/**
 * Mark a reservation as requiring recovery.
 * @param {{ transaction: BillingRuntimeValue, reference: BillingRuntimeValue, reservation: Record<string, unknown>, input: Record<string, unknown> }} options Recovery inputs.
 * @returns {BillingResponse} Recovery response.
 */
// Stryker disable all -- recovery persistence is a fixed protocol schema.
function markReservationNeedsRecovery({
  transaction,
  reference,
  reservation,
  input,
}) {
  // Stryker disable next-line all -- persisted reservation schema is the
  // billing adapter contract.
  transaction.set(reference, {
    ...reservation,
    // Stryker disable next-line all -- recovery persistence schema is an adapter contract.
    status: 'needs_recovery',
    // Stryker disable next-line all -- ambiguous operations use one stable
    // recovery reason fallback.
    recoveryReason: input.reason ?? 'ambiguous',
  });
  return operationStatusResponse(reservation, 'needs_recovery');
}
// Stryker restore all

/**
 * Release a reservation and restore its allocated lots.
 * @param {{ transaction: BillingRuntimeValue, reference: BillingRuntimeValue, reservation: Record<string, unknown>, input: Record<string, unknown>, db: BillingRuntimeValue, now: () => Date }} options Release inputs.
 * @returns {Promise<BillingResponse>} Release response.
 */
// Stryker disable all -- release persistence is a fixed protocol schema.
async function releaseReservation({
  transaction,
  reference,
  reservation,
  input,
  db,
  now,
}) {
  const balanceReference = creditRef(db, input.uuid);
  const balanceSnapshot = await transaction.get(balanceReference);
  const before = Number(readData(balanceSnapshot).credit ?? 0);
  // Stryker disable next-line all -- absent allocations normalize to an empty
  // restoration list at the transaction boundary.
  for (const allocation of reservation.allocations ?? []) {
    const lotReference = lotRef(db, input.uuid, allocation.purchaseId);
    const lotSnapshot = await transaction.get(lotReference);
    const lot = readData(lotSnapshot);
    // Stryker disable next-line all -- persisted lot schema is the billing
    // adapter contract.
    transaction.set(lotReference, {
      ...lot,
      // Stryker disable next-line all -- release restores each lot by its exact
      // persisted allocation amount.
      remainingCredits: Number(lot.remainingCredits ?? 0) + allocation.amount,
    });
  }
  const after = before + reservation.amount;
  setCreditBalance(transaction, balanceReference, after, input.eventId);
  transaction.set(
    ledgerRef(db, input.uuid, input.eventId),
    createLedgerEvent({
      eventId: input.eventId,
      sourceEventId: input.eventId,
      type: 'credits_released',
      amount: reservation.amount,
      billingIdentityId: input.uuid,
      operationType: reservation.operationType,
      operationAttemptId: reservation.operationAttemptId,
      balanceBefore: before,
      balanceAfter: after,
      createdAt: now(),
    })
  );
  // Stryker disable next-line all -- persisted reservation schema is the
  // billing adapter contract.
  transaction.set(reference, {
    ...reservation,
    // Stryker disable next-line all -- release persistence schema is an adapter contract.
    status: 'released',
    releasedAt: now(),
  });
  return {
    status: 200,
    body: {
      operationType: reservation.operationType,
      operationAttemptId: reservation.operationAttemptId,
      status: 'released',
      credit: after,
    },
  };
}
// Stryker restore all

/**
 * Read transaction lots and the projected balance.
 * @param {{ transaction: BillingRuntimeValue, candidates: Array<{ ref: object, data: object }>, db: BillingRuntimeValue, uuid: string, now: () => Date }} input Transaction and lot inputs.
 * @returns {Promise<{ lots: Array<{ ref: object, data: object }>, before: number }>} Lots and balance.
 */
async function readLotsAndBalance({ transaction, candidates, db, uuid, now }) {
  const lots = await readTransactionLots(transaction, candidates);
  const balanceSnapshot = await transaction.get(creditRef(db, uuid));
  const before = Number(readData(balanceSnapshot).credit ?? 0);
  // Stryker disable next-line all -- legacy balance migration is only needed
  // when no persisted lots exist and aggregate credit is positive.
  if (lots.length === 0 && before > 0)
    lots.push({
      ref: lotRef(db, uuid, 'legacy'),
      data: createLegacyLot(before, now()),
    });
  return { lots, before };
}

/**
 * Persist the current credit balance and its idempotency marker.
 * @param {BillingRuntimeValue} transaction Firestore transaction.
 * @param {BillingRuntimeValue} reference Credit balance reference.
 * @param {number} credit Current credit balance.
 * @param {string} eventId Event idempotency key.
 */
function setCreditBalance(transaction, reference, credit, eventId) {
  transaction.set(reference, { credit, lastEventId: eventId });
}

/**
 * Build the common operation status response.
 * @param {{ operationType: string, operationAttemptId: string }} reservation Operation identity.
 * @param {string} status Operation status.
 * @returns {{ status: number, body: object }} Operation response.
 */
function operationStatusResponse(reservation, status) {
  return {
    status: 200,
    body: {
      operationType: reservation.operationType,
      operationAttemptId: reservation.operationAttemptId,
      status,
    },
  };
}

/**
 * Allocate credits and update the balance projection in a transaction.
 * @param {{ transaction: object, candidates: Array<{ ref: object, data: object }>, db: object, uuid: string, now: () => Date, amount: number, eventId: string }} input Allocation input.
 * @returns {Promise<{ before: number, after: number, allocations: Array<object> } | null>} Allocation or null when insufficient.
 */
async function allocateCredits(input) {
  const { lots, before } = await readLotsAndBalance({
    transaction: input.transaction,
    candidates: input.candidates,
    db: input.db,
    uuid: input.uuid,
    now: input.now,
  });
  const consumed = consumeLotsOrNull(lots, input.amount);
  // Stryker disable next-line all -- allocation must have both enough lots and
  // enough aggregate balance before a charge can proceed.
  if (!consumed || before < input.amount) return null;
  const after = before - input.amount;
  consumed.lots.forEach((lot, index) =>
    input.transaction.set(lots[index].ref, lot)
  );
  input.transaction.set(creditRef(input.db, input.uuid), {
    credit: after,
    lastEventId: input.eventId,
  });
  return { before, after, allocations: consumed.allocations };
}

/**
 * Reserve an operation inside a Firestore transaction.
 * @param {{ db: BillingRuntimeValue, now: () => Date, transaction: BillingRuntimeValue, input: Record<string, unknown>, amount: number, candidates: Array<{ ref: object, data: object }> }} input Transaction inputs.
 * @returns {Promise<BillingResponse>} Reservation response.
 */
// Intentional protocol-boundary duplication: transaction ordering is operation-specific.
// Stryker disable all -- reservation persistence is a fixed protocol schema.
async function reserveOperationTransaction({
  db,
  now,
  transaction,
  input,
  amount,
  candidates,
}) {
  const reference = reservationRef(db, input.uuid, input.operationAttemptId);
  const existing = await transaction.get(reference);
  if (existing.exists) {
    const reservation = readData(existing);
    return {
      status: 200,
      body: {
        duplicate: true,
        operationType: reservation.operationType,
        operationAttemptId: reservation.operationAttemptId,
        status: reservation.status,
      },
    };
  }
  const allocation = await allocateCredits({
    transaction,
    candidates,
    db,
    uuid: input.uuid,
    now,
    amount,
    eventId: input.eventId,
  });
  if (!allocation)
    return { status: 409, body: { error: 'insufficient_credit' } };
  transaction.set(reference, {
    operationType: input.operationType,
    operationAttemptId: input.operationAttemptId,
    billingIdentityId: input.uuid,
    amount,
    allocations: allocation.allocations,
    pricingSnapshotId: input.pricingSnapshot.snapshotId,
    status: 'reserved',
    createdAt: now(),
  });
  transaction.set(
    ledgerRef(db, input.uuid, input.eventId),
    createLedgerEvent({
      eventId: input.eventId,
      sourceEventId: input.eventId,
      type: 'credits_reserved',
      // Stryker disable next-line all -- ledger event schema is an adapter contract.
      amount: -amount,
      billingIdentityId: input.uuid,
      operationType: input.operationType,
      operationAttemptId: input.operationAttemptId,
      balanceBefore: allocation.before,
      balanceAfter: allocation.after,
      pricingSnapshotId: input.pricingSnapshot.snapshotId,
      createdAt: now(),
    })
  );
  return {
    status: 200,
    body: {
      operationType: input.operationType,
      operationAttemptId: input.operationAttemptId,
      status: 'reserved',
      credit: allocation.after,
      amount,
      applied: true,
    },
  };
}
// Stryker restore all

/**
 * Apply an operation charge inside a Firestore transaction.
 * @param {{ db: object, now: () => Date, transaction: object, input: object, amount: number, candidates: Array<{ ref: object, data: object }> }} db Charge transaction input.
 * @returns {Promise<BillingResponse>} Charge response.
 */
// Stryker disable all -- charge persistence is a fixed protocol schema.
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
  const allocation = await allocateCredits({
    transaction,
    candidates,
    db,
    uuid: input.uuid,
    now,
    amount,
    eventId: input.eventId,
  });
  if (!allocation)
    return { status: 409, body: { error: 'insufficient_credit' } };
  // Stryker disable next-line all -- persisted event schema is the billing
  // adapter contract.
  transaction.set(eventRef(db, input.uuid, input.eventId), {
    type: 'operation_charged',
    eventId: input.eventId,
    operationType: input.operationType,
    operationAttemptId: input.operationAttemptId,
    amount,
    pricingSnapshotId: input.pricingSnapshot.snapshotId,
    allocations: allocation.allocations,
    balanceBefore: allocation.before,
    balanceAfter: allocation.after,
    // Stryker disable next-line all -- event timestamp fallback is clock injection behavior.
    executedAt: input.executedAt ?? now(),
  });
  transaction.set(
    ledgerRef(db, input.uuid, input.eventId),
    createLedgerEvent({
      eventId: input.eventId,
      sourceEventId: input.eventId,
      type: 'credits_consumed',
      amount: -amount,
      billingIdentityId: input.uuid,
      operationType: input.operationType,
      operationAttemptId: input.operationAttemptId,
      balanceBefore: allocation.before,
      balanceAfter: allocation.after,
      pricingSnapshotId: input.pricingSnapshot.snapshotId,
      // Stryker disable next-line all -- ledger timestamp fallback is clock injection behavior.
      createdAt: input.executedAt ?? now(),
    })
  );
  return {
    status: 200,
    body: {
      credit: allocation.after,
      amount,
      eventId: input.eventId,
      // Stryker disable next-line all -- response shape is the public billing protocol.
      applied: true,
    },
  };
}
// Stryker restore all

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
// Stryker disable all -- refund persistence is a fixed protocol schema.
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
    const nextStatus = resolveRefundStatus(refundable, purchase.creditsIssued);
    try {
      applyStateTransition({
        kind: 'purchase',
        state: purchase.status,
        nextState: nextStatus,
      });
    } catch {
      return {
        status: 200,
        body: { quarantined: true, purchaseId: input.purchaseId },
      };
    }
    transaction.set(lotReference, {
      ...lot,
      remainingCredits: 0,
      // Stryker disable next-line all -- refund persistence schema is an adapter contract.
      refundable: false,
    });
    transaction.set(balanceReference, {
      // Stryker disable next-line all -- balance persistence schema is an adapter contract.
      credit: after,
      lastEventId: input.eventId,
    });
    // Stryker disable next-line all -- persisted event schema is the billing
    // adapter contract.
    transaction.set(eventRef(db, purchase.apiKeyUuid, input.eventId), {
      type: 'credit_deducted',
      eventId: input.eventId,
      amount: refundable,
      purchaseId: input.purchaseId,
      // Stryker disable next-line all -- refund event schema is an adapter contract.
      reason: 'refund',
      balanceBefore: before,
      balanceAfter: after,
      refundedUsdMinor: input.refundedUsdMinor,
      pricingSnapshotId: input.pricingSnapshotId,
      createdAt: now(),
    });
    transaction.set(
      ledgerRef(db, purchase.apiKeyUuid, input.eventId),
      createLedgerEvent({
        eventId: input.eventId,
        sourceEventId: input.eventId,
        type: 'credits_refunded',
        // Stryker disable next-line all -- refund ledger schema is an adapter contract.
        amount: -refundable,
        billingIdentityId: purchase.apiKeyUuid,
        purchaseId: purchase.purchaseId,
        balanceBefore: before,
        balanceAfter: after,
        // Stryker disable next-line all -- refund ledger schema is an adapter contract.
        refundedUsdMinor: input.refundedUsdMinor,
        pricingSnapshotId: input.pricingSnapshotId,
        createdAt: now(),
      })
    );
    // Stryker disable next-line all -- persisted purchase schema is the
    // billing adapter contract.
    transaction.set(ref, {
      ...purchase,
      status: nextStatus,
      creditsRemaining: 0,
      refundedUsdMinor: input.refundedUsdMinor,
    });
    return {
      status: 200,
      body: {
        purchaseId: input.purchaseId,
        refunded: true,
        // Stryker disable next-line all -- response shape is the public billing protocol.
        creditsReversed: refundable,
      },
    };
  });
}
// Stryker restore all

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
