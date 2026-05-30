/**
 * Create a handle that rewrites variant links to a weighted destination.
 * @param {{
 *   documentObj: Document,
 *   locationObj: Location,
 *   cryptoObj: Crypto,
 *   URLCtor: typeof URL,
 * }} deps Browser dependencies.
 * @returns {() => void} Variant redirect setup handle.
 */
export function createVariantRedirectHandle({
  documentObj,
  locationObj,
  cryptoObj,
  URLCtor,
}) {
  const rewriteLink = link =>
    rewriteVariantLink({ link, locationObj, cryptoObj, URLCtor });
  const init = () => {
    documentObj
      .querySelectorAll('a.variant-link[data-variants]')
      .forEach(rewriteLink);
  };
  return function handleVariantRedirect() {
    if (documentObj.readyState === 'loading') {
      documentObj.addEventListener('DOMContentLoaded', init);
      return;
    }

    init();
  };
}

/**
 * Rewrite one link if a weighted variant can be selected.
 * @param {{
 *   link: Element,
 *   locationObj: Location,
 *   cryptoObj: Crypto,
 *   URLCtor: typeof URL,
 * }} deps Link rewrite dependencies.
 * @returns {void}
 */
function rewriteVariantLink({ link, locationObj, cryptoObj, URLCtor }) {
  const pairs = parseVariants(link.getAttribute('data-variants'));
  let chosen = null;
  if (pairs.length) {
    chosen = pickWeighted(pairs, cryptoObj);
  }
  if (!chosen) {
    return;
  }

  try {
    const url = new URLCtor(link.getAttribute('href'), locationObj.href);
    const parts = url.pathname.split('/');
    parts[parts.length - 1] = `${chosen}.html`;
    url.pathname = parts.join('/');
    link.setAttribute('href', url.toString());
    link.setAttribute('data-chosen-variant', chosen);
  } catch {}
}

/**
 * Pick a slug from weighted pairs.
 * @param {Array<{slug: string, w: number}>} pairs Weighted pairs.
 * @param {Crypto} cryptoObj Crypto dependency.
 * @returns {string | null} Selected slug.
 */
function pickWeighted(pairs, cryptoObj) {
  const total = sumPositiveWeights(pairs);
  if (total <= 0) {
    return null;
  }

  const random = new Uint32Array(1);
  cryptoObj.getRandomValues(random);
  const threshold = ((random[0] + 1) / 4294967297) * total;
  return pickThresholdSlug(pairs, threshold);
}

/**
 * Sum finite positive weights.
 * @param {Array<{slug: string, w: number}>} pairs Weighted pairs.
 * @returns {number} Total positive weight.
 */
function sumPositiveWeights(pairs) {
  let total = 0;
  for (const pair of pairs) {
    const weight = Number(pair.w);
    if (Number.isFinite(weight) && weight > 0) {
      total += weight;
    }
  }
  return total;
}

/**
 * Pick a slug from the threshold.
 * @param {Array<{slug: string, w: number}>} pairs Weighted pairs.
 * @param {number} threshold Weighted random threshold.
 * @returns {string | null} Selected slug.
 */
function pickThresholdSlug(pairs, threshold) {
  let remainingThreshold = threshold;
  for (const pair of pairs) {
    const weight = Number(pair.w);
    if (!Number.isFinite(weight) || weight <= 0) {
      continue;
    }
    remainingThreshold -= weight;
    if (remainingThreshold <= 0) {
      return pair.slug;
    }
  }
  /* istanbul ignore next: threshold selection should be exhaustive when total is positive. */
  return null;
}

/**
 * Parse a variant data attribute.
 * @param {string | null} attr Variant attribute value.
 * @returns {Array<{slug: string, w: number}>} Weighted pairs.
 */
function parseVariants(attr) {
  if (!attr) {
    return [];
  }
  const trimmed = attr.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed[0] === '[' || trimmed[0] === '{') {
    return parseJsonVariants(trimmed);
  }
  return trimmed
    .split(',')
    .map(pair => {
      const [slug, weight] = pair.split(':');
      return { slug: slug.trim(), w: Number(weight ?? 1) };
    })
    .filter(pair => pair.slug);
}

/**
 * Parse JSON variant data.
 * @param {string} trimmed Trimmed JSON text.
 * @returns {Array<{slug: string, w: number}>} Weighted pairs.
 */
function parseJsonVariants(trimmed) {
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({ slug: item.slug, w: item.w }));
    }
    return [];
  } catch {
    return [];
  }
}
