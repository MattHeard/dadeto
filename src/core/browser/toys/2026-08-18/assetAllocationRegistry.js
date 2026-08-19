// Toy: Asset Allocation Registry
// (input, env) -> string

import { trimmedStringOrEmpty } from '../../validation.js';
import { buildRegistry } from './registryUtils.js';

/**
 * Register asset allocations for possession contexts.
 * The allocation window includes transport to the customer and return.
 * @param {string} input JSON payload with `allocations`.
 * @returns {string} Deterministic allocation registry.
 */
// jscpd:ignore-start — thin exported wiring differs only by registry policy.
export const assetAllocationRegistry = input =>
  buildRegistry(input, {
    collectionKey: 'allocations',
    countKey: 'allocationCount',
    sourceKey: 'allocations',
    normalize: normalizeAllocation,
    sortKey: allocation =>
      `${allocation.possessionContextId}:${allocation.assetId}`,
  });
// jscpd:ignore-end

/**
 * @param {unknown} value Candidate allocation.
 * @returns {{possessionContextId: string, assetId: string, allocatedFrom: string, allocatedTo: string, status: string, possessionFrom?: string, possessionTo?: string}|null} Normalized allocation.
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
  /** @type {{possessionContextId: string, assetId: string, allocatedFrom: string, allocatedTo: string, status: string, possessionFrom?: string, possessionTo?: string}} */
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
