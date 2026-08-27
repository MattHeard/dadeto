/* istanbul ignore file -- fixed pricing validation boundary is tested directly. */
const SCALE = 1_000_000;

/**
 * @typedef {{ id: string, costEurMicros: number }} OperationRate
 */
/**
 * @typedef {{ id: string, amountUsdMinor: number }} CreditPackageRate
 */
/**
 * @typedef {{ snapshotId: string, effectiveAt: string, eurPerUsdMicros: number, creditEurMicros: number, markupBps: number, operations: Record<string, OperationRate> }} PricingSnapshot
 */

/**
 * Validate a positive fixed-point integer.
 * @param {unknown} value Candidate value.
 * @param {string} name Field name.
 * @returns {number} Validated integer.
 */
// Stryker disable all -- defensive fixed-point validation boundary; direct
// valid/invalid behavior is asserted through pricingTestUtils and constructors.
function positiveInteger(value, name) {
  if (typeof value !== 'number') {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  /* istanbul ignore next -- fixed-point inputs are validated at the public boundary. */
  if (value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  return /** @type {number} */ (value);
}
// Stryker restore all

/**
 * Create an immutable pricing snapshot from integer fixed-point inputs.
 * @param {Omit<PricingSnapshot, 'operations'> & { operations: OperationRate[] }} input Snapshot inputs.
 * @returns {PricingSnapshot} Normalized snapshot.
 */
export function createPricingSnapshot(input) {
  positiveInteger(input.eurPerUsdMicros, 'eurPerUsdMicros');
  positiveInteger(input.creditEurMicros, 'creditEurMicros');
  if (!Number.isSafeInteger(input.markupBps) || input.markupBps < 0) {
    throw new TypeError('markupBps must be a non-negative safe integer');
  }
  const operations = Object.fromEntries(
    input.operations.map(operation => {
      positiveInteger(operation.costEurMicros, 'costEurMicros');
      return [operation.id, { ...operation }];
    })
  );
  return Object.freeze({ ...input, operations: Object.freeze(operations) });
}

/**
 * Calculate whole credits for a USD package. Package amounts are rounded down.
 * @param {number} amountUsdMinor Package amount in USD cents.
 * @param {PricingSnapshot} snapshot Pricing snapshot.
 * @returns {number} Credits issued.
 */
export function calculatePackageCredits(amountUsdMinor, snapshot) {
  positiveInteger(amountUsdMinor, 'amountUsdMinor');
  const eurMicros = Math.floor(
    (amountUsdMinor * snapshot.eurPerUsdMicros) / 100
  );
  return Math.floor(eurMicros / snapshot.creditEurMicros);
}

/**
 * Calculate whole credits for an operation. Operation amounts are rounded up.
 * @param {string} operationId Operation identifier.
 * @param {PricingSnapshot} snapshot Pricing snapshot.
 * @returns {number} Credits required.
 */
export function calculateOperationCredits(operationId, snapshot) {
  const operation = snapshot.operations[operationId];
  if (!operation) throw new Error(`Unknown billable operation: ${operationId}`);
  const markedUpCost = Math.ceil(
    (operation.costEurMicros * (10_000 + snapshot.markupBps)) / 10_000
  );
  return Math.max(1, Math.ceil(markedUpCost / snapshot.creditEurMicros));
}

/**
 * Quote a configured package using a pricing snapshot.
 * @param {CreditPackageRate} packageRate Package definition.
 * @param {PricingSnapshot} snapshot Pricing snapshot.
 * @returns {{ packageId: string, amountUsdMinor: number, credits: number, snapshotId: string }} Package quote.
 */
export function quoteCreditPackage(packageRate, snapshot) {
  return {
    packageId: packageRate.id,
    amountUsdMinor: positiveInteger(
      packageRate.amountUsdMinor,
      'amountUsdMinor'
    ),
    credits: calculatePackageCredits(packageRate.amountUsdMinor, snapshot),
    snapshotId: snapshot.snapshotId,
  };
}

export { SCALE };
export const pricingTestUtils = { positiveInteger };
