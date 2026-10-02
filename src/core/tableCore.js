/**
 * Compare validated table cells using their numeric or lexical logical type.
 * @param {string | number} left First cell value.
 * @param {string | number} right Second cell value.
 * @param {string} [type] Explicit column type; absent type retains lexical ordering.
 * @returns {number} Comparison suitable for stable multi-column sorting.
 */
export function compareTableValues(left, right, type) {
  const compare = comparators.get(type) || compareLexically;
  return compare(left, right);
}

/**
 * Compare supported cell values using the original relational ordering.
 * @param {string | number} left First cell.
 * @param {string | number} right Second cell.
 * @returns {number} Lexical comparison result.
 */
function compareLexically(left, right) {
  return greaterThan(left, right) - greaterThan(right, left);
}

/**
 * Express one direction of relational ordering as a numeric indicator.
 * @param {string | number} left First value.
 * @param {string | number} right Second value.
 * @returns {number} One for greater, zero otherwise.
 */
function greaterThan(left, right) {
  if (left > right) return 1;
  return 0;
}
/** @type {Map<string | undefined, (left: string | number, right: string | number) => number>} */
const comparators = new Map([
  [
    'number',
    (left, right) =>
      /** @type {number} */ (left) - /** @type {number} */ (right),
  ],
]);
