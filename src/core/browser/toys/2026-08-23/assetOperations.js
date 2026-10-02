/** Canonical order of operations that move or occupy a rental asset. */
export const ASSET_OPERATIONS = Object.freeze([
  'delivery-outbound',
  'possession',
  'pickup-return',
  'inspection',
  'cleaning',
]);
