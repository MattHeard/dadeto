/**
 * Determine the HTML file path to remove for a variant change.
 * @param {object|null} before Variant data before the change.
 * @param {object|null} after Variant data after the change.
 * @param {{number: number}} page Page data containing its number.
 * @param {number} [threshold] Visibility threshold.
 * @returns {string|null} Path to remove or null if nothing to delete.
 */
export function decideRemovalPath(before, after, page, threshold = 0.5) {
  if (!page) {
    return null;
  }
  if (!after) {
    if (!before) {
      return null;
    }
    return `p/${page.number}${before.name}.html`;
  }
  const beforeVis = before?.visibility ?? 0;
  const afterVis = after.visibility ?? 0;
  if (beforeVis >= threshold && afterVis < threshold) {
    return `p/${page.number}${after.name}.html`;
  }
  return null;
}
