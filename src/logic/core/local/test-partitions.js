/** @typedef {number & {readonly positiveTestShardSize: unique symbol}} PositiveTestShardSize */

/**
 * Split test paths into serial process-sized groups.
 * @param {readonly string[]} tests Sorted unit-test paths.
 * @param {PositiveTestShardSize} shardSize Maximum tests in each process.
 * @returns {string[][]} Ordered unit-test shards.
 */
export function partitionTests(tests, shardSize) {
  const shards = [];
  for (let index = 0; index < tests.length; index += shardSize) {
    shards.push(tests.slice(index, index + shardSize));
  }
  return shards;
}
