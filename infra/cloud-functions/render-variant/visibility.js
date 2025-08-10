export const VISIBILITY_THRESHOLD = 0.5;

/**
 * Filter variants to only include those above the visibility threshold.
 * @param {Array<{data: () => {name?: string, content?: string, visibility?: number}}>} docs Variant docs.
 * @returns {Array<{name: string, content: string}>} Visible variants.
 */
export function getVisibleVariants(docs) {
  return docs
    .filter(doc => (doc.data().visibility ?? 1) >= VISIBILITY_THRESHOLD)
    .map(doc => ({
      name: doc.data().name || '',
      content: doc.data().content || '',
    }));
}
