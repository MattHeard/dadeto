/** @typedef {{start?: {line?: number}}} IstanbulCoverageLocation */
/** @typedef {{line?: number, locations?: IstanbulCoverageLocation[]}} IstanbulBranchLocation */
/** @typedef {{statementMap?: Record<string, IstanbulCoverageLocation>, branchMap?: Record<string, IstanbulBranchLocation>, s?: Record<string, number>, f?: Record<string, number>, b?: Record<string, number[]>}} IstanbulCoverageRecord */

/**
 * Fold requested-file records in original shard/key order.
 * @param {IstanbulCoverageRecord[]} records Records already projected for one file.
 * @returns {IstanbulCoverageRecord | undefined} Merged evidence or actual absence.
 */
export function mergeCoverageRecords(records) {
  /** @type {IstanbulCoverageRecord | undefined} */
  let merged;
  for (const record of records) merged = mergeCoverageRecord(merged, record);
  return merged;
}

/**
 * Merge Istanbul coverage counters from separate bounded test shards.
 * @param {IstanbulCoverageRecord | undefined} existing Previously collected file record.
 * @param {IstanbulCoverageRecord} next New shard file record.
 * @returns {IstanbulCoverageRecord} Merged file record.
 */
function mergeCoverageRecord(existing, next) {
  if (!existing) return structuredClone(next);
  return {
    ...existing,
    s: addCoverageCounters(existing.s, next.s),
    f: addCoverageCounters(existing.f, next.f),
    b: addCoverageBranches(existing.b, next.b),
  };
}

/**
 * Sum keyed Istanbul statement or function counters.
 * @param {Partial<Record<string, number>>} [left] Existing counts.
 * @param {Partial<Record<string, number>>} [right] New counts.
 * @returns {Record<string, number>} Summed counts.
 */
function addCoverageCounters(left = {}, right = {}) {
  return Object.fromEntries(
    [...new Set([...Object.keys(left), ...Object.keys(right)])].map(key => [
      key,
      (left[key] ?? 0) + (right[key] ?? 0),
    ])
  );
}

/**
 * Sum Istanbul branch-arm counters.
 * @param {Partial<Record<string, number[]>>} [left] Existing counts.
 * @param {Partial<Record<string, number[]>>} [right] New counts.
 * @returns {Record<string, number[]>} Summed branch counts.
 */
function addCoverageBranches(left = {}, right = {}) {
  return Object.fromEntries(
    [...new Set([...Object.keys(left), ...Object.keys(right)])].map(key => {
      const leftArms = left[key] ?? [];
      const rightArms = right[key] ?? [];
      return [
        key,
        Array.from(
          { length: Math.max(leftArms.length, rightArms.length) },
          (_, index) => (leftArms[index] ?? 0) + (rightArms[index] ?? 0)
        ),
      ];
    })
  );
}
