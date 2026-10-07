/**
 * Translate rental form fields to the search API's possession context.
 * @param {Record<string, string>} values Form fields.
 * @returns {Record<string, unknown>} Search request.
 */
export function buildSearchRequest(values) {
  return {
    searchText: values.product,
    possessionContext: {
      startPoint: {
        timestamp: new Date(values.deliveryTime).toISOString(),
        latitude: values.deliveryLatitude,
        longitude: values.deliveryLongitude,
      },
      endPoint: {
        timestamp: new Date(values.pickupTime).toISOString(),
        latitude: values.pickupLatitude,
        longitude: values.pickupLongitude,
      },
    },
  };
}

/**
 * Convert API results to accessible text, without rendering server markup.
 * @param {Record<string, any> | null | undefined} result API response.
 * @returns {string} Status message.
 */
function searchMessage(result) {
  if (
    result?.valid &&
    result.results?.some(
      /**
       * @param {{skuId: string}} item Search hit.
       * @returns {boolean} Football hit.
       */
      item => item.skuId === 'FOOTBALL'
    )
  ) {
    return 'Football is available for this possession window.';
  }
  if (result?.valid) {
    return 'Football is not available for this possession window.';
  }
  return `Search error: ${result?.reason ?? 'Invalid search response.'}`;
}

/**
 * Create an injectable rental page controller.
 * @param {{documentObj: Document, fetchFn: (permission: import('../../../types/allow-effects').AllowEffects, input: string, init?: object) => Promise<Response>, bindEffectBoundary: import('../../../types/allow-effects').AllowEffectsBoundary, readValues: (form: HTMLFormElement) => Record<string, string>}} deps Browser adapters.
 * @returns {{start: () => void, renderSearchState: (result: Record<string, any> | null | undefined) => void}} Page controller.
 */
export function createRentalSearchHandle({
  documentObj,
  fetchFn,
  bindEffectBoundary,
  readValues,
}) {
  const form = /** @type {HTMLFormElement} */ (
    documentObj.querySelector('#rental-search-form')
  );
  const status = /** @type {HTMLElement} */ (
    documentObj.querySelector('#search-status')
  );
  const button = /** @type {HTMLButtonElement} */ (
    form.querySelector('button[type="submit"]')
  );
  const endpoint = bindEffectBoundary(permission =>
    fetchFn(permission, '/config.json')
  )
    .then(response => response.json())
    .then(
      config =>
        config.objectMinuteRentalSearchUrl || form.dataset.searchEndpoint
    )
    .catch(() => form.dataset.searchEndpoint);

  /**
   * Write response text into the page status.
   * @param {Record<string, any> | null | undefined} result API response.
   * @returns {void}
   */
  function renderSearchState(result) {
    status.textContent = searchMessage(result);
  }

  /**
   * Submit valid fields and restore controls on every response path.
   * @param {Event} event Submission event.
   * @returns {Promise<void>} Completion.
   */
  async function submit(event) {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }
    button.disabled = true;
    status.textContent = 'Searching…';
    try {
      const searchEndpoint = /** @type {string} */ (await endpoint);
      const response = await bindEffectBoundary(permission =>
        fetchFn(permission, searchEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildSearchRequest(readValues(form))),
        })
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.reason ?? `HTTP ${response.status}`);
      }
      renderSearchState(result);
    } catch (error) {
      status.textContent = `Search error: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      button.disabled = false;
    }
  }

  return {
    start: () => form.addEventListener('submit', submit),
    renderSearchState,
  };
}
