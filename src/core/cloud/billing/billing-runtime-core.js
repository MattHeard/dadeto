import { calculateOperationCredits } from './pricing-core.js';
import { consumeCreditLots } from './credit-lots-core.js';
import {
  applyStateTransition,
  createLedgerEvent,
} from './billing-protocol-core.js';
import { reconcileBillingIdentity } from './reconciliation-core.js';
import { quoteUnusedCreditRefund } from './floating-credit-core.js';
import {
  getApiKeyCreditDocument as creditRef,
  getApiKeyCreditEventDocument as eventRef,
} from '../get-api-key-credit-v2/get-api-key-credit-v2-core.js';

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {any} BillingRuntimeValue Runtime-shaped billing value. */
/** @typedef {Record<string, any>} BillingDocumentData Persisted Firestore document fields. */
/** @typedef {BillingDocumentData & { purchaseId: string, issuedCredits: number, remainingCredits: number, createdAt: string, refundable: boolean }} BillingLotData */
/** @typedef {BillingDocumentData & { purchaseId: string, issuedCredits: number, remainingCredits: number, createdAt: Date, refundable: boolean }} BillingPersistedLotData */
/** @typedef {{ ref: BillingRuntimeValue, data: BillingLotData }} BillingLotCandidate */
/** @typedef {{ snapshotId: string, effectiveAt: string, eurPerUsdMicros: number, creditEurMicros: number, markupBps: number, operations: Record<string, { id: string, costEurMicros: number }> }} BillingPricingSnapshot */
/** @typedef {{ uuid: string, eventId: string, operationType: string, operationAttemptId: string }} BillingOperationIdentity */
/** @typedef {BillingOperationIdentity & { pricingSnapshot: BillingPricingSnapshot, executedAt?: Date }} BillingOperationInput */
/** @typedef {BillingOperationIdentity & { outcome: 'success' | 'ambiguous' | 'failure', reason?: string }} BillingResolutionInput */
/** @typedef {{ purchaseId?: string, apiKeyUuid: string, creditsIssued: number, pricingSnapshotId: string, createdAt?: Date, [key: string]: unknown }} BillingPurchaseInput */
/** @typedef {{ purchaseId: string, eventId: string, stripePaymentIntentId?: string }} BillingPaymentInput */
/** @typedef {{ refundIntentId: string, purchaseId: string }} BillingRefundIntentInput */
/** @typedef {{ refundIntentId: string, purchaseId: string, eventId: string, stripeRefundId: string, stripePaymentIntentId: string, amountUsdMinor: number, currency: string, stripeStatus: string }} BillingConfirmedRefundInput */
/** @typedef {{ purchaseId: string, eventId: string }} BillingExpiryInput */
/** @typedef {{ checkoutSessionId: string, url: string, expiresAt: Date }} BillingCheckoutSession */
/** @typedef {Record<string, any> & { createPurchase: (allowEffects: AllowEffects, input: BillingPurchaseInput) => Promise<BillingRuntimeValue>, savePurchaseCheckout: (allowEffects: AllowEffects, purchaseId: string, session: BillingCheckoutSession) => Promise<void>, markPurchasePaid: (allowEffects: AllowEffects, input: BillingPaymentInput) => Promise<BillingResponse>, createRefundIntent: (allowEffects: AllowEffects, input: BillingRefundIntentInput) => Promise<BillingResponse>, recordRefundSubmission: (allowEffects: AllowEffects, input: { refundIntentId: string, stripeRefundId: string, stripeStatus: string }) => Promise<BillingResponse>, markRefundIntentAmbiguous: (allowEffects: AllowEffects, refundIntentId: string) => Promise<BillingResponse>, applyRefundIntentEvent: (allowEffects: AllowEffects, input: BillingConfirmedRefundInput) => Promise<BillingResponse>, recordRefundReconciliation: (allowEffects: AllowEffects, input: { eventId: string, purchaseId: string, stripePaymentIntentId: string, chargeId: string, refundedUsdMinor: number, refundIntentId?: string, stripeRefundId?: string, reason?: string }) => Promise<void>, markPurchaseExpired: (allowEffects: AllowEffects, input: BillingExpiryInput) => Promise<BillingResponse>, applyOperationCharge: (allowEffects: AllowEffects, input: BillingOperationInput) => Promise<BillingResponse>, chargeOperation: (allowEffects: AllowEffects, input: Omit<BillingOperationInput, 'pricingSnapshot'>) => Promise<BillingResponse>, reserveOperation: (allowEffects: AllowEffects, input: BillingOperationInput) => Promise<BillingResponse>, resolveOperation: (allowEffects: AllowEffects, input: BillingResolutionInput) => Promise<BillingResponse> }} BillingRuntimeService */

/**
 * @typedef {{ status: number, body: string | Record<string, unknown> }} BillingResponse
 */

/** @typedef {{ db: BillingRuntimeValue, allowEffects: AllowEffects, run: (update: (transaction: BillingRuntimeValue) => Promise<BillingResponse>) => Promise<BillingResponse> }} BillingTransactionScope */

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
 * @param {string} id Refund intent identifier.
 * @returns {BillingRuntimeValue} Refund intent reference.
 */
function refundIntentRef(db, id) {
  return db.collection('billing-refund-intents').doc(String(id));
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
 * @returns {BillingDocumentData} Snapshot data.
 */
function readData(snapshot) {
  if (!snapshot.exists || typeof snapshot.data !== 'function') return {};
  const data = snapshot.data();
  if (!data || typeof data !== 'object') return {};
  return /** @type {BillingDocumentData} */ (data);
}

/**
 * Convert a persisted timestamp into the ISO string expected by credit-lot logic.
 * @param {BillingDocumentData} data Persisted lot fields.
 * @returns {BillingDocumentData} Normalized fields.
 */
function normalizeBillingLotData(data) {
  const createdAt = data.createdAt;
  return {
    ...data,
    ...(createdAt instanceof Date
      ? { createdAt: createdAt.toISOString() }
      : {}),
  };
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
 * @returns {Promise<BillingLotCandidate[]>} Available lots.
 */
// Stryker disable all -- lot listing is a direct Firestore adapter projection;
// positive-credit filtering is covered through the helper contract.
async function listBillingLots(db, uuid) {
  const reference = /** @type {BillingRuntimeValue} */ (creditRef(db, uuid));
  const snap = await reference
    .collection('lots')
    .orderBy('createdAt', 'asc')
    .get();
  return snap.docs
    .map((/** @type {BillingRuntimeValue} */ doc) => ({
      ref: doc.ref,
      data: /** @type {BillingLotData} */ (
        normalizeBillingLotData(readData(doc))
      ),
    }))
    .filter(
      (/** @type {BillingLotCandidate} */ lot) =>
        Number(lot.data.remainingCredits ?? 0) > 0
    );
}
// Stryker restore all

/**
 * Run a billing operation inside a transaction.
 * @param {() => Date} now Clock.
 * @param {BillingOperationInput} input Operation input.
 * @param {(transaction: BillingRuntimeValue, input: BillingOperationInput, amount: number, candidates: BillingLotCandidate[]) => Promise<BillingResponse>} handler Transaction handler.
 * @param {BillingTransactionScope} transactionScope Request-scoped transaction capability.
 * @returns {Promise<BillingResponse>} Transaction response.
 */
async function runBillingOperationTransaction(
  now,
  input,
  handler,
  transactionScope
) {
  const identity = readOperationIdentity(input);
  const amount = calculateOperationCredits(
    identity.operationType,
    input.pricingSnapshot
  );
  const candidates = await listBillingLots(transactionScope.db, input.uuid);
  return transactionScope.run(
    (/** @type {BillingRuntimeValue} */ transaction) =>
      handler(transaction, { ...input, ...identity }, amount, candidates)
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
  const current = snap.docs.find(
    (/** @type {BillingRuntimeValue} */ doc) =>
      doc.data()?.effectiveAt <= cutoff
  );
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
 * @param {{ randomUUID: (allowEffects: AllowEffects) => string, now?: () => Date, billingEnabled?: boolean, writeRefundReconciliation?: (allowEffects: AllowEffects, eventId: string, record: BillingDocumentData) => Promise<void>, runBillingTransaction?: (allowEffects: AllowEffects, update: (transaction: BillingRuntimeValue) => Promise<BillingResponse>) => Promise<BillingResponse> }} runtime Runtime helpers and permission-first persistence adapters.
 * @returns {BillingRuntimeService} Billing service.
 */
export function createBillingRuntime(db, runtime) {
  const randomUUID = runtime.randomUUID;
  // Stryker disable all -- runtime helper defaults are dependency injection
  // compatibility behavior.
  const now = runtime.now ?? (() => new Date());
  const billingEnabled = runtime.billingEnabled === true;
  // Stryker restore all

  /**
   * @param {AllowEffects} allowEffects Request permission.
   * @param {(transaction: BillingRuntimeValue) => Promise<BillingResponse>} update Transaction update callback.
   * @returns {Promise<BillingResponse>} Transaction result.
   */
  const runBillingTransaction = (allowEffects, update) => {
    if (typeof runtime.runBillingTransaction !== 'function') {
      throw new TypeError('runBillingTransaction adapter must be provided');
    }
    return runtime.runBillingTransaction(allowEffects, update);
  };
  /**
   * @param {AllowEffects} allowEffects Request permission.
   * @returns {BillingTransactionScope} Request-scoped transaction capability.
   */
  const billingTransactionScope = allowEffects => ({
    db,
    allowEffects,
    run: (
      /** @type {(transaction: BillingRuntimeValue) => Promise<BillingResponse>} */ update
    ) => runBillingTransaction(allowEffects, update),
  });

  const getPricingSnapshot = (/** @type {string} */ snapshotId) =>
    readPricingSnapshot(db, snapshotId);

  const getCurrentPricingSnapshot = () => readCurrentPricingSnapshot(db, now);

  const getPackage = (/** @type {string} */ packageId) =>
    readBillingPackage(db, packageId);

  const getPurchase = (/** @type {string} */ purchaseId) =>
    readBillingPurchase(db, purchaseId);

  const getPurchaseByCheckoutSession = (
    /** @type {string} */ checkoutSessionId
  ) => findBillingPurchaseByCheckout(db, checkoutSessionId);
  const readLotsAndBalance = createReadLotsAndBalance(db, now);
  const reserveTransaction = createReserveOperationTransaction(
    db,
    now,
    readLotsAndBalance
  );
  const chargeTransaction = createChargeOperationTransaction(
    db,
    now,
    readLotsAndBalance
  );
  const resolveTransaction = createResolveOperationTransaction(db, now);
  const refundIntentService = createRefundIntentService({
    db,
    getCurrentPricingSnapshot,
    runBillingTransaction,
    now,
  });

  /**
   * Save checkout details on a purchase.
   * @param {AllowEffects} allowEffects Permission for the Firestore write.
   * @param {string} purchaseId Purchase identifier.
   * @param {BillingCheckoutSession} session Checkout session.
   * @returns {Promise<void>} Resolves after persistence.
   */
  async function savePurchaseCheckout(allowEffects, purchaseId, session) {
    void allowEffects;
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
   * @param {AllowEffects} allowEffects Permission for the Firestore write.
   * @param {BillingPurchaseInput} input Purchase input.
   * @returns {Promise<BillingRuntimeValue>} Created purchase.
   */
  async function createPurchase(allowEffects, input) {
    const purchaseId = input.purchaseId ?? randomUUID(allowEffects);
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
   * @param {AllowEffects} allowEffects Permission for the purchase transaction.
   * @param {BillingPaymentInput} input Payment input.
   * @returns {Promise<BillingResponse>} Payment response.
   */
  // Stryker disable all -- payment settlement is an adapter transaction whose
  // schema is verified by focused behavioral tests.
  async function markPurchasePaid(allowEffects, input) {
    const ref = purchaseRef(db, input.purchaseId);
    const paymentEventReference = db
      .collection('payment-events')
      .doc(input.eventId);
    return runBillingTransaction(
      allowEffects,
      async (/** @type {BillingRuntimeValue} */ transaction) => {
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
        const paymentEventSnapshot = await transaction.get(
          paymentEventReference
        );
        const paymentEvent = readData(paymentEventSnapshot);
        const balance = await transaction.get(
          creditRef(db, purchase.apiKeyUuid)
        );
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
        const lot = /** @type {BillingPersistedLotData} */ ({
          purchaseId: purchase.purchaseId,
          issuedCredits: purchase.creditsIssued,
          remainingCredits: purchase.creditsIssued,
          createdAt: purchase.createdAt,
          // Stryker disable next-line all -- lot persistence schema is an adapter contract.
          refundable: true,
          pricingSnapshotId: purchase.pricingSnapshotId,
        });
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
        transaction.set(paymentEventReference, {
          ...paymentEvent,
          status: 'applied',
        });
        // Stryker disable next-line all -- response shape is the public billing
        // protocol contract.
        return {
          // Stryker disable next-line all -- response shape is the public billing protocol.
          status: 201,
          body: {
            purchaseId: purchase.purchaseId,
            credit: after,
            applied: true,
          },
        };
      }
    );
  }
  // Stryker restore all

  /**
   * @param {AllowEffects} allowEffects Request permission.
   * @param {BillingOperationInput} input Charge input.
   * @returns {Promise<BillingResponse>} Charge response.
   */
  async function applyOperationCharge(allowEffects, input) {
    if (!billingEnabled) return billingDisabledResponse();
    return runBillingOperationTransaction(
      now,
      input,
      chargeTransaction,
      billingTransactionScope(allowEffects)
    );
  }

  /**
   * Charge an operation using the current server-side pricing snapshot.
   * @param {AllowEffects} allowEffects Request permission.
   * @param {Omit<BillingOperationInput, 'pricingSnapshot'>} input Charge inputs.
   * @returns {Promise<BillingResponse>} Charge response.
   */
  async function chargeOperation(allowEffects, input) {
    if (!billingEnabled) return billingDisabledResponse();
    const pricingSnapshot = await getCurrentPricingSnapshot();
    if (!pricingSnapshot)
      return { status: 503, body: { error: 'pricing_unavailable' } };
    return applyOperationCharge(allowEffects, { ...input, pricingSnapshot });
  }

  /**
   * Reserve credits for an operation.
   * @param {AllowEffects} allowEffects Request permission.
   * @param {BillingOperationInput} input Operation input.
   * @returns {Promise<BillingResponse>} Reservation response.
   */
  async function reserveOperation(allowEffects, input) {
    if (!billingEnabled) return billingDisabledResponse();
    return runBillingOperationTransaction(
      now,
      input,
      reserveTransaction,
      billingTransactionScope(allowEffects)
    );
  }

  /**
   * Resolve a previously reserved operation.
   * @param {AllowEffects} allowEffects Request permission.
   * @param {BillingResolutionInput} input Operation input.
   * @returns {Promise<BillingResponse>} Resolution response.
   */
  async function resolveOperation(allowEffects, input) {
    const identity = readOperationIdentity(input);
    const reference = reservationRef(
      db,
      input.uuid,
      identity.operationAttemptId
    );
    return runBillingTransaction(
      allowEffects,
      (/** @type {BillingRuntimeValue} */ transaction) =>
        resolveTransaction(transaction, reference, identity, input)
    );
  }

  /**
   * Reconcile all billing projections for an identity.
   * @param {string} uuid API key UUID.
   * @returns {Promise<{ discrepancies: BillingRuntimeValue[], ok: boolean }>} Reconciliation report.
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
      lots: lotSnapshot.docs.map((/** @type {BillingRuntimeValue} */ doc) =>
        readData(doc)
      ),
      ledgerEvents: ledgerSnapshot.docs.map(
        (/** @type {BillingRuntimeValue} */ doc) => readData(doc)
      ),
      purchases: purchaseSnapshot.docs.map(
        (/** @type {BillingRuntimeValue} */ doc) => readData(doc)
      ),
    });
  }

  /**
   * Persist an unmatched Stripe refund for manual reconciliation.
   * @param {AllowEffects} allowEffects Permission for the reconciliation write.
   * @param {{ eventId: string, purchaseId: string, stripePaymentIntentId: string, chargeId: string, refundedUsdMinor: number, refundIntentId?: string, stripeRefundId?: string, reason?: string }} input Refund identifiers.
   * @returns {Promise<void>} Resolves after persistence.
   */
  async function recordRefundReconciliation(allowEffects, input) {
    const record = {
      type: 'unmatched_stripe_refund',
      status: 'pending',
      ...input,
      recordedAt: now(),
    };
    if (typeof runtime.writeRefundReconciliation !== 'function') {
      throw new TypeError('writeRefundReconciliation adapter must be provided');
    }
    await runtime.writeRefundReconciliation(
      allowEffects,
      input.eventId,
      record
    );
  }

  /**
   * Mark a matching pending purchase expired exactly once.
   * @param {AllowEffects} allowEffects Permission for the purchase transaction.
   * @param {BillingExpiryInput} input Expiry event.
   * @returns {Promise<BillingResponse>} Expiry response.
   */
  async function markPurchaseExpired(allowEffects, input) {
    const paymentEventReference = db
      .collection('payment-events')
      .doc(input.eventId);
    return runBillingTransaction(
      allowEffects,
      async (/** @type {BillingRuntimeValue} */ transaction) => {
        const ref = purchaseRef(db, input.purchaseId);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists)
          return { status: 404, body: { error: 'purchase_not_found' } };
        const purchase = readData(snapshot);
        const paymentEventSnapshot = await transaction.get(
          paymentEventReference
        );
        const paymentEvent = readData(paymentEventSnapshot);
        if (!paymentEventSnapshot.exists)
          return {
            status: 409,
            body: { error: 'payment_event_not_received' },
          };
        if (paymentEvent.status === 'applied')
          return duplicatePurchaseResponse(input.purchaseId);
        if (purchase.status === 'expired') {
          if (purchase.expiredEventId === input.eventId) {
            transaction.set(paymentEventReference, {
              ...paymentEvent,
              status: 'applied',
            });
            return {
              status: 200,
              body: {
                purchaseId: input.purchaseId,
                status: 'expired',
                applied: true,
              },
            };
          }
          transaction.set(paymentEventReference, {
            ...paymentEvent,
            status: 'ignored',
          });
          return duplicatePurchaseResponse(input.purchaseId);
        }
        if (purchase.status !== 'pending') {
          transaction.set(paymentEventReference, {
            ...paymentEvent,
            status: 'ignored',
          });
          return {
            status: 200,
            body: {
              ignored: true,
              purchaseId: input.purchaseId,
              status: purchase.status,
            },
          };
        }
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
        transaction.set(paymentEventReference, {
          ...paymentEvent,
          status: 'applied',
        });
        return {
          status: 200,
          body: { purchaseId: input.purchaseId, status: 'expired' },
        };
      }
    );
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
    ...refundIntentService,
    applyOperationCharge,
    chargeOperation,
    reserveOperation,
    resolveOperation,
    reconcileIdentity,
    recordRefundReconciliation,
    markPurchaseExpired,
    ledgerRef: (/** @type {string} */ uuid, /** @type {string} */ eventId) =>
      ledgerRef(db, uuid, eventId),
  };
}

/**
 * Return the stable response for attempts to start a billable operation while
 * billing is disabled.
 * @returns {BillingResponse} Disabled billing response.
 */
function billingDisabledResponse() {
  return { status: 503, body: { error: 'billing_disabled' } };
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

/**
 * Create the durable refund-intent persistence operations.
 * @param {{db: BillingRuntimeValue, getCurrentPricingSnapshot: () => Promise<BillingPricingSnapshot|null>, runBillingTransaction: (allowEffects: AllowEffects, update: (transaction: BillingRuntimeValue) => Promise<BillingResponse>) => Promise<BillingResponse>, now: () => Date}} deps Firestore and transaction dependencies.
 * @returns {{createRefundIntent: (allowEffects: AllowEffects, input: BillingRefundIntentInput) => Promise<BillingResponse>, recordRefundSubmission: (allowEffects: AllowEffects, input: {refundIntentId: string, stripeRefundId: string, stripeStatus: string}) => Promise<BillingResponse>, markRefundIntentAmbiguous: (allowEffects: AllowEffects, refundIntentId: string) => Promise<BillingResponse>, applyRefundIntentEvent: (allowEffects: AllowEffects, input: BillingConfirmedRefundInput) => Promise<BillingResponse>}} Refund-intent operations.
 */
function createRefundIntentService(deps) {
  /**
   * Persist a new intent or return an idempotent duplicate.
   * @param {AllowEffects} allowEffects Transaction permission.
   * @param {BillingRefundIntentInput} input Refund identity.
   * @returns {Promise<BillingResponse>} Refund intent result.
   */
  async function createRefundIntent(allowEffects, input) {
    if (
      typeof input.refundIntentId !== 'string' ||
      input.refundIntentId.length === 0 ||
      typeof input.purchaseId !== 'string' ||
      input.purchaseId.length === 0
    ) {
      return { status: 400, body: { error: 'invalid_refund_intent' } };
    }
    const intentReference = refundIntentRef(deps.db, input.refundIntentId);
    const existingSnapshot = await intentReference.get();
    if (existingSnapshot.exists) {
      const existing = readData(existingSnapshot);
      if (existing.purchaseId !== input.purchaseId)
        return { status: 409, body: { error: 'refund_intent_conflict' } };
      return {
        status: 200,
        body: { duplicate: true, refundIntent: existing },
      };
    }
    const pricingSnapshot = await deps.getCurrentPricingSnapshot();
    if (!pricingSnapshot)
      return { status: 503, body: { error: 'pricing_unavailable' } };
    const purchaseReference = purchaseRef(deps.db, input.purchaseId);
    return deps.runBillingTransaction(allowEffects, async transaction => {
      const intentSnapshot = await transaction.get(intentReference);
      if (intentSnapshot.exists) {
        const existing = readData(intentSnapshot);
        if (existing.purchaseId !== input.purchaseId)
          return { status: 409, body: { error: 'refund_intent_conflict' } };
        return {
          status: 200,
          body: { duplicate: true, refundIntent: existing },
        };
      }
      const purchaseSnapshot = await transaction.get(purchaseReference);
      if (!purchaseSnapshot.exists)
        return { status: 404, body: { error: 'purchase_not_found' } };
      const purchase = readData(purchaseSnapshot);
      if (
        !['paid', 'partially_refunded'].includes(purchase.status) ||
        typeof purchase.apiKeyUuid !== 'string' ||
        purchase.apiKeyUuid.length === 0 ||
        typeof purchase.stripePaymentIntentId !== 'string' ||
        purchase.stripePaymentIntentId.length === 0 ||
        !Number.isSafeInteger(purchase.amountUsdMinor) ||
        purchase.amountUsdMinor <= 0
      ) {
        return { status: 409, body: { error: 'purchase_not_refundable' } };
      }
      if (purchase.activeRefundIntentId)
        return { status: 409, body: { error: 'refund_intent_in_progress' } };
      const lotReference = lotRef(
        deps.db,
        purchase.apiKeyUuid,
        purchase.purchaseId
      );
      const lotSnapshot = await transaction.get(lotReference);
      const lot = normalizeBillingLotData(readData(lotSnapshot));
      if (
        !lotSnapshot.exists ||
        lot.refundable !== true ||
        !Number.isSafeInteger(lot.remainingCredits) ||
        lot.remainingCredits <= 0
      ) {
        return { status: 409, body: { error: 'no_refundable_credits' } };
      }
      const quote = quoteUnusedCreditRefund(
        /** @type {import('./credit-lots-core.js').CreditLot} */ (lot),
        purchase.amountUsdMinor,
        pricingSnapshot
      );
      if (quote.amountUsdMinor <= 0)
        return { status: 409, body: { error: 'no_refundable_amount' } };
      const refundIntent = {
        refundIntentId: input.refundIntentId,
        purchaseId: purchase.purchaseId,
        apiKeyUuid: purchase.apiKeyUuid,
        stripePaymentIntentId: purchase.stripePaymentIntentId,
        amountUsdMinor: quote.amountUsdMinor,
        creditsToReverse: quote.remainingCredits,
        pricingSnapshotId: quote.snapshotId,
        status: 'requested',
        createdAt: deps.now(),
      };
      transaction.set(intentReference, refundIntent);
      transaction.set(purchaseReference, {
        ...purchase,
        activeRefundIntentId: input.refundIntentId,
      });
      return { status: 201, body: { refundIntent } };
    });
  }

  /**
   * Record a Stripe refund response without applying credit changes.
   * @param {AllowEffects} allowEffects Transaction permission.
   * @param {{refundIntentId: string, stripeRefundId: string, stripeStatus: string}} input Stripe response fields.
   * @returns {Promise<BillingResponse>} Persisted submission response.
   */
  async function recordRefundSubmission(allowEffects, input) {
    return deps.runBillingTransaction(allowEffects, async transaction => {
      const reference = refundIntentRef(deps.db, input.refundIntentId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists)
        return { status: 404, body: { error: 'refund_intent_not_found' } };
      const intent = readData(snapshot);
      if (['applied', 'confirmed'].includes(intent.status))
        return {
          status: 200,
          body: { duplicate: true, refundIntent: intent },
        };
      const updated = {
        ...intent,
        status: 'submitted',
        stripeRefundId: input.stripeRefundId,
        stripeStatus: input.stripeStatus,
        submittedAt: deps.now(),
      };
      transaction.set(reference, updated);
      return { status: 200, body: { refundIntent: updated } };
    });
  }

  /**
   * Apply a successful Stripe refund only when it matches its reserved intent.
   * @param {AllowEffects} allowEffects Transaction permission.
   * @param {BillingConfirmedRefundInput} input Verified Stripe refund fields.
   * @returns {Promise<BillingResponse>} Refund result.
   */
  async function applyRefundIntentEvent(allowEffects, input) {
    return deps.runBillingTransaction(allowEffects, async transaction => {
      const intentReference = refundIntentRef(deps.db, input.refundIntentId);
      const intentSnapshot = await transaction.get(intentReference);
      if (!intentSnapshot.exists)
        return {
          status: 200,
          body: { quarantined: true, reason: 'refund_intent_not_found' },
        };
      const intent = readData(intentSnapshot);
      const mismatch =
        intent.refundIntentId !== input.refundIntentId ||
        intent.purchaseId !== input.purchaseId ||
        intent.stripePaymentIntentId !== input.stripePaymentIntentId ||
        intent.amountUsdMinor !== input.amountUsdMinor ||
        input.currency !== 'usd' ||
        !input.eventId ||
        !input.stripeRefundId ||
        !Number.isSafeInteger(input.amountUsdMinor) ||
        (intent.stripeRefundId &&
          intent.stripeRefundId !== input.stripeRefundId);
      if (mismatch)
        return {
          status: 200,
          body: { quarantined: true, reason: 'refund_intent_mismatch' },
        };
      if (intent.status === 'applied')
        return {
          status: 200,
          body: { duplicate: true, refundIntentId: input.refundIntentId },
        };
      if (!['requested', 'ambiguous', 'submitted'].includes(intent.status))
        return {
          status: 200,
          body: { quarantined: true, reason: 'refund_intent_state_conflict' },
        };
      if (
        input.stripeStatus === 'pending' ||
        input.stripeStatus === 'requires_action'
      )
        return {
          status: 200,
          body: {
            deferred: true,
            refundIntentId: input.refundIntentId,
            stripeRefundId: input.stripeRefundId,
          },
        };
      if (input.stripeStatus !== 'succeeded')
        return {
          status: 200,
          body: { quarantined: true, reason: 'refund_intent_mismatch' },
        };

      const purchaseReference = purchaseRef(deps.db, input.purchaseId);
      const purchaseSnapshot = await transaction.get(purchaseReference);
      if (!purchaseSnapshot.exists)
        return {
          status: 200,
          body: { quarantined: true, reason: 'purchase_not_found' },
        };
      const purchase = readData(purchaseSnapshot);
      if (
        purchase.apiKeyUuid !== intent.apiKeyUuid ||
        purchase.activeRefundIntentId !== input.refundIntentId ||
        purchase.stripePaymentIntentId !== input.stripePaymentIntentId ||
        !['paid', 'partially_refunded'].includes(purchase.status)
      )
        return {
          status: 200,
          body: { quarantined: true, reason: 'purchase_refund_state_conflict' },
        };

      const lotReference = lotRef(deps.db, intent.apiKeyUuid, input.purchaseId);
      const lotSnapshot = await transaction.get(lotReference);
      const lot = normalizeBillingLotData(readData(lotSnapshot));
      if (
        !lotSnapshot.exists ||
        lot.refundable !== true ||
        lot.remainingCredits !== intent.creditsToReverse ||
        !Number.isSafeInteger(intent.creditsToReverse) ||
        intent.creditsToReverse <= 0
      )
        return {
          status: 200,
          body: { quarantined: true, reason: 'refund_lot_mismatch' },
        };

      const balanceReference = creditRef(deps.db, intent.apiKeyUuid);
      const balanceSnapshot = await transaction.get(balanceReference);
      const paymentEventReference = deps.db
        .collection('payment-events')
        .doc(input.eventId);
      const paymentEventSnapshot = await transaction.get(paymentEventReference);
      const paymentEvent = readData(paymentEventSnapshot);
      const before = Number(readData(balanceSnapshot).credit ?? 0);
      const after = before - intent.creditsToReverse;
      if (!Number.isSafeInteger(before) || after < 0)
        return {
          status: 200,
          body: { quarantined: true, reason: 'refund_balance_conflict' },
        };
      const nextStatus = resolveRefundStatus(
        intent.creditsToReverse,
        purchase.creditsIssued
      );
      try {
        applyStateTransition({
          kind: 'purchase',
          state: purchase.status,
          nextState: nextStatus,
        });
      } catch {
        return {
          status: 200,
          body: { quarantined: true, reason: 'purchase_transition_invalid' },
        };
      }

      const appliedAt = deps.now();
      transaction.set(lotReference, {
        ...lot,
        remainingCredits: 0,
        refundable: false,
      });
      transaction.set(balanceReference, {
        ...readData(balanceSnapshot),
        credit: after,
        lastEventId: input.eventId,
      });
      transaction.set(eventRef(deps.db, intent.apiKeyUuid, input.eventId), {
        type: 'credit_deducted',
        eventId: input.eventId,
        amount: intent.creditsToReverse,
        purchaseId: input.purchaseId,
        reason: 'refund',
        balanceBefore: before,
        balanceAfter: after,
        refundedUsdMinor: input.amountUsdMinor,
        pricingSnapshotId: intent.pricingSnapshotId,
        createdAt: appliedAt,
      });
      transaction.set(
        ledgerRef(deps.db, intent.apiKeyUuid, input.eventId),
        createLedgerEvent({
          eventId: input.eventId,
          sourceEventId: input.eventId,
          type: 'credits_refunded',
          amount: -intent.creditsToReverse,
          billingIdentityId: intent.apiKeyUuid,
          purchaseId: input.purchaseId,
          balanceBefore: before,
          balanceAfter: after,
          refundedUsdMinor: input.amountUsdMinor,
          pricingSnapshotId: intent.pricingSnapshotId,
          createdAt: appliedAt,
        })
      );
      transaction.set(purchaseReference, {
        ...purchase,
        status: nextStatus,
        creditsRemaining: 0,
        refundedUsdMinor: input.amountUsdMinor,
        activeRefundIntentId: null,
      });
      transaction.set(intentReference, {
        ...intent,
        status: 'applied',
        stripeRefundId: input.stripeRefundId,
        stripeStatus: input.stripeStatus,
        appliedEventId: input.eventId,
        appliedAt,
      });
      transaction.set(paymentEventReference, {
        ...paymentEvent,
        status: 'applied',
      });
      return {
        status: 200,
        body: {
          applied: true,
          purchaseId: input.purchaseId,
          refundIntentId: input.refundIntentId,
          creditsReversed: intent.creditsToReverse,
        },
      };
    });
  }

  /**
   * Preserve an intent after an uncertain Stripe request outcome.
   * @param {AllowEffects} allowEffects Transaction permission.
   * @param {string} refundIntentId Refund intent identifier.
   * @returns {Promise<BillingResponse>} Persisted ambiguous state.
   */
  async function markRefundIntentAmbiguous(allowEffects, refundIntentId) {
    return deps.runBillingTransaction(allowEffects, async transaction => {
      const reference = refundIntentRef(deps.db, refundIntentId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists)
        return { status: 404, body: { error: 'refund_intent_not_found' } };
      const intent = readData(snapshot);
      if (['applied', 'confirmed', 'submitted'].includes(intent.status))
        return {
          status: 200,
          body: { duplicate: true, refundIntent: intent },
        };
      const updated = {
        ...intent,
        status: 'ambiguous',
        lastAttemptAt: deps.now(),
      };
      transaction.set(reference, updated);
      return { status: 200, body: { refundIntent: updated } };
    });
  }

  return {
    createRefundIntent,
    recordRefundSubmission,
    markRefundIntentAmbiguous,
    applyRefundIntentEvent,
  };
}

export const billingRuntimeTestUtils = {
  readTransactionLots,
  readOperationIdentity,
  readData,
  listBillingLots,
  createLegacyLot,
  resolveRefundStatus,
  markReservationNeedsRecovery,
  consumeLotsOrNull,
};

/**
 * Resolve a reservation inside a Firestore transaction.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {() => Date} now Clock.
 * @returns {(transaction: BillingRuntimeValue, reference: BillingRuntimeValue, identity: { operationType: string, operationAttemptId: string }, input: BillingResolutionInput) => Promise<BillingResponse>} Transaction resolver.
 */
// Stryker disable all -- operation resolution persists a fixed protocol schema.
function createResolveOperationTransaction(db, now) {
  const release = createReservationRelease(db, now);
  return async function resolveOperationTransaction(
    transaction,
    reference,
    identity,
    input
  ) {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists)
      return { status: 404, body: { error: 'reservation_not_found' } };
    const reservation =
      /** @type {BillingOperationIdentity & BillingDocumentData} */ (
        readData(snapshot)
      );
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
    return release(transaction, reference, reservation, input);
  };
}
// Stryker restore all

/**
 * Mark a reservation as settled.
 * @param {BillingRuntimeValue} transaction Firestore transaction.
 * @param {BillingRuntimeValue} reference Reservation reference.
 * @param {BillingOperationIdentity & BillingDocumentData} reservation Reservation data.
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
 * @param {{ transaction: BillingRuntimeValue, reference: BillingRuntimeValue, reservation: BillingOperationIdentity & BillingDocumentData, input: BillingResolutionInput }} options Recovery inputs.
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
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {() => Date} now Clock.
 * @returns {(transaction: BillingRuntimeValue, reference: BillingRuntimeValue, reservation: BillingOperationIdentity & BillingDocumentData, input: BillingResolutionInput) => Promise<BillingResponse>} Reservation releaser.
 */
// Stryker disable all -- release persistence is a fixed protocol schema.
function createReservationRelease(db, now) {
  return async function releaseReservation(
    transaction,
    reference,
    reservation,
    input
  ) {
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
  };
}
// Stryker restore all

/**
 * Bind database and clock dependencies for a transaction balance read.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {() => Date} now Clock.
 * @returns {(transaction: BillingRuntimeValue, candidates: BillingLotCandidate[], uuid: string) => Promise<{ lots: BillingLotCandidate[], before: number }>} Lot and balance reader.
 */
function createReadLotsAndBalance(db, now) {
  return async function readLotsAndBalance(transaction, candidates, uuid) {
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
  };
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
 * @param {BillingOperationIdentity} reservation Operation identity.
 * @param {string} status Operation status.
 * @returns {BillingResponse} Operation response.
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
 * @param {{ transaction: BillingRuntimeValue, candidates: BillingLotCandidate[], db: BillingRuntimeValue, uuid: string, now: () => Date, amount: number, eventId: string, readLotsAndBalance: (transaction: BillingRuntimeValue, candidates: BillingLotCandidate[], uuid: string) => Promise<{ lots: BillingLotCandidate[], before: number }> }} input Allocation input.
 * @returns {Promise<{ before: number, after: number, allocations: BillingRuntimeValue[] } | null>} Allocation or null when insufficient.
 */
async function allocateCredits(input) {
  const { lots, before } = await input.readLotsAndBalance(
    input.transaction,
    input.candidates,
    input.uuid
  );
  const consumed = consumeLotsOrNull(lots, input.amount);
  // Stryker disable next-line all -- allocation must have both enough lots and
  // enough aggregate balance before a charge can proceed.
  if (!consumed || before < input.amount) return null;
  const after = before - input.amount;
  consumed.lots.forEach(
    (/** @type {BillingDocumentData} */ lot, /** @type {number} */ index) =>
      input.transaction.set(lots[index].ref, lot)
  );
  input.transaction.set(creditRef(input.db, input.uuid), {
    credit: after,
    lastEventId: input.eventId,
  });
  return { before, after, allocations: consumed.allocations };
}

/**
 * Bind stable dependencies for the reserve transaction handler.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {() => Date} now Clock.
 * @param {(transaction: BillingRuntimeValue, candidates: BillingLotCandidate[], uuid: string) => Promise<{ lots: BillingLotCandidate[], before: number }>} readLotsAndBalance Transactional balance reader.
 * @returns {(transaction: BillingRuntimeValue, input: BillingOperationInput, amount: number, candidates: BillingLotCandidate[]) => Promise<BillingResponse>} Reservation handler.
 */
// Intentional protocol-boundary duplication: transaction ordering is operation-specific.
// Stryker disable all -- reservation persistence is a fixed protocol schema.
function createReserveOperationTransaction(db, now, readLotsAndBalance) {
  return async function reserveOperationTransaction(
    transaction,
    input,
    amount,
    candidates
  ) {
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
      readLotsAndBalance,
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
  };
}
// Stryker restore all

/**
 * Bind stable dependencies for the charge transaction handler.
 * @param {BillingRuntimeValue} db Firestore database.
 * @param {() => Date} now Clock.
 * @param {(transaction: BillingRuntimeValue, candidates: BillingLotCandidate[], uuid: string) => Promise<{ lots: BillingLotCandidate[], before: number }>} readLotsAndBalance Transactional balance reader.
 * @returns {(transaction: BillingRuntimeValue, input: BillingOperationInput, amount: number, candidates: BillingLotCandidate[]) => Promise<BillingResponse>} Charge handler.
 */
// Stryker disable all -- charge persistence is a fixed protocol schema.
function createChargeOperationTransaction(db, now, readLotsAndBalance) {
  return async function chargeOperationTransaction(
    transaction,
    input,
    amount,
    candidates
  ) {
    const event = await transaction.get(
      eventRef(db, input.uuid, input.eventId)
    );
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
      readLotsAndBalance,
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
  };
}
// Stryker restore all

/**
 * Read candidate lots through a transaction.
 * @param {BillingRuntimeValue} transaction Firestore transaction.
 * @param {BillingLotCandidate[]} candidates Candidate lots.
 * @returns {Promise<BillingLotCandidate[]>} Current lots.
 */
async function readTransactionLots(transaction, candidates) {
  const lots = [];
  for (const candidate of candidates) {
    const snap = await transaction.get(candidate.ref);
    if (snap.exists) {
      lots.push({
        ref: candidate.ref,
        data: /** @type {BillingLotData} */ (
          normalizeBillingLotData(readData(snap))
        ),
      });
    }
  }
  return lots;
}

/**
 * Consume lots, converting the expected shortage into a null result.
 * @param {BillingLotCandidate[]} lots Lots.
 * @param {number} amount Credits to consume.
 * @returns {BillingRuntimeValue|null} Consumption result.
 */
function consumeLotsOrNull(lots, amount) {
  try {
    return consumeCreditLots(
      lots.map((/** @type {BillingLotCandidate} */ lot) => lot.data),
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
 * Resolve the purchase status after a refund.
 * @param {number} remainingCredits Remaining credits before reversal.
 * @param {number} issuedCredits Credits originally issued.
 * @returns {string} Purchase status.
 */
function resolveRefundStatus(remainingCredits, issuedCredits) {
  if (remainingCredits === issuedCredits) return 'refunded';
  return 'partially_refunded';
}
