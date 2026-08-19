// Toy: Object-minute rental asset registry
// (input, env) -> string

import { parseObjectRecord, trimmedStringOrEmpty } from '../../validation.js';

/** @typedef {{assetId: string, sku: string, name: string, storageLocation: string, condition: string, availability: string, owner: string, resetRequired: boolean, notes?: string}} Asset */

/**
 * Register physical assets and return a deterministic inventory snapshot.
 * @param {string} input JSON payload with `assets`.
 * @returns {string} Normalized asset registry report.
 */
export function assetRegistry(input) {
  const parsed = parseObjectRecord(input) ?? {};
  const assets = getAssets(parsed);

  assets.sort((left, right) => left.assetId.localeCompare(right.assetId));
  return JSON.stringify({ assets, summary: summarize(assets) }, null, 2);
}

/**
 * Normalize one asset record.
 * @param {unknown} value Candidate asset.
 * @param {number} index Fallback index.
 * @returns {Record<string, unknown> | null} Normalized asset or null.
 */
function normalizeAsset(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const asset = /** @type {Record<string, unknown>} */ (value);

  const assetId = withFallback(
    trimmedStringOrEmpty(asset.assetId),
    `asset-${index + 1}`
  );
  const sku = withFallback(trimmedStringOrEmpty(asset.sku), 'unknown-sku');
  const condition = withFallback(
    trimmedStringOrEmpty(asset.condition),
    'Unknown'
  );
  const availability = withFallback(
    trimmedStringOrEmpty(asset.availability),
    'Available'
  );
  const owner = withFallback(
    trimmedStringOrEmpty(asset.owner),
    'unknown-owner'
  );
  const storageLocation = withFallback(
    trimmedStringOrEmpty(asset.storageLocation),
    'unknown-location'
  );
  const notes = trimmedStringOrEmpty(asset.notes);

  const normalized = /** @type {Asset} */ ({
    assetId,
    sku,
    name: withFallback(trimmedStringOrEmpty(asset.name), assetId),
    storageLocation,
    condition,
    availability,
    owner,
    resetRequired: asset.resetRequired === true,
  });
  if (notes) normalized.notes = notes;
  return /** @type {Asset} */ (normalized);
}

/**
 * @param {string} value Candidate text.
 * @param {string} fallback Fallback text.
 * @returns {string} Selected text.
 */
function withFallback(value, fallback) {
  if (value) return value;
  return fallback;
}

/**
 * @param {Record<string, unknown>} parsed Parsed payload.
 * @returns {Asset[]} Normalized assets.
 */
function getAssets(parsed) {
  if (!Array.isArray(parsed.assets)) return [];
  return /** @type {Asset[]} */ (
    parsed.assets.map(normalizeAsset).filter(Boolean)
  );
}

/**
 * @param {Asset[]} assets Normalized assets.
 * @returns {{assetCount: number, availableCount: number, skuCount: number}} Summary.
 */
function summarize(assets) {
  return {
    assetCount: assets.length,
    availableCount: assets.filter(asset => asset.availability === 'Available')
      .length,
    skuCount: new Set(assets.map(asset => asset.sku)).size,
  };
}
