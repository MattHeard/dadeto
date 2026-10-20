import { describe, expect, it, jest } from '@jest/globals';
import { main } from '../../scripts/smoke-production-rental-search.js';

const siteOrigin = 'https://mattheard.net';
const registryUrl =
  'https://storage.googleapis.com/example-function-endpoints/function-endpoints.json';
const functionUrl = 'https://rental-search.example.run.app';
const authorUrl = 'https://get-author-uuid.example.run.app';

/**
 * Create a valid production endpoint manifest.
 * @returns {{schemaVersion: number, environment: string, functions: Record<string, string>}} Manifest.
 */
function manifest() {
  return {
    schemaVersion: 1,
    environment: 'prod',
    functions: {
      objectMinuteRentalSearch: functionUrl,
      getAuthorUuidV2: authorUrl,
    },
  };
}

/**
 * Create responses for the registry, page, and explicit browser preflight.
 * @param {{pageEndpoint?: string, preflightOrigin?: string, allowMethods?: string, allowHeaders?: string}} [options] Response fixture overrides.
 * @returns {jest.Mock} Fetch stub.
 */
function createFetch({
  pageEndpoint = functionUrl,
  preflightOrigin = siteOrigin,
  allowMethods = 'POST, OPTIONS',
  allowHeaders = 'Content-Type',
} = {}) {
  return jest
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify(manifest()), {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, no-store',
        },
      })
    )
    .mockResolvedValueOnce(
      new Response(
        `<form id="rental-search-form" data-search-endpoint="${pageEndpoint}"></form>`,
        { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
      )
    )
    .mockResolvedValueOnce(
      new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': preflightOrigin,
          'access-control-allow-methods': allowMethods,
          'access-control-allow-headers': allowHeaders,
        },
      })
    );
}

/**
 * Create a minimal browser adapter that exposes only smoke-runner observations.
 * @param {{status?: number, allowOrigin?: string, invalidStatus?: number, invalidAllowOrigin?: string, invalidFetchSucceeded?: boolean, pageEndpoint?: string, responseUrl?: string}} [options] Browser response overrides.
 * @returns {{chromium: object, calls: {goto: jest.Mock, fill: jest.Mock, click: jest.Mock, evaluate: jest.Mock, close: jest.Mock}}} Browser fixture.
 */
function createBrowser({
  status = 200,
  allowOrigin = siteOrigin,
  invalidStatus = 400,
  invalidAllowOrigin = siteOrigin,
  invalidFetchSucceeded = true,
  pageEndpoint = functionUrl,
  responseUrl = `${functionUrl}/`,
} = {}) {
  const calls = {
    goto: jest.fn(),
    fill: jest.fn(),
    click: jest.fn(),
    evaluate: jest.fn(),
    close: jest.fn(),
  };
  const browserResponse = {
    url: () => responseUrl,
    request: () => ({ method: () => 'POST', url: () => functionUrl }),
    status: () => status,
    headers: () => ({ 'access-control-allow-origin': allowOrigin }),
    json: async () => ({ valid: true, results: [] }),
  };
  const invalidBrowserResponse = {
    ...browserResponse,
    status: () => invalidStatus,
    headers: () => ({ 'access-control-allow-origin': invalidAllowOrigin }),
  };
  let responseIndex = 0;
  const page = {
    goto: calls.goto,
    locator: selector => ({
      getAttribute: async () => {
        expect(selector).toBe('#rental-search-form');
        return pageEndpoint;
      },
      fill: calls.fill,
    }),
    waitForResponse: async predicate => {
      const response = [browserResponse, invalidBrowserResponse][
        responseIndex++
      ];
      if (!response || !predicate(response))
        throw new Error('No browser POST response.');
      return response;
    },
    getByRole: () => ({ click: calls.click }),
    waitForFunction: jest.fn(),
    evaluate: async (_callback, endpoint) => {
      calls.evaluate(endpoint);
      return {
        fetchSucceeded: invalidFetchSucceeded,
        status: invalidStatus,
        valid: false,
      };
    },
  };
  const browser = {
    newPage: async () => page,
    close: calls.close,
  };
  return {
    chromium: { launch: jest.fn(async () => browser) },
    calls,
  };
}

describe('production rental search browser smoke', () => {
  it('sends no requests unless explicitly invoked with --execute', async () => {
    const fetchFn = jest.fn();
    const { chromium, calls } = createBrowser();
    const output = [];

    await expect(
      main({
        argv: [],
        fetchFn,
        chromium,
        writeLine: line => output.push(line),
      })
    ).resolves.toBe(0);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(chromium.launch).not.toHaveBeenCalled();
    expect(calls.goto).not.toHaveBeenCalled();
    expect(output.join('\n')).toContain('No requests sent');
  });

  it('checks the canonical page endpoint and browser success and failure paths', async () => {
    const fetchFn = createFetch();
    const { chromium, calls } = createBrowser();
    const output = [];

    await expect(
      main({
        argv: ['--execute'],
        environment: {
          PRODUCTION_SITE_ORIGIN: siteOrigin,
          FUNCTION_ENDPOINT_REGISTRY_URL: registryUrl,
        },
        fetchFn,
        chromium,
        writeLine: line => output.push(line),
      })
    ).resolves.toBe(0);

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      registryUrl,
      expect.objectContaining({ method: 'GET', redirect: 'error' })
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      `${siteOrigin}/object-minute-rental-search/`,
      expect.objectContaining({ method: 'GET', redirect: 'error' })
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      3,
      functionUrl,
      expect.objectContaining({
        method: 'OPTIONS',
        headers: expect.objectContaining({ Origin: siteOrigin }),
      })
    );
    expect(chromium.launch).toHaveBeenCalledWith({ headless: true });
    expect(calls.goto).toHaveBeenCalledWith(
      `${siteOrigin}/object-minute-rental-search/`,
      expect.objectContaining({ waitUntil: 'domcontentloaded' })
    );
    expect(calls.fill).toHaveBeenCalledTimes(6);
    expect(calls.click).toHaveBeenCalledTimes(1);
    expect(calls.evaluate).toHaveBeenCalledWith(functionUrl);
    expect(calls.close).toHaveBeenCalledTimes(1);

    const result = JSON.parse(output[0].replace(/^.*?: /, ''));
    expect(result).toEqual({
      siteOrigin,
      registryHost: 'storage.googleapis.com',
      functionHost: 'rental-search.example.run.app',
      statuses: {
        registry: 200,
        page: 200,
        preflight: 204,
        search: 200,
        invalidInput: 400,
      },
    });
    expect(output.join('\n')).not.toContain(functionUrl);
    expect(output.join('\n')).not.toContain(authorUrl);
  });

  it('stops before browser requests when the deployed page disagrees with the registry', async () => {
    const fetchFn = createFetch({
      pageEndpoint: 'https://unexpected.example.run.app',
    });
    const { chromium } = createBrowser();

    await expect(
      main({
        argv: ['--execute'],
        environment: {
          PRODUCTION_SITE_ORIGIN: siteOrigin,
          FUNCTION_ENDPOINT_REGISTRY_URL: registryUrl,
        },
        fetchFn,
        chromium,
        writeLine: () => {},
      })
    ).rejects.toThrow('does not match the canonical registry');

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(chromium.launch).not.toHaveBeenCalled();
  });

  it('rejects a production preflight that does not allow the browser request', async () => {
    const fetchFn = createFetch({ allowMethods: 'OPTIONS' });
    const { chromium } = createBrowser();

    await expect(
      main({
        argv: ['--execute'],
        environment: {
          PRODUCTION_SITE_ORIGIN: siteOrigin,
          FUNCTION_ENDPOINT_REGISTRY_URL: registryUrl,
        },
        fetchFn,
        chromium,
        writeLine: () => {},
      })
    ).rejects.toThrow('did not allow the browser request');

    expect(chromium.launch).not.toHaveBeenCalled();
  });

  it('rejects a browser response from a different endpoint', async () => {
    const fetchFn = createFetch();
    const { chromium } = createBrowser({
      responseUrl: 'https://unexpected.example.run.app/',
    });

    await expect(
      main({
        argv: ['--execute'],
        environment: {
          PRODUCTION_SITE_ORIGIN: siteOrigin,
          FUNCTION_ENDPOINT_REGISTRY_URL: registryUrl,
        },
        fetchFn,
        chromium,
        writeLine: () => {},
      })
    ).rejects.toThrow('noncanonical rental search endpoint');
  });

  it('rejects invalid-input responses without the production CORS origin', async () => {
    const fetchFn = createFetch();
    const { chromium } = createBrowser({
      invalidAllowOrigin: 'https://unexpected.example',
    });

    await expect(
      main({
        argv: ['--execute'],
        environment: {
          PRODUCTION_SITE_ORIGIN: siteOrigin,
          FUNCTION_ENDPOINT_REGISTRY_URL: registryUrl,
        },
        fetchFn,
        chromium,
        writeLine: () => {},
      })
    ).rejects.toThrow('did not allow the production origin');
  });
});
