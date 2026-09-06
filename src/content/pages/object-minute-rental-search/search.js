const form = document.querySelector('#rental-search-form');
const status = document.querySelector('#search-status');
const button = form.querySelector('button[type="submit"]');
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
export function renderSearchState(result) {
  if (result?.valid && result.results?.some(item => item.skuId === 'FOOTBALL')) {
    status.textContent = 'Football is available for this possession window.';
  } else if (result?.valid) {
    status.textContent = 'Football is not available for this possession window.';
  } else {
    status.textContent = `Search error: ${result?.reason ?? 'Invalid search response.'}`;
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  button.disabled = true;
  status.textContent = 'Searching…';
  try {
    const response = await fetch(form.dataset.searchEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSearchRequest(Object.fromEntries(new FormData(form)))),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.reason ?? `HTTP ${response.status}`);
    renderSearchState(result);
  } catch (error) {
    status.textContent = `Search error: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    button.disabled = false;
  }
});
