/** @typedef {import('../../core/local/test-partitions.js').PositiveTestShardSize} PositiveTestShardSize */

/**
 * Interpret an unparsed shard bound using the established default200 policy.
 * No coercion or new safe-integer restriction: every positive integer is valid.
 * The predicate/default prove positivity before the erased trusted-input brand.
 * @param {unknown} value Unparsed dependency value, after any wrapper conversion.
 * @returns {PositiveTestShardSize} Proven progress bound or the original default.
 */
export function parseTestShardSize(value) {
  const size =
    Number.isInteger(value) && /** @type {number} */ (value) > 0 ? value : 200;
  return /** @type {PositiveTestShardSize} */ (size);
}
