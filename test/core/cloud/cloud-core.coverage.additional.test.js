import { describe, expect, jest, test } from '@jest/globals';
import {
  assertFunctionDependencies,
  assertRandomUuidAndTimestamp,
  buildPageByNumberQuery,
  buildVariantByNameQuery,
  createCorsOptions,
  createCorsOriginHandler,
  createResponse,
  createVerifyAdmin,
  ensureFirebaseAppOnce,
  extractErrorMessage,
  extractStringFromCandidateArray,
  getAuthHeader,
  getEnvironmentVariable,
  hasStringMessage,
  isAllowedOrigin,
  isFunction,
  isOriginAllowed,
  matchAuthHeader,
  matchBearerToken,
  normalizeAuthorizationCandidate,
  normalizeMethod,
  normalizeNonStringCandidate,
  normalizeShortString,
  normalizeSubmissionContent,
  resolveAllowedOrigins,
  sendOkResponse,
  tryGetHeader,
} from '../../../src/core/cloud/cloud-core.js';

describe('cloud-core additional coverage', () => {
  test('builds page and variant queries', () => {
    const pageQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    const database = { collectionGroup: jest.fn(() => pageQuery) };
    expect(buildPageByNumberQuery(database, 4)).toBe(pageQuery);
    expect(database.collectionGroup).toHaveBeenCalledWith('pages');
    expect(pageQuery.where).toHaveBeenCalledWith('number', '==', 4);

    const pageRef = { collection: jest.fn(() => pageQuery) };
    expect(buildVariantByNameQuery(pageRef, 'draft')).toBe(pageQuery);
    expect(pageRef.collection).toHaveBeenCalledWith('variants');
    expect(pageQuery.where).toHaveBeenCalledWith('name', '==', 'draft');
  });

  test('handles Firebase initialization success, duplicate, and other errors', () => {
    const initializeApp = jest.fn();
    ensureFirebaseAppOnce(initializeApp);
    expect(initializeApp).toHaveBeenCalledTimes(1);

    expect(() =>
      ensureFirebaseAppOnce(() => {
        throw { code: 'app/duplicate-app', message: 'already exists' };
      })
    ).not.toThrow();
    expect(() =>
      ensureFirebaseAppOnce(() => {
        throw new Error('network failure');
      })
    ).toThrow('network failure');
  });

  test('extracts error messages and handles missing messages', () => {
    expect(hasStringMessage({ message: 'bad' })).toBe(true);
    expect(hasStringMessage({ message: 4 })).toBe(false);
    expect(hasStringMessage(null)).toBe(false);
    expect(extractErrorMessage({ message: 'bad' })).toBe('bad');
    expect(extractErrorMessage({ message: 4 })).toBe('');
    expect(extractErrorMessage(undefined)).toBe('');
  });

  test('normalizes method, function, authorization, and token helpers', () => {
    expect(normalizeMethod('post')).toBe('POST');
    expect(normalizeMethod(4)).toBe('');
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(null)).toBe(false);
    expect(extractStringFromCandidateArray(['first'])).toBe('first');
    expect(extractStringFromCandidateArray([4])).toBeNull();
    expect(normalizeNonStringCandidate([])).toBeNull();
    expect(normalizeAuthorizationCandidate('Bearer x')).toBe('Bearer x');
    expect(normalizeAuthorizationCandidate(['Bearer y'])).toBe('Bearer y');
    expect(normalizeAuthorizationCandidate(4)).toBeNull();
    expect(tryGetHeader(() => ['Bearer z'], 'authorization')).toBe('Bearer z');
    expect(matchAuthHeader('Bearer token')[1]).toBe('token');
    expect(matchBearerToken('Bearer token')).toBe('token');
    expect(matchBearerToken('Token token')).toBeNull();
  });

  test('reads environment values and raw authorization headers safely', () => {
    expect(getEnvironmentVariable(undefined, 'VALUE')).toBeUndefined();
    expect(getEnvironmentVariable({ VALUE: 'yes' }, 'VALUE')).toBe('yes');
    expect(getAuthHeader({ headers: { Authorization: 'Bearer header' } })).toBe(
      'Bearer header'
    );
    expect(getAuthHeader({ headers: 4 })).toBe('');
    expect(getAuthHeader({ get: () => 'Bearer getter' })).toBe('Bearer getter');
    expect(normalizeSubmissionContent('line\r\nnext')).toBe('line\nnext');
    expect(normalizeShortString('  short  ')).toBe('short');
    expect(() => resolveAllowedOrigins({})).toThrow(
      'DENDRITE_ENVIRONMENT is required to resolve allowed origins.'
    );
    expect(resolveAllowedOrigins({ DENDRITE_ENVIRONMENT: 'dev' })).toEqual(
      expect.any(Array)
    );
  });

  test('creates CORS handlers and response values', () => {
    const allowed = ['https://allowed.test'];
    const predicate = jest.fn((origin, origins) => origins.includes(origin));
    const handler = createCorsOriginHandler(predicate, allowed);
    const callback = jest.fn();
    handler('https://allowed.test', callback);
    expect(callback).toHaveBeenCalledWith(null, true);
    handler('https://blocked.test', callback);
    expect(callback.mock.calls[1][0]).toEqual(expect.any(Error));
    handler(undefined, callback);
    expect(callback.mock.calls[2][0]).toEqual(expect.any(Error));
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
    expect(isOriginAllowed('https://blocked.test', allowed)).toBe(false);
    expect(isAllowedOrigin(null, allowed)).toBe(true);
    expect(isAllowedOrigin('https://blocked.test', allowed)).toBe(false);
    expect(createCorsOptions(handler, ['GET'])).toEqual({
      origin: handler,
      methods: ['GET'],
    });
    expect(createResponse(201, { ok: true })).toEqual({
      status: 201,
      body: { ok: true },
    });
    expect(() => createCorsOriginHandler(null, allowed)).toThrow(TypeError);
    expect(() => createCorsOptions(null)).toThrow(TypeError);
  });

  test('invokes a document trigger handler and supports the default database', async () => {
    const onWrite = jest.fn(handler => handler);
    const document = jest.fn(() => ({ onWrite }));
    const handler = jest.fn().mockResolvedValue(null);
    const trigger = buildPageByNumberQuery;
    expect(trigger).toBeDefined();
    const functions = {
      region: jest.fn(() => ({ firestore: { document } })),
    };
    const { createFirestoreDocumentOnWriteTrigger } = await import(
      '../../../src/core/cloud/cloud-core.js'
    );
    const registered = createFirestoreDocumentOnWriteTrigger({
      functions,
      region: 'us-east1',
      documentPath: 'pages/{id}',
      handler,
    });
    await registered('change');
    expect(handler).toHaveBeenCalledWith('change');
  });

  test('rejects a request with no object body before token verification', async () => {
    const sendUnauthorized = jest.fn();
    const handler = createVerifyAdmin({
      verifyToken: jest.fn(),
      isAdminUid: () => true,
      sendUnauthorized,
      sendForbidden: jest.fn(),
    });
    await handler({ get: () => null, body: null }, {});
    expect(sendUnauthorized).toHaveBeenCalledWith({}, 'Missing token');
  });

  test('validates dependency collections and sends success responses', () => {
    const first = jest.fn();
    const second = jest.fn();
    expect(() =>
      assertFunctionDependencies([
        ['first', first],
        ['second', second],
      ])
    ).not.toThrow();
    expect(() => assertFunctionDependencies([['bad', null]])).toThrow(
      TypeError
    );
    expect(() =>
      assertRandomUuidAndTimestamp({
        randomUUID: first,
        getServerTimestamp: second,
      })
    ).not.toThrow();
    expect(() =>
      assertRandomUuidAndTimestamp({
        randomUUID: null,
        getServerTimestamp: second,
      })
    ).toThrow(TypeError);
    const json = jest.fn();
    sendOkResponse({ status: () => ({ json }) });
    expect(json).toHaveBeenCalledWith({ ok: true });
  });
});
