// @ts-nocheck
// Toy: Possession Context Registry

import { trimmedStringOrEmpty } from '../../validation.js';
import { buildRegistry } from '../2026-08-18/registryUtils.js';

/** @param {string} input JSON payload containing possessionContexts. @returns {string} Deterministic registry. */
export const possessionContextRegistry = input =>
  buildRegistry(input, {
    collectionKey: 'possessionContexts',
    countKey: 'possessionContextCount',
    sourceKey: 'possessionContexts',
    normalize: normalize,
    sortKey: context => context.possessionContextId,
  });

/**
 *
 * @param value
 */
function normalize(value) {
  const x = /** @type {Record<string, unknown>} */ (value || {});
  const possessionContextId = trimmedStringOrEmpty(x.possessionContextId),
    sku = trimmedStringOrEmpty(x.sku),
    segmentId = trimmedStringOrEmpty(x.segmentId);
  return possessionContextId && sku && segmentId
    ? { possessionContextId, sku, segmentId }
    : null;
}
