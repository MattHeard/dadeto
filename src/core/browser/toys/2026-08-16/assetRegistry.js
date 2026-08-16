// Toy: Object-minute rental asset registry
// (input, env) -> string

/**
 * Register physical assets and return a deterministic inventory snapshot.
 * @param {string} input JSON payload with `assets`.
 * @returns {string} Normalized asset registry report.
 */
export function assetRegistry(input) {
  const parsed = parseInput(input);
  const assets = Array.isArray(parsed.assets)
    ? parsed.assets.map(normalizeAsset).filter(Boolean)
    : [];

  assets.sort((left, right) => left.assetId.localeCompare(right.assetId));
  return JSON.stringify({ assets, summary: summarize(assets) }, null, 2);
}

/**
 *
 * @param input
 */
function parseInput(input) {
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

/**
 *
 * @param value
 * @param index
 */
function normalizeAsset(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const assetId = text(value.assetId) || `asset-${index + 1}`;
  const sku = text(value.sku) || 'unknown-sku';
  const condition = text(value.condition) || 'Unknown';
  const availability = text(value.availability) || 'Available';
  const owner = text(value.owner) || 'unknown-owner';
  const storageLocation = text(value.storageLocation) || 'unknown-location';
  const notes = text(value.notes);

  return {
    assetId,
    sku,
    name: text(value.name) || assetId,
    storageLocation,
    condition,
    availability,
    owner,
    resetRequired: value.resetRequired === true,
    ...(notes ? { notes } : {}),
  };
}

/**
 *
 * @param value
 */
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 *
 * @param assets
 */
function summarize(assets) {
  return {
    assetCount: assets.length,
    availableCount: assets.filter(asset => asset.availability === 'Available')
      .length,
    skuCount: new Set(assets.map(asset => asset.sku)).size,
  };
}
