// Toy: Asset Allocation Registry
// (input, env) -> string

import { parseObjectRecord, trimmedStringOrEmpty } from '../../validation.js';

/**
 * Register asset allocations for possession contexts.
 * The allocation window includes transport to the customer and return.
 * @param {string} input JSON payload with `allocations`.
 * @returns {string} Deterministic allocation registry.
 */
export function assetAllocationRegistry(input) {
  const parsed = parseObjectRecord(input) ?? {};
  const allocations = Array.isArray(parsed.allocations)
    ? parsed.allocations.map(normalizeAllocation).filter(Boolean)
    : [];
  allocations.sort((left, right) =>
    `${left.possessionContextId}:${left.assetId}`.localeCompare(
      `${right.possessionContextId}:${right.assetId}`
    )
  );
  return JSON.stringify(
    { allocations, summary: { allocationCount: allocations.length } },
    null,
    2
  );
}

/**
 * @param {unknown} value Candidate allocation.
 * @returns {Record<string, string>|null} Normalized allocation.
 */
function normalizeAllocation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allocation = /** @type {Record<string, unknown>} */ (value);
  const possessionContextId = trimmedStringOrEmpty(
    allocation.possessionContextId
  );
  const assetId = trimmedStringOrEmpty(allocation.assetId);
  const allocatedFrom = trimmedStringOrEmpty(allocation.allocatedFrom);
  const allocatedTo = trimmedStringOrEmpty(allocation.allocatedTo);
  if (!possessionContextId || !assetId || !allocatedFrom || !allocatedTo) {
    return null;
  }
  const normalized = {
    possessionContextId,
    assetId,
    allocatedFrom,
    allocatedTo,
    status: trimmedStringOrEmpty(allocation.status) || 'allocated',
  };
  const possessionFrom = trimmedStringOrEmpty(allocation.possessionFrom);
  const possessionTo = trimmedStringOrEmpty(allocation.possessionTo);
  if (possessionFrom) normalized.possessionFrom = possessionFrom;
  if (possessionTo) normalized.possessionTo = possessionTo;
  return normalized;
}
