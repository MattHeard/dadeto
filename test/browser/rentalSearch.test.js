import { jest, test, expect } from '@jest/globals';
import {
  buildSearchRequest,
  createRentalSearchHandle,
} from '../../src/core/browser/rentalSearch.js';

const values = {
  product: 'football',
  deliveryTime: '2026-10-03T10:00:00Z',
  pickupTime: '2026-10-03T12:00:00Z',
  deliveryLatitude: '52',
  deliveryLongitude: '13',
  pickupLatitude: '53',
  pickupLongitude: '14',
};

/**
 * Create observable browser adapters for a submission scenario.
 * @param {object} options Scenario.
 * @param {object} [options.config] Endpoint configuration.
 * @param {boolean} [options.configFailure] Configuration failure.
 * @param {boolean} [options.valid] Browser form validity.
 * @param {object} [options.response] API response.
 * @param {unknown} [options.error] Network rejection.
 * @returns {object} Page fixture.
 */
function setup({
  config = {},
  configFailure = false,
  valid = true,
  response = { ok: true, json: async () => ({ valid: true, results: [] }) },
  error,
} = {}) {
  const status = { textContent: '' };
  const button = { disabled: false };
  const listeners = new Map();
  const form = {
    dataset: { searchEndpoint: '/fallback' },
    reportValidity: () => valid,
    querySelector: () => button,
    addEventListener: (name, listener) => listeners.set(name, listener),
  };
  const fetchFn = jest.fn(async url => {
    if (url === '/config.json') {
      if (configFailure) {
        throw new Error('Config unavailable');
      }
      return { json: async () => config };
    }
    if (error !== undefined) {
      throw error;
    }
    return response;
  });
  const documentObj = {
    querySelector: selector =>
      selector === '#rental-search-form' ? form : status,
  };
  const handle = createRentalSearchHandle({
    documentObj,
    fetchFn,
    readValues: () => values,
  });
  handle.start();
  return { handle, status, button, fetchFn, submit: listeners.get('submit') };
}

test('request preserves fields and normalizes both timestamps', () => {
  expect(buildSearchRequest(values)).toEqual({
    searchText: 'football',
    possessionContext: {
      startPoint: {
        timestamp: '2026-10-03T10:00:00.000Z',
        latitude: '52',
        longitude: '13',
      },
      endPoint: {
        timestamp: '2026-10-03T12:00:00.000Z',
        latitude: '53',
        longitude: '14',
      },
    },
  });
  expect(() =>
    buildSearchRequest({ ...values, deliveryTime: 'invalid' })
  ).toThrow(RangeError);
});

test('status covers hits, missing results, invalid responses and safe text', () => {
  const { handle, status } = setup();
  for (const [result, text] of [
    [
      { valid: true, results: [{ skuId: 'OTHER' }, { skuId: 'FOOTBALL' }] },
      'Football is available',
    ],
    [{ valid: true, results: [] }, 'Football is not available'],
    [{ valid: true }, 'Football is not available'],
    [{ valid: false, reason: '<unsafe>' }, 'Search error: <unsafe>'],
    [{ valid: false }, 'Search error: Invalid search response.'],
    [null, 'Search error: Invalid search response.'],
    [undefined, 'Search error: Invalid search response.'],
  ]) {
    handle.renderSearchState(result);
    expect(status.textContent).toContain(text);
  }
});

test('submission uses configured endpoint and restores controls', async () => {
  const fixture = setup({
    config: { objectMinuteRentalSearchUrl: '/configured' },
  });
  const event = { preventDefault: jest.fn() };
  const pending = fixture.submit(event);
  expect(fixture.button.disabled).toBe(true);
  expect(fixture.status.textContent).toBe('Searching…');
  await pending;
  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  expect(fixture.fetchFn).toHaveBeenLastCalledWith('/configured', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSearchRequest(values)),
  });
  expect(fixture.button.disabled).toBe(false);
});

test('invalid form never posts or disables controls', async () => {
  const fixture = setup({ valid: false });
  await fixture.submit({ preventDefault: jest.fn() });
  expect(fixture.fetchFn).toHaveBeenCalledTimes(1);
  expect(fixture.button.disabled).toBe(false);
});

test.each([false, true])(
  'configuration fallback works with rejection=%s',
  async configFailure => {
    const fixture = setup({ configFailure });
    await fixture.submit({ preventDefault: jest.fn() });
    expect(fixture.fetchFn.mock.calls[1][0]).toBe('/fallback');
  }
);

test.each([
  [
    { ok: false, status: 503, json: async () => ({ reason: 'Unavailable' }) },
    undefined,
    'Unavailable',
  ],
  [{ ok: false, status: 502, json: async () => ({}) }, undefined, 'HTTP 502'],
  [undefined, new Error('Disconnected'), 'Disconnected'],
  [undefined, 'Offline', 'Offline'],
  [
    {
      ok: true,
      json: async () => {
        throw new Error('Bad JSON');
      },
    },
    undefined,
    'Bad JSON',
  ],
])(
  'failures render error text and restore controls',
  async (response, error, message) => {
    const fixture = setup({ response, error });
    await fixture.submit({ preventDefault: jest.fn() });
    expect(fixture.status.textContent).toBe(`Search error: ${message}`);
    expect(fixture.button.disabled).toBe(false);
  }
);
