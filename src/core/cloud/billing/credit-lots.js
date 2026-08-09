import {
  calculateRefundUsdMinor as calculateRefundUsdMinorCore,
  consumeCreditLots as consumeCreditLotsCore,
  isUntouchedLot as isUntouchedLotCore,
} from './credit-lots-core.js';

/**
 * @param {Parameters<typeof consumeCreditLotsCore>[0]} lots @param {Parameters<typeof consumeCreditLotsCore>[1]} amount
 * @param amount
 */
export const consumeCreditLots = (lots, amount) =>
  consumeCreditLotsCore(lots, amount);

/** @param {Parameters<typeof isUntouchedLotCore>[0]} lot */
export const isUntouchedLot = lot => isUntouchedLotCore(lot);

/**
 * @param {Parameters<typeof calculateRefundUsdMinorCore>[0]} lot @param {Parameters<typeof calculateRefundUsdMinorCore>[1]} originalAmountUsdMinor @param {Parameters<typeof calculateRefundUsdMinorCore>[2]} currentCreditsPerUsd
 * @param originalAmountUsdMinor
 * @param currentCreditsPerUsd
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
