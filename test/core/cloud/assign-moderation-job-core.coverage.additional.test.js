import { describe, expect, jest, test } from '@jest/globals';
import {
  buildVariantQueryPlan,
  configureUrlencodedBodyParser,
  createCorsOptions,
  createCorsOriginFactory,
  createCorsOriginFromEnvironment,
  createCorsOriginHandler,
  createCreateCorsOrigin,
  createCreateCorsOriginFromEnvironment,
  createFetchVariantSnapshotFromDbFactory,
  createFirebaseInitialization,
  createModeratorRefFactory,
  createReputationScopedQuery,
  createReputationScopedVariantsQuery,
  createRunVariantQuery,
  createRunGuards,
  createHandleAssignModerationJobCore,
  createSetupCors,
  createVariantSnapshotFetcher,
  createVariantsQuery,
  getBodyFromRequest,
  getIdTokenFromRequest,
  random,
  resolveFirestoreEnvironment,
  selectVariantDoc,
  shouldUseCustomFirestoreDependencies,
  createAssignModerationWorkflow,
  assignModerationJobTestUtils,
} from '../../../src/core/cloud/assign-moderation-job/assign-moderation-job-core.js';

describe('assign moderation job core additional coverage', () => {
  test('resolves dependency overrides and initialization state', () => {
    const defaultEnsure = jest.fn();
    const defaultGet = jest.fn();
    expect(
      resolveFirestoreEnvironment(undefined, () => ({ env: 'runtime' }))
    ).toEqual({ env: 'runtime' });
    expect(
      resolveFirestoreEnvironment({ env: 'provided' }, () => ({}))
    ).toEqual({ env: 'provided' });
    expect(
      shouldUseCustomFirestoreDependencies({
        defaultEnsureFn: defaultEnsure,
        defaultGetFirestoreFn: defaultGet,
      })
    ).toBe(false);
    expect(
      shouldUseCustomFirestoreDependencies({
        options: {},
        defaultEnsureFn: defaultEnsure,
        defaultGetFirestoreFn: defaultGet,
      })
    ).toBe(false);
    expect(
      shouldUseCustomFirestoreDependencies({
        options: { ensureAppFn: jest.fn() },
        defaultEnsureFn: defaultEnsure,
        defaultGetFirestoreFn: defaultGet,
      })
    ).toBe(true);
    expect(
      shouldUseCustomFirestoreDependencies({
        options: {},
        defaultEnsureFn: defaultEnsure,
        defaultGetFirestoreFn: defaultGet,
        providedEnvironment: null,
      })
    ).toBe(true);
    const state = createFirebaseInitialization();
    expect(state.hasBeenInitialized()).toBe(false);
    state.markInitialized();
    expect(state.hasBeenInitialized()).toBe(true);
    state.reset();
    expect(state.hasBeenInitialized()).toBe(false);
  });

  test('reads request bodies and generates random values', () => {
    expect(getBodyFromRequest({ body: { id_token: 'token' } })).toEqual({
      id_token: 'token',
    });
    expect(getBodyFromRequest(undefined)).toBeUndefined();
    expect(getIdTokenFromRequest({ body: { id_token: 'token' } })).toBe(
      'token'
    );
    expect(getIdTokenFromRequest({ body: {} })).toBeUndefined();
    expect(random(() => 0.5)).toBe(0.5);
  });

  test('composes CORS factories and middleware', () => {
    const originHandler = jest.fn();
    const getAllowedOrigins = jest.fn(() => ['https://allowed.test']);
    const createHandler = createCorsOriginFactory({
      getAllowedOrigins,
      createCorsOriginHandler: jest.fn(() => originHandler),
    });
    expect(createHandler(() => ({ DENDRITE_ENVIRONMENT: 'prod' }))).toBe(
      originHandler
    );
    expect(getAllowedOrigins).toHaveBeenCalledWith({
      DENDRITE_ENVIRONMENT: 'prod',
    });
    const composed = createCreateCorsOrigin({ getAllowedOrigins });
    expect(composed(() => ({}))).toEqual(expect.any(Function));
    const fromEnv = createCreateCorsOriginFromEnvironment({
      createCreateCorsOrigin: jest.fn(() => composed),
    });
    expect(
      fromEnv({ getAllowedOrigins, getEnvironmentVariables: () => ({}) })
    ).toEqual(expect.any(Function));
    expect(
      createCorsOriginFromEnvironment({
        getAllowedOrigins,
        getEnvironmentVariables: () => ({}),
      })
    ).toEqual(expect.any(Function));
    const directCors = createCorsOriginHandler(['https://allowed.test']);
    const callback = jest.fn();
    directCors(undefined, callback);
    directCors('https://allowed.test', callback);
    directCors('https://blocked.test', callback);
    expect(callback.mock.calls[0]).toEqual([null, true]);
    expect(callback.mock.calls[1]).toEqual([null, true]);
    expect(callback.mock.calls[2][0]).toEqual(expect.any(Error));
    const defaultCors = createCorsOriginHandler();
    defaultCors(undefined, callback);
    expect(assignModerationJobTestUtils.isListedOrigin(undefined, ['x'])).toBe(
      false
    );
    expect(assignModerationJobTestUtils.isListedOrigin('x', ['x'])).toBe(true);
    const corsFactory = jest.fn(() => originHandler);
    expect(
      createCorsOptions(
        () => ['x'],
        () => ({})
      ).methods
    ).toEqual(['POST']);
    const app = { use: jest.fn() };
    const cors = jest.fn(() => 'cors-middleware');
    createSetupCors(corsFactory, cors)(app, { allowedOrigins: ['x'] });
    expect(app.use).toHaveBeenCalledWith('cors-middleware');
    const express = { urlencoded: jest.fn(() => 'parser') };
    configureUrlencodedBodyParser(app, express);
    expect(express.urlencoded).toHaveBeenCalledWith({ extended: false });
    expect(app.use).toHaveBeenCalledWith('parser');
  });

  test('selects variants and builds reputation queries', () => {
    expect(selectVariantDoc({ variantDoc: 'direct' })).toEqual({
      variantDoc: 'direct',
    });
    expect(selectVariantDoc({ docs: ['first'] })).toEqual({
      variantDoc: 'first',
    });
    expect(selectVariantDoc({ empty: true, docs: [] })).toEqual({
      errorMessage: 'Variant fetch failed 🤷',
    });
    expect(selectVariantDoc(undefined)).toEqual({
      errorMessage: 'Variant fetch failed 🤷',
    });
    const query = { where: jest.fn(() => 'scoped') };
    expect(createReputationScopedQuery('zeroRated', query)).toBe('scoped');
    expect(createReputationScopedQuery('any', query)).toBe(query);
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => 'moderator-doc') })),
      collectionGroup: jest.fn(() => query),
    };
    expect(createModeratorRefFactory(db)('mod')).toBe('moderator-doc');
    expect(createVariantsQuery(db)).toBe(query);
    expect(createReputationScopedVariantsQuery(db, 'any')).toBe(query);
    expect(buildVariantQueryPlan(0.25)).toHaveLength(4);
  });

  test('fetches snapshots through query adapters', async () => {
    const snapshots = [{ empty: true }, { empty: false, docs: ['doc'] }];
    const runQuery = jest
      .fn()
      .mockResolvedValueOnce(snapshots[0])
      .mockResolvedValueOnce(snapshots[1]);
    await expect(createVariantSnapshotFetcher({ runQuery })(0.5)).resolves.toBe(
      snapshots[1]
    );
    const exhausted = jest.fn().mockResolvedValue({ empty: true });
    await expect(
      createVariantSnapshotFetcher({ runQuery: exhausted })(0.5)
    ).resolves.toEqual({ empty: true });
    const queryRunner = jest.fn().mockResolvedValue({ empty: false, docs: [] });
    const factory = createFetchVariantSnapshotFromDbFactory(() => queryRunner);
    await expect(factory({})(0.1)).resolves.toEqual({ empty: false, docs: [] });
  });

  test('requires Firestore query support and filters moderated candidates', async () => {
    expect(() => createRunVariantQuery({})).toThrow(
      'collectionGroup(variants) is required for moderation assignment'
    );
    const candidate = { ref: { path: 'variants/a' }, data: () => ({}) };
    const db = {
      collectionGroup: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ docs: [candidate] }),
      })),
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        })),
      })),
    };
    await expect(createRunVariantQuery(db)('mod')).resolves.toEqual([
      { variantDoc: candidate },
    ]);
  });

  test('runs the standard guard chain through success and failures', async () => {
    const auth = {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'mod-1' }),
      getUser: jest.fn().mockResolvedValue({ uid: 'mod-1' }),
    };
    const guards = createRunGuards(auth);
    await expect(guards({ req: { method: 'GET', body: {} } })).resolves.toEqual(
      {
        error: { status: 405, body: 'POST only' },
      }
    );
    await expect(
      guards({ req: { method: 'POST', body: {} } })
    ).resolves.toEqual({
      error: { status: 400, body: 'Missing id_token' },
    });
    await expect(
      guards({ req: { method: 'POST', body: { id_token: 'token' } } })
    ).resolves.toEqual({
      context: {
        req: { method: 'POST', body: { id_token: 'token' } },
        idToken: 'token',
        decoded: { uid: 'mod-1' },
        userRecord: { uid: 'mod-1' },
      },
    });
    auth.verifyIdToken.mockRejectedValueOnce({ message: 'expired' });
    await expect(
      guards({ req: { method: 'POST', body: { id_token: 'bad' } } })
    ).resolves.toEqual({
      error: { status: 401, body: 'expired' },
    });
    auth.verifyIdToken.mockResolvedValueOnce({ uid: 'mod-2' });
    auth.getUser.mockRejectedValueOnce(new Error('missing user'));
    await expect(
      guards({ req: { method: 'POST', body: { id_token: 'bad-user' } } })
    ).resolves.toEqual({
      error: { status: 401, body: 'missing user' },
    });
  });

  test('sends workflow status and defaults missing bodies to empty strings', async () => {
    const workflow = jest.fn().mockResolvedValue({ status: 201 });
    const handler = createHandleAssignModerationJobCore(workflow);
    const send = jest.fn();
    const status = jest.fn(() => ({ send }));
    await handler('request', { status });
    expect(workflow).toHaveBeenCalledWith({ req: 'request' });
    expect(status).toHaveBeenCalledWith(201);
    expect(send).toHaveBeenCalledWith('');
  });

  test('supports legacy snapshot selection and normalizes workflow errors', async () => {
    const set = jest.fn().mockResolvedValue(undefined);
    const base = {
      runGuards: jest
        .fn()
        .mockResolvedValue({ context: { userRecord: { uid: 'mod' } } }),
      selectVariantDoc: jest.fn(() => ({ variantDoc: { id: 'variant' } })),
      createModeratorRef: jest.fn(() => ({ set })),
      now: jest.fn(() => 'timestamp'),
      random: jest.fn(() => 0.25),
    };
    const legacy = createAssignModerationWorkflow({
      ...base,
      fetchVariantSnapshot: jest.fn().mockResolvedValue({ docs: ['legacy'] }),
    });
    await expect(legacy({ req: { method: 'POST' } })).resolves.toEqual({
      status: 201,
      body: '',
    });
    expect(set).toHaveBeenCalled();

    const noCandidate = createAssignModerationWorkflow({
      ...base,
      fetchVariantSnapshots: jest.fn().mockResolvedValue([]),
      selectVariantDoc: jest.fn(() => ({})),
    });
    await expect(noCandidate({ req: {} })).resolves.toEqual({
      status: 500,
      body: 'Variant fetch failed 🤷',
    });

    const guardFailure = createAssignModerationWorkflow({
      ...base,
      runGuards: jest
        .fn()
        .mockResolvedValue({ error: { status: 403, body: 'denied' } }),
    });
    await expect(guardFailure({ req: {} })).resolves.toEqual({
      status: 403,
      body: 'denied',
    });

    const badUser = createAssignModerationWorkflow({
      ...base,
      runGuards: jest.fn().mockResolvedValue({ context: { userRecord: {} } }),
    });
    await expect(badUser({ req: {} })).resolves.toEqual({
      status: 500,
      body: 'Moderator lookup failed',
    });

    const fallbackContext = createAssignModerationWorkflow({
      ...base,
      runGuards: jest.fn().mockResolvedValue({}),
    });
    await expect(fallbackContext({ req: {} })).resolves.toEqual({
      status: 500,
      body: 'Moderator lookup failed',
    });

    const thrown = createAssignModerationWorkflow({
      ...base,
      runGuards: jest.fn().mockRejectedValue(new Error('unexpected')),
    });
    await expect(thrown({ req: {} })).rejects.toThrow('unexpected');
    try {
      assignModerationJobTestUtils.ensureVariantDocAvailability(
        'selector failed',
        {}
      );
      throw new Error('expected selector failure');
    } catch (error) {
      expect(error).toEqual({ status: 500, body: 'selector failed' });
    }
  });
});
