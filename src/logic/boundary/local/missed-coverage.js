import { captureEvidenceResult } from './evidence-result.js';
import { parseCoverageLine } from './coverage-line.js';

/** @typedef {{start?: {line?: unknown} | null}} UnparsedCoverageLocation */
/** @typedef {{line?: unknown, locations?: Array<UnparsedCoverageLocation | null> | null}} UnparsedBranchLocation */
/** @typedef {{statementMap?: Partial<Record<string, UnparsedCoverageLocation | null>> | null, s?: Record<string, unknown> | null, branchMap?: Partial<Record<string, UnparsedBranchLocation | null>> | null, b?: Record<string, unknown[]> | null}} UnparsedCoverageRecord */
/** @typedef {{line: number, arm: number}} MissedCoverageArm */
/** @typedef {{collected: false, uncoveredLines: [], uncoveredBranches: []} | {collected: true, uncoveredLines: number[], uncoveredBranches: MissedCoverageArm[]}} MissedCoverageEvidence */
/** @typedef {{ok: true, evidence: MissedCoverageEvidence} | {ok: false, error: unknown}} MissedCoverageResult */

/**
 * Interpret unparsed coverage fields without coercing counts or line candidates.
 * Retain missing-record state and original read order/errors as explicit results.
 * This does not establish the full raw JSON or keyed counter schema.
 * @param {UnparsedCoverageRecord | undefined | null} record Unparsed per-file evidence.
 * @returns {MissedCoverageResult} Interpreted evidence or the exact thrown value.
 */
export function parseMissedCoverage(record) {
  return captureEvidenceResult(() => {
    /** @type {MissedCoverageEvidence} */
    const evidence = record
      ? {
          collected: true,
          uncoveredLines: listUncoveredLines(record),
          uncoveredBranches: listUncoveredBranches(record),
        }
      : { collected: false, uncoveredLines: [], uncoveredBranches: [] };
    return evidence;
  });
}

/**
 * Find uncovered source statement lines in one Istanbul record.
 * @param {UnparsedCoverageRecord} record Istanbul file coverage record.
 * @returns {number[]} Sorted unique line numbers.
 */
function listUncoveredLines(record) {
  const locations = record.statementMap ?? {};
  const counters = record.s ?? {};
  return [
    ...new Set(
      Object.entries(counters)
        .filter(([, count]) => count === 0)
        .flatMap(([key]) => {
          const line = parseCoverageLine(locations[key]?.start?.line);
          return line === null ? [] : [line];
        })
    ),
  ].sort((left, right) => left - right);
}

/**
 * Find uncovered branch arms in one Istanbul record.
 * @param {UnparsedCoverageRecord} record Istanbul file coverage record.
 * @returns {Array<{line: number, arm: number}>} Missed branch locations.
 */
function listUncoveredBranches(record) {
  const locations = record.branchMap ?? {};
  const branches = record.b ?? {};
  return Object.entries(branches).flatMap(([key, counts]) =>
    counts.flatMap((count, index) => {
      if (count !== 0) return [];
      const branch = locations[key];
      const line = parseCoverageLine(
        branch?.locations?.[index]?.start?.line ?? branch?.line
      );
      return line === null ? [] : [{ line, arm: index + 1 }];
    })
  );
}
