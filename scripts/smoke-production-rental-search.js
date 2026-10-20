import { chromium as defaultChromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { parseFunctionEndpointRegistry } from '../src/core/build/function-endpoint-registry.js';
import { parseFunctionEndpointRegistryUrl } from './parse-function-endpoint-registry-url.js';

const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_SITE_ORIGIN = 'https://mattheard.net';
const DEFAULT_REGISTRY_URL =
  'https://storage.googleapis.com/irien-465710-function-endpoints/function-endpoints.json';
const SUCCESS_MESSAGES = new Set([
  'Football is available for this possession window.',
  'Football is not available for this possession window.',
]);

/**
 * Verify the deployed rental page, canonical function endpoint, browser CORS path, and safe input failure.
 * @param {{siteOrigin?: string, registryUrl?: string, fetchFn?: typeof fetch, chromium?: typeof defaultChromium, timeoutSignal?: (milliseconds: number) => AbortSignal, clock?: () => Date}} options Smoke dependencies.
 * @returns {Promise<{siteOrigin: string, registryHost: string, functionHost: string, statuses: {registry: number, page: number, preflight: number, search: number, invalidInput: number}}>} Redacted verification evidence.
 */
export async function runProductionRentalSearchSmoke({
  siteOrigin = DEFAULT_SITE_ORIGIN,
  registryUrl = DEFAULT_REGISTRY_URL,
  fetchFn = globalThis.fetch,
  chromium = defaultChromium,
  timeoutSignal = AbortSignal.timeout,
  clock = () => new Date(),
} = {}) {
  const origin = parseSiteOrigin(siteOrigin);
  const registry = parseFunctionEndpointRegistryUrl(registryUrl);
  if (typeof fetchFn !== 'function')
    throw new Error('This Node.js version does not provide fetch.');

  const manifestResponse = await fetchWithoutLeakingRequestData(
    fetchFn,
    registry.href,
    {
      method: 'GET',
      redirect: 'error',
      headers: { Accept: 'application/json' },
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    },
    'Registry GET'
  );
  requireStatus(manifestResponse, 200, 'Registry GET');
  requireContentType(manifestResponse, 'application/json', 'Registry GET');
  requireNoStore(manifestResponse, 'Registry GET');
  const manifest = parseFunctionEndpointRegistry(
    await readResponseText(manifestResponse, 'Registry GET')
  );
  const functionUrl = manifest.functions.objectMinuteRentalSearch;
  const functionEndpoint = new URL(functionUrl);

  const pageUrl = new URL('/object-minute-rental-search/', origin).href;
  const pageResponse = await fetchWithoutLeakingRequestData(
    fetchFn,
    pageUrl,
    {
      method: 'GET',
      redirect: 'error',
      headers: { Accept: 'text/html' },
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    },
    'Rental page GET'
  );
  requireStatus(pageResponse, 200, 'Rental page GET');
  requireContentType(pageResponse, 'text/html', 'Rental page GET');
  const pageHtml = await readResponseText(pageResponse, 'Rental page GET');
  if (readSearchEndpoint(pageHtml) !== functionUrl) {
    throw new Error(
      'Deployed rental page endpoint does not match the canonical registry.'
    );
  }

  const preflightResponse = await fetchWithoutLeakingRequestData(
    fetchFn,
    functionUrl,
    {
      method: 'OPTIONS',
      redirect: 'error',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    },
    'Function CORS preflight'
  );
  requireStatus(preflightResponse, 204, 'Function CORS preflight');
  requireCorsResponse(preflightResponse, origin, { preflight: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: REQUEST_TIMEOUT_MS,
    });
    const embeddedEndpoint = await page
      .locator('#rental-search-form')
      .getAttribute('data-search-endpoint');
    if (embeddedEndpoint !== functionUrl) {
      throw new Error(
        'Browser page endpoint does not match the canonical registry.'
      );
    }

    const responsePromise = page.waitForResponse(
      response => response.request().method() === 'POST',
      { timeout: REQUEST_TIMEOUT_MS }
    );
    await fillSearchForm(page, clock());
    await page.getByRole('button', { name: 'Search' }).click();
    const searchResponse = await responsePromise;
    if (new URL(searchResponse.url()).href !== new URL(functionUrl).href) {
      throw new Error(
        'Browser submitted to a noncanonical rental search endpoint.'
      );
    }
    requireStatus(searchResponse, 200, 'Browser rental search');
    requireCorsResponse(searchResponse, origin);
    const searchResult = await readResponseJson(
      searchResponse,
      'Browser rental search'
    );
    if (searchResult?.valid !== true) {
      throw new Error('Browser rental search did not return a valid result.');
    }
    await page.waitForFunction(
      messages =>
        messages.includes(
          document.querySelector('#search-status')?.textContent ?? ''
        ),
      [...SUCCESS_MESSAGES],
      { timeout: REQUEST_TIMEOUT_MS }
    );

    const invalidResponsePromise = page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        new URL(response.request().url()).href ===
          new URL(functionUrl).href,
      { timeout: REQUEST_TIMEOUT_MS }
    );
    const invalidInput = await page.evaluate(async endpoint => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        const body = await response.json();
        return {
          fetchSucceeded: true,
          status: response.status,
          valid: body.valid === true,
        };
      } catch {
        return { fetchSucceeded: false, status: null, valid: null };
      }
    }, functionUrl);
    const invalidResponse = await invalidResponsePromise;
    requireStatus(invalidResponse, 400, 'Browser invalid-input request');
    requireCorsResponse(invalidResponse, origin);
    if (
      !invalidInput.fetchSucceeded ||
      invalidInput.status !== invalidResponse.status() ||
      invalidInput.valid
    ) {
      throw new Error('Invalid browser request did not fail safely with HTTP 400.');
    }

    return {
      siteOrigin: origin,
      registryHost: registry.host,
      functionHost: functionEndpoint.host,
      statuses: {
        registry: manifestResponse.status,
        page: pageResponse.status,
        preflight: preflightResponse.status,
        search: searchResponse.status(),
        invalidInput: invalidInput.status,
      },
    };
  } finally {
    await browser.close();
  }
}

/**
 * Run the smoke only after an explicit CLI opt-in.
 * @param {{argv?: string[], environment?: Record<string, string|undefined>, writeLine?: (message: string) => void, fetchFn?: typeof fetch, chromium?: typeof defaultChromium}} [options] CLI dependencies.
 * @returns {Promise<number>} Exit code.
 */
export async function main({
  argv = process.argv.slice(2),
  environment = process.env,
  writeLine = console.log,
  fetchFn = globalThis.fetch,
  chromium = defaultChromium,
} = {}) {
  if (argv.includes('--help')) {
    writeLine(
      'Checks the production rental page against the canonical registry and exercises the browser CORS path.'
    );
    writeLine(
      'No requests are sent unless --execute is provided. The valid search performs Firestore and GCS reads only.'
    );
    return 0;
  }
  if (!argv.includes('--execute')) {
    writeLine(
      'No requests sent. Pass --execute only after separate production verification authorization.'
    );
    return 0;
  }

  const result = await runProductionRentalSearchSmoke({
    siteOrigin: environment.PRODUCTION_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN,
    registryUrl:
      environment.FUNCTION_ENDPOINT_REGISTRY_URL ?? DEFAULT_REGISTRY_URL,
    fetchFn,
    chromium,
  });
  writeLine(`production rental search smoke passed: ${JSON.stringify(result)}`);
  return 0;
}

/**
 * Normalize and validate the production site origin.
 * @param {string} value Candidate site origin.
 * @returns {string} HTTPS origin without a path or credentials.
 */
function parseSiteOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('PRODUCTION_SITE_ORIGIN must be a stable HTTPS origin.');
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new Error('PRODUCTION_SITE_ORIGIN must be a stable HTTPS origin.');
  }
  return parsed.origin;
}

/**
 * Read the single canonical endpoint from deployed page HTML.
 * @param {string} html Deployed static page markup.
 * @returns {string} Embedded endpoint URL.
 */
function readSearchEndpoint(html) {
  const matches = html.match(/data-search-endpoint="([^"]+)"/g) ?? [];
  if (matches.length !== 1) {
    throw new Error('Deployed rental page must contain exactly one endpoint.');
  }
  const match = /^data-search-endpoint="([^"]+)"$/.exec(matches[0]);
  if (!match) throw new Error('Deployed rental page endpoint is malformed.');
  return match[1].replaceAll('&amp;', '&');
}

/**
 * Fill the deployed rental form with a future, in-area search request.
 * @param {{locator: (selector: string) => {fill: (value: string) => Promise<void>}}} page Browser page.
 * @param {Date} now Current time.
 * @returns {Promise<void>}
 */
async function fillSearchForm(page, now) {
  const delivery = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  delivery.setHours(10, 0, 0, 0);
  const pickup = new Date(delivery.getTime() + 2 * 60 * 60 * 1000);
  const fields = {
    '[name="deliveryLatitude"]': '52.510833',
    '[name="deliveryLongitude"]': '13.296667',
    '[name="pickupLatitude"]': '52.510833',
    '[name="pickupLongitude"]': '13.296667',
    '[name="deliveryTime"]': toLocalDateTimeInput(delivery),
    '[name="pickupTime"]': toLocalDateTimeInput(pickup),
  };
  for (const [selector, value] of Object.entries(fields)) {
    await page.locator(selector).fill(value);
  }
}

/**
 * Format a Date for an HTML datetime-local input in the runner's local timezone.
 * @param {Date} value Input value.
 * @returns {string} Local date/time string.
 */
function toLocalDateTimeInput(value) {
  const pad = part => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/**
 * Perform fetch without including request details in errors.
 * @param {typeof fetch} fetchFn Fetch implementation.
 * @param {string} url Target URL.
 * @param {RequestInit} options Request options.
 * @param {string} label Safe operation label.
 * @returns {Promise<Response>} Fetch response.
 */
async function fetchWithoutLeakingRequestData(fetchFn, url, options, label) {
  try {
    return await fetchFn(url, options);
  } catch {
    throw new Error(`${label} failed before a response was received.`);
  }
}

/**
 * Require an exact HTTP status.
 * @param {{status: number|(() => number)}} response HTTP response.
 * @param {number} expected Expected status.
 * @param {string} label Safe operation label.
 * @returns {void}
 */
function requireStatus(response, expected, label) {
  const status =
    typeof response.status === 'function' ? response.status() : response.status;
  if (status !== expected) {
    throw new Error(`${label} returned HTTP ${status}; expected ${expected}.`);
  }
}

/**
 * Require a response content type.
 * @param {{headers: {get: (name: string) => string|null}}} response HTTP response.
 * @param {string} expected Expected media type.
 * @param {string} label Safe operation label.
 * @returns {void}
 */
function requireContentType(response, expected, label) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.split(';', 1)[0].trim().toLowerCase() !== expected) {
    throw new Error(`${label} did not return ${expected}.`);
  }
}

/**
 * Require the public registry to be explicitly non-cacheable.
 * @param {{headers: {get: (name: string) => string|null}}} response HTTP response.
 * @param {string} label Safe operation label.
 * @returns {void}
 */
function requireNoStore(response, label) {
  const cacheControl = response.headers.get('cache-control') ?? '';
  if (!/(?:^|,)\s*no-store\s*(?:,|$)/i.test(cacheControl)) {
    throw new Error(`${label} is missing Cache-Control: no-store.`);
  }
}

/**
 * Require correct CORS headers on a production response.
 * @param {{headers: {get?: (name: string) => string|null}|(() => Record<string, string>)}} response HTTP response.
 * @param {string} origin Expected origin.
 * @param {{preflight?: boolean}} [options] Preflight mode.
 * @returns {void}
 */
function requireCorsResponse(response, origin, { preflight = false } = {}) {
  if (getResponseHeader(response, 'access-control-allow-origin') !== origin) {
    throw new Error('Rental search response did not allow the production origin.');
  }
  if (preflight) {
    const allowedMethods = getResponseHeader(
      response,
      'access-control-allow-methods'
    );
    const allowedHeaders = getResponseHeader(
      response,
      'access-control-allow-headers'
    );
    if (
      !allowedMethods.split(',').some(method => method.trim() === 'POST') ||
      !allowedHeaders.split(',').some(header => header.trim().toLowerCase() === 'content-type')
    ) {
      throw new Error('Rental search preflight did not allow the browser request.');
    }
  }
}

/**
 * Read one header from Fetch or Playwright response shapes.
 * @param {{headers: {get?: (name: string) => string|null}|(() => Record<string, string>)}} response HTTP response.
 * @param {string} name Header name.
 * @returns {string} Header value or empty string.
 */
function getResponseHeader(response, name) {
  if (typeof response.headers.get === 'function') {
    return response.headers.get(name) ?? '';
  }
  return response.headers()[name.toLowerCase()] ?? '';
}

/**
 * Read a response body safely.
 * @param {{text: () => Promise<string>}} response HTTP response.
 * @param {string} label Safe operation label.
 * @returns {Promise<string>} Response text.
 */
async function readResponseText(response, label) {
  try {
    return await response.text();
  } catch {
    throw new Error(`${label} returned unreadable content.`);
  }
}

/**
 * Read JSON without copying the response body into an error.
 * @param {{json: () => Promise<unknown>}} response HTTP response.
 * @param {string} label Safe operation label.
 * @returns {Promise<Record<string, unknown>>} Parsed object.
 */
async function readResponseJson(response, label) {
  try {
    const body = await response.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch {
    // Use the same sanitized failure for invalid JSON and non-object JSON.
  }
  throw new Error(`${label} returned an invalid JSON object.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
    .then(exitCode => {
      process.exitCode = exitCode;
    })
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
