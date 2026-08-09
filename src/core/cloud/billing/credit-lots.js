import {
  calculateRefundUsdMinor as calculateRefundUsdMinorCore,
  consumeCreditLots as consumeCreditLotsCore,
  isUntouchedLot as isUntouchedLotCore,
} from './credit-lots-core.js';

/**
 * @param {Parameters<typeof consumeCreditLotsCore>[0]} lots Credit lots.
 * @param {Parameters<typeof consumeCreditLotsCore>[1]} amount Credit amount.
 * @returns {ReturnType<typeof consumeCreditLotsCore>} Consumed lots.
 */
export const consumeCreditLots = (lots, amount) =>
  consumeCreditLotsCore(lots, amount);

/**
 * @param {Parameters<typeof isUntouchedLotCore>[0]} lot Credit lot.
 * @returns {ReturnType<typeof isUntouchedLotCore>} Whether untouched.
 */
export const isUntouchedLot = lot => isUntouchedLotCore(lot);

/**
 * @param {Parameters<typeof calculateRefundUsdMinorCore>[0]} lot Credit lot.
 * @param {Parameters<typeof calculateRefundUsdMinorCore>[1]} originalAmountUsdMinor Original amount.
 * @param {Parameters<typeof calculateRefundUsdMinorCore>[2]} currentCreditsPerUsd Current rate.
 * @returns {ReturnType<typeof calculateRefundUsdMinorCore>} Refund amount.
 */
export const calculateRefundUsdMinor = (
  lot,
  originalAmountUsdMinor,
  currentCreditsPerUsd
) =>
  calculateRefundUsdMinorCore(
    lot,
    originalAmountUsdMinor,
    currentCreditsPerUsd
  );
