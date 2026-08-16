const PARTIALLY_REFUNDED = 'partially_refunded';
const NEEDS_RECOVERY = 'needs_recovery';

/** @type {Record<string, string[]>} */
const PURCHASE_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['paid', 'expired']),
  paid: Object.freeze(['partially_refunded', 'refunded']),
  [PARTIALLY_REFUNDED]: Object.freeze(['refunded']),
  refunded: Object.freeze([]),
  expired: Object.freeze([]),
});

/** @type {Record<string, string[]>} */
const OPERATION_TRANSITIONS = Object.freeze({
  quoted: Object.freeze(['reserved']),
  reserved: Object.freeze(['settled', 'released', 'needs_recovery']),
  [NEEDS_RECOVERY]: Object.freeze(['settled', 'released']),
  settled: Object.freeze([]),
  released: Object.freeze([]),
});

/**
 * Check whether a purchase transition is permitted.
 * @param {string} from Current state.
 * @param {string} to Requested state.
 * @returns {boolean} Whether the transition is valid.
 */
export function canTransitionPurchase(from, to) {
  return canTransition(PURCHASE_TRANSITIONS, from, to);
}

/**
 * Check whether an operation transition is permitted.
 * @param {string} from Current state.
 * @param {string} to Requested state.
 * @returns {boolean} Whether the transition is valid.
 */
export function canTransitionOperation(from, to) {
  return canTransition(OPERATION_TRANSITIONS, from, to);
}

/**
 * @param {Record<string, string[]>} transitions Transition map.
 * @param {string} from Current state.
 * @param {string} to Next state.
 * @returns {boolean} Whether the transition is valid.
 */
function canTransition(transitions, from, to) {
  return transitions[from]?.includes(to) ?? false;
}

/**
 * Validate and apply a state transition.
 * @param {{ state: string, nextState: string, kind: 'purchase'|'operation' }} input Transition input.
 * @returns {{ state: string, previousState: string }} Transition result.
 */
export function applyStateTransition(input) {
  let allowed;
  if (input.kind === 'purchase')
    allowed = canTransitionPurchase(input.state, input.nextState);
  else allowed = canTransitionOperation(input.state, input.nextState);
  if (!allowed)
    throw new Error(
      `Invalid ${input.kind} transition: ${input.state} -> ${input.nextState}`
    );
  return { state: input.nextState, previousState: input.state };
}

/**
 * Create an immutable append-only ledger event.
 * @param {Record<string, unknown>} input Event fields.
 * @returns {Record<string, unknown>} Normalized event.
 */
export function createLedgerEvent(input) {
  if (typeof input.eventId !== 'string' || !input.eventId)
    throw new TypeError('eventId is required');
  if (typeof input.type !== 'string' || !input.type)
    throw new TypeError('type is required');
  if (!Number.isSafeInteger(input.amount))
    throw new TypeError('amount must be a safe integer');
  if (typeof input.billingIdentityId !== 'string' || !input.billingIdentityId)
    throw new TypeError('billingIdentityId is required');
  return Object.freeze({ ...input, immutable: true });
}

/**
 * Verify conservation of a ledger against a reported balance.
 * @param {Array<{ amount?: number }>} events Ledger events.
 * @param {number} balance Reported balance.
 * @returns {{ valid: boolean, calculated: number, balance: number }} Result.
 */
export function verifyLedgerBalance(events, balance) {
  const calculated = events.reduce(
    (sum, event) => sum + Number(event.amount ?? 0),
    0
  );
  return {
    valid: calculated === balance && calculated >= 0,
    calculated,
    balance,
  };
}

export const billingProtocolTestUtils = {
  PURCHASE_TRANSITIONS,
  OPERATION_TRANSITIONS,
};
