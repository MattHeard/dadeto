// Stryker disable all -- this module is the fixed local GCP simulator
// lifecycle and route orchestration boundary covered by focused suites.
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ADMIN_UID } from '../../commonCore.js';
import { createFakeFieldValue, createFakeFirestore } from './fake-firestore.js';
import { FakeStorage } from './fake-storage.js';
import { createProcessNewStoryHandler } from '../../process-new-story-core.js';
import { createProcessNewPageHandler } from '../../process-new-page-core.js';
import {
  createHandleSubmit,
  parseIncomingOption,
} from '../../submit-new-page-core.js';
import { createRenderContents } from '../../render-contents-core.js';
import {
  createRenderVariant,
  createHandleVariantWrite,
} from '../../render-variant-core.js';
import { createGenerateStatsCore } from '../../generate-stats-core.js';
import { createSubmitNewStoryResponder } from '../../submit-new-story-core.js';
import { getAuthorizationHeader } from '../../submit-shared.js';
import {
  createApplyCreditEvent,
  createFetchCredit,
  createFetchCreditEvents,
  createGetApiKeyCreditV2Handler,
  extractUuid,
} from '../../get-api-key-credit-v2.js';
import {
  createResolveApiKeyUuid,
  createPaymentWebhookHandler,
} from '../../payment-webhook-core.js';
import { createSearchHttpHandler } from '../../object-minute-rental-search/search-http.js';
import { createBrowserRunnerCommitmentsRepository } from '../../object-minute-rental-search/browser-runner-commitments-repository.js';
import { SOPHIE_CHARLOTTE_SERVICE_AREA } from '../../object-minute-rental-search/service-area.js';
import {
  setSimulatorHttpResponseHeader,
  sendSimulatorHttpResponse,
  logSimulatorRenderContentsError,
} from './http-response-effects.js';

const LOCAL_RUNNER_SCHEDULE = [
  {
    startTimestamp: '2026-01-01T00:00:00Z',
    endTimestamp: '2030-01-01T00:00:00Z',
  },
];

const DEFAULT_STORY_TITLE = 'E2E moderation fixture story';
const DEFAULT_FIRST_CONTENT =
  'The first seeded page invites the reader forward.';
const DEFAULT_SECOND_CONTENT = 'The second seeded page closes the loop.';
const DEFAULT_OPTION_TEXT = 'Continue to the second page';
const STORY_ID = 'gcp-test-fixture-story';
const FIRST_PAGE_NUMBER = 1;
const SECOND_PAGE_NUMBER = 2;
const FIRST_VARIANT_NAME = 'a';
const SECOND_VARIANT_NAME = 'a';
const LOCAL_ID_TOKEN = 'local-admin-token';

/** @typedef {ReturnType<typeof createFakeFirestore>} SimulatorDb */
/** @typedef {{ body?: unknown, headers?: unknown, get?: (name: string) => string | null | undefined }} SimulatorRequest */
/** @typedef {{ path: string, before?: unknown, after?: unknown }} CommittedRecord */
/** @typedef {{ pathPattern: string, eventName: 'onCreate' | 'onWrite', handler: (...args: any[]) => any }} SimulatorTrigger */
/** @typedef {{ doc: { ref: { path: string }, data?: () => unknown }, createdAt: number, rand: number, path: string }} ModerationCandidate */
/** @typedef {{ db: unknown, storage: unknown, fetchFn: (permission: import('../../../../types/allow-effects').AllowEffects, ...args: any[]) => any, bindEffectBoundary: import('../../../../types/allow-effects').AllowEffectsBoundary, projectId: string, baseUrl: string, bucketName: string, verifyIdToken: (...args: any[]) => any }} GenerateStatsSimulatorOptions */
/** @typedef {{ snapshotHelpers: ReturnType<typeof createSnapshotHelpers>, lookupHelpers: ReturnType<typeof createLookupHelpers>, authVerifiers: ReturnType<typeof createSimulatorAuthVerifiers>, fieldValue: ReturnType<typeof createFakeFieldValue>, db: SimulatorDb, randomUUID: () => string, logGenerateStatsError: (permission: import('../../../../types/allow-effects').AllowEffects, logger: { error?: (...args: unknown[]) => void }, ...args: unknown[]) => void }} SimulatorTestUtilsOptions */
/** @typedef {{ processNewStory: (...args: any[]) => any, processNewPage: (...args: any[]) => any, renderContents: (...args: any[]) => any, renderVariant: (...args: any[]) => any, handleVariantWrite: (...args: any[]) => any, bindEffectBoundary: import('../../../../types/allow-effects').AllowEffectsBoundary }} SimulatorTriggerHandlers */
/**
 * @typedef {object} SimulatorDocumentReference
 * @property {() => Promise<{data: () => {number?: number, title?: string}, id: string}>} get Fetch the parent document.
 * @property {{parent: SimulatorDocumentReference}} parent Reference to its containing collection.
 */
/**
 * @typedef {object} SimulatorModerationVariantSnapshot
 * @property {SimulatorDocumentReference & {collection: (name: string) => {get: () => Promise<{docs: Array<{data: () => {content?: string, position?: number, targetPage?: {path?: string}}}>}>}}} ref Firestore reference for the moderation variant.
 * @property {() => {authorName?: string, author?: string, content?: string}} data Read the variant data.
 */

/**
 * Build the local GCP simulator used by Playwright and local tests.
 * @param {{
 *   baseUrl?: string,
 *   bucketName?: string,
 *   projectId?: string,
 *   publicDir?: string,
 *   bindEffectBoundary?: import('../../../../types/allow-effects').AllowEffectsBoundary,
 *   saveStorageFile?: (permission: import('../../../../types/allow-effects').AllowEffects, file: object, contents: string, options: object) => Promise<unknown>,
 *   updateFirestoreDocument?: (permission: import('../../../../types/allow-effects').AllowEffects, reference: { update: (data: Record<string, unknown>) => Promise<unknown> }, data: Record<string, unknown>) => Promise<unknown>,
 *   setFirestoreDocument?: (permission: import('../../../../types/allow-effects').AllowEffects, reference: { set: (data: Record<string, unknown>) => Promise<unknown> }, data: Record<string, unknown>) => Promise<unknown>,
 * }} [options] Simulator options.
 * @returns {Promise<object>} Simulator instance.
 */
export async function createLocalGcpSimulator(options = {}) {
  const {
    baseUrl = 'http://127.0.0.1:4321',
    bucketName = 'local-static',
    projectId = 'local-project',
    publicDir = path.resolve('public'),
    bindEffectBoundary,
    saveStorageFile,
    updateFirestoreDocument,
    setFirestoreDocument,
  } = options;

  return createLocalGcpSimulatorRuntime({
    baseUrl,
    bucketName,
    projectId,
    publicDir,
    bindEffectBoundary,
    saveStorageFile,
    updateFirestoreDocument,
    setFirestoreDocument,
  });
}

/**
 * Build the local GCP simulator runtime.
 * @param {{
 *   baseUrl: string,
 *   bucketName: string,
 *   projectId: string,
 *   publicDir: string,
 *   bindEffectBoundary?: import('../../../../types/allow-effects').AllowEffectsBoundary,
 *   saveStorageFile?: (permission: import('../../../../types/allow-effects').AllowEffects, file: object, contents: string, options: object) => Promise<unknown>,
 *   updateFirestoreDocument?: (permission: import('../../../../types/allow-effects').AllowEffects, reference: { update: (data: Record<string, unknown>) => Promise<unknown> }, data: Record<string, unknown>) => Promise<unknown>,
 *   setFirestoreDocument?: (permission: import('../../../../types/allow-effects').AllowEffects, reference: { set: (data: Record<string, unknown>) => Promise<unknown> }, data: Record<string, unknown>) => Promise<unknown>,
 * }} config Simulator configuration.
 * @returns {Promise<object>} Simulator instance.
 */
async function createLocalGcpSimulatorRuntime(config) {
  return buildSimulatorApi(await buildSimulatorState(config));
}

/**
 * Require the simulator database after initialization.
 * @param {{ db: SimulatorDb | null }} context Database context.
 * @returns {SimulatorDb} Initialized simulator database.
 */
function requireSimulatorDb(context) {
  if (!context.db) throw new Error('Simulator database is not initialized');
  return context.db;
}

/**
 * Create the simulator config object.
 * @param {string} baseUrl Base URL.
 * @param {string} bucketName Bucket name.
 * @param {string} projectId Project id.
 * @returns {{
 *   submitNewStoryUrl: string,
 *   submitNewPageUrl: string,
 *   getModerationVariantUrl: string,
 *   assignModerationJobUrl: string,
 *   submitModerationRatingUrl: string,
 *   triggerRenderContentsUrl: string,
 *   markVariantDirtyUrl: string,
 *   generateStatsUrl: string,
 *   paymentWebhookUrl: string,
 *   getAuthorUuidUrl: string,
 *   objectMinuteRentalSearchUrl: string,
 *   bucketName: string,
 *   projectId: string,
 * }} Config object.
 */
function createSimulatorConfig(baseUrl, bucketName, projectId) {
  return {
    submitNewStoryUrl: `${baseUrl}/__sim/submit-new-story`,
    submitNewPageUrl: `${baseUrl}/__sim/submit-new-page`,
    getModerationVariantUrl: `${baseUrl}/__sim/get-moderation-variant`,
    assignModerationJobUrl: `${baseUrl}/__sim/assign-moderation-job`,
    submitModerationRatingUrl: `${baseUrl}/__sim/submit-moderation-rating`,
    triggerRenderContentsUrl: `${baseUrl}/__sim/trigger-render-contents`,
    markVariantDirtyUrl: `${baseUrl}/__sim/mark-variant-dirty`,
    generateStatsUrl: `${baseUrl}/__sim/generate-stats`,
    paymentWebhookUrl: `${baseUrl}/__sim/payment-webhook`,
    getAuthorUuidUrl: `${baseUrl}/__sim/get-author-uuid-v2`,
    objectMinuteRentalSearchUrl: `${baseUrl}/__sim/object-minute-rental-search`,
    bucketName,
    projectId,
  };
}

/**
 * Create the seed manifest for the fixture story.
 * @param {string} bucketName Bucket name.
 * @returns {{idToken: string, storyTitle: string, contentsPath: string, statsPath: string, moderation: {firstContent: string, secondContent: string}, story: {firstPagePath: string, secondPagePath: string, optionText: string}, expectedStatsAfterModeration: {storyCount: number, pageCount: number, unmoderatedPageCount: number}, environment: string, staticBucket: string}} Seed manifest.
 */
function createSeedManifest(bucketName) {
  return {
    idToken: LOCAL_ID_TOKEN,
    storyTitle: DEFAULT_STORY_TITLE,
    contentsPath: '/index.html',
    statsPath: '/stats.html',
    moderation: {
      firstContent: DEFAULT_FIRST_CONTENT,
      secondContent: DEFAULT_SECOND_CONTENT,
    },
    story: {
      firstPagePath: `/p/${FIRST_PAGE_NUMBER}${FIRST_VARIANT_NAME}.html`,
      secondPagePath: `/p/${SECOND_PAGE_NUMBER}${SECOND_VARIANT_NAME}.html`,
      optionText: DEFAULT_OPTION_TEXT,
    },
    expectedStatsAfterModeration: {
      storyCount: 1,
      pageCount: 2,
      unmoderatedPageCount: 1,
    },
    environment: 'local',
    staticBucket: bucketName,
  };
}

/**
 * Create a cleanup function for the simulator storage root.
 * @param {string} storageRoot Temporary storage root.
 * @returns {() => Promise<void>} Cleanup function.
 */
function createClear(storageRoot) {
  return async () => {
    await rm(storageRoot, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 50,
    });
  };
}

/**
 * Create the temporary storage root for the simulator.
 * @returns {Promise<string>} Storage root path.
 */
async function createStorageRoot() {
  return mkdtemp(path.join(os.tmpdir(), 'dadeto-gcp-sim-'));
}

/**
 * Create the simulator storage wrapper.
 * @param {string} storageRoot Storage root path.
 * @returns {FakeStorage} Fake storage instance.
 */
function createStorage(storageRoot) {
  return new FakeStorage({ rootDir: storageRoot });
}

/**
 * Create the simulator Firestore instance.
 * @param {(records: Array<{path: string, before?: unknown, after?: unknown}>) => Promise<void>|void} onCommit Commit callback.
 * @returns {ReturnType<typeof createFakeFirestore>} Fake Firestore instance.
 */
function createDb(onCommit) {
  return createFakeFirestore({ onCommit });
}

/**
 * Create a dispatch function for committed Firestore writes.
 * @param {{
 *   triggerRegistry: SimulatorTrigger[],
 *   createSnapshots: (pathValue: string, before: unknown, after: unknown) => { before: unknown, after: unknown },
 *   shouldDispatchTrigger: (trigger: Pick<SimulatorTrigger, 'pathPattern' | 'eventName'>, pathValue: string, isCreate: boolean, isWrite: boolean) => boolean,
 *   dispatchTrigger: (trigger: Pick<SimulatorTrigger, 'eventName' | 'handler'>, snapshots: { before: unknown, after: unknown }, context: { params: Record<string, string> }) => Promise<void>,
 *   extractParams: (pathPattern: string, pathValue: string) => Record<string, string> | null,
 * }} deps Dispatch dependencies.
 * @returns {(records: Array<{ path: string, before?: unknown, after?: unknown }>) => Promise<void>} Dispatch function.
 */
function createDispatchCommittedWrites(deps) {
  return async records => {
    for (const record of records) {
      const snapshots = deps.createSnapshots(
        record.path,
        record.before,
        record.after
      );
      const isCreate = !record.before && Boolean(record.after);
      const isWrite = Boolean(record.before || record.after);

      for (const trigger of deps.triggerRegistry) {
        if (
          !deps.shouldDispatchTrigger(trigger, record.path, isCreate, isWrite)
        ) {
          continue;
        }

        const context = {
          params: deps.extractParams(trigger.pathPattern, record.path) ?? {},
        };
        await deps.dispatchTrigger(trigger, snapshots, context);
      }
    }
  };
}

/**
 * Register a trigger handler for a Firestore path pattern.
 * @param {SimulatorTrigger[]} triggerRegistry
 *   Trigger registry.
 * @param {string} pathPattern Firestore path pattern.
 * @param {'onCreate' | 'onWrite'} eventName Trigger event name.
 * @param {SimulatorTrigger['handler']} handler
 *   Trigger handler.
 * @returns {void}
 */
function registerTrigger(triggerRegistry, pathPattern, eventName, handler) {
  triggerRegistry.push({ pathPattern, eventName, handler });
}

/**
 * Register all trigger registrations grouped by event.
 * @param {SimulatorTrigger[]} triggerRegistry
 *   Trigger registry.
 * @param {Record<string, Array<{ pathPattern: string, handler: SimulatorTrigger['handler'] }>>} triggerRegistrationsByEvent
 *   Trigger registrations grouped by event.
 * @returns {void}
 */
function registerTriggerRegistrationsByEvent(
  triggerRegistry,
  triggerRegistrationsByEvent
) {
  for (const eventName of /** @type {Array<'onCreate'|'onWrite'>} */ (
    Object.keys(triggerRegistrationsByEvent)
  )) {
    const registrations = triggerRegistrationsByEvent[eventName];
    for (const registration of registrations) {
      registerTrigger(
        triggerRegistry,
        registration.pathPattern,
        eventName,
        registration.handler
      );
    }
  }
}

/**
 * Build the exported simulator API from state.
 * @param {object} state Simulator state.
 * @returns {object} Simulator instance.
 */
function buildSimulatorApi(state) {
  return state;
}

/**
 * Build simulator state and handlers.
 * @param {{
 *   baseUrl: string,
 *   bucketName: string,
 *   projectId: string,
 *   publicDir: string,
 *   bindEffectBoundary?: import('../../../../types/allow-effects').AllowEffectsBoundary,
 *   saveStorageFile?: (permission: import('../../../../types/allow-effects').AllowEffects, file: object, contents: string, options: object) => Promise<unknown>,
 *   updateFirestoreDocument?: (permission: import('../../../../types/allow-effects').AllowEffects, reference: { update: (data: Record<string, unknown>) => Promise<unknown> }, data: Record<string, unknown>) => Promise<unknown>,
 *   setFirestoreDocument?: (permission: import('../../../../types/allow-effects').AllowEffects, reference: { set: (data: Record<string, unknown>) => Promise<unknown> }, data: Record<string, unknown>) => Promise<unknown>,
 * }} config Simulator configuration.
 * @returns {Promise<object>} Simulator state.
 */
async function buildSimulatorState(config) {
  const {
    baseUrl,
    bucketName,
    projectId,
    publicDir,
    saveStorageFile,
    updateFirestoreDocument,
    setFirestoreDocument,
  } = config;
  if (typeof config.bindEffectBoundary !== 'function') {
    throw new TypeError('bindEffectBoundary must be provided');
  }
  const bindEffectBoundary =
    /** @type {import('../../../../types/allow-effects').AllowEffectsBoundary} */ (
      config.bindEffectBoundary
    );
  const storageRoot = await createStorageRoot();
  const storage = createStorage(storageRoot);
  const fieldValue = createFakeFieldValue();
  /** @type {SimulatorTrigger[]} */
  const triggerRegistry = [];
  /** @type {{ db: SimulatorDb | null }} */
  const dbContext = { db: null };
  const snapshotHelpers = createSnapshotHelpers(dbContext);
  const dispatchCommittedWrites = createDispatchCommittedWrites({
    triggerRegistry,
    createSnapshots: snapshotHelpers.createSnapshots,
    shouldDispatchTrigger,
    dispatchTrigger,
    extractParams,
  });
  const db = createDb(dispatchCommittedWrites);
  dbContext.db = db;
  const localFetch = createLocalFetchStub();
  const fetchFn = (
    /** @type {import('../../../../types/allow-effects').AllowEffects} */ permission,
    /** @type {string} */ input,
    /** @type {object | undefined} */ init
  ) => {
    void permission;
    return localFetch(input, init);
  };
  /** @type {Parameters<typeof createRenderContents>[0]['saveRenderedPage']} */
  const saveRenderedPage = (permission, filePath, content, options) => {
    void permission;
    void options;
    return storage.bucket(bucketName).file(filePath).save(content);
  };
  const renderConfig = {
    db: /** @type {Parameters<typeof createRenderContents>[0]['db']} */ (
      /** @type {unknown} */ (db)
    ),
    storage,
    fetchFn,
    saveRenderedPage,
    saveStorageFile,
    updateFirestoreDocument,
    setFirestoreDocument,
    randomUUID,
    bucketName,
    objectPrefix: '',
    projectId,
    bindEffectBoundary,
    setHttpResponseHeader: setSimulatorHttpResponseHeader,
    sendHttpResponse: sendSimulatorHttpResponse,
    logError: logSimulatorRenderContentsError,
    effectFetchFn: (
      /** @type {import('../../../../types/allow-effects').AllowEffects} */ permission,
      /** @type {string} */ url,
      /** @type {object | undefined} */ init
    ) => fetchFn(permission, url, init),
  };

  const renderContents = createRenderContents(
    /** @type {Parameters<typeof createRenderContents>[0]} */ (
      /** @type {unknown} */ (renderConfig)
    )
  );
  const renderVariant = createRenderVariant(
    /** @type {Parameters<typeof createRenderVariant>[0]} */ (
      /** @type {unknown} */ (renderConfig)
    )
  );

  const handleVariantWrite = createHandleVariantWrite({
    renderVariant,
    getDeleteSentinel: createDeleteSentinelGetter(fieldValue),
    updateDocument: (permission, reference, data) => {
      void permission;
      return /** @type {{ update: (value: Record<string, unknown>) => Promise<unknown> }} */ (
        /** @type {unknown} */ (reference)
      ).update(data);
    },
    db: /** @type {Parameters<typeof createHandleVariantWrite>[0]['db']} */ (
      /** @type {unknown} */ (db)
    ),
  });

  const authVerifiers = createSimulatorAuthVerifiers();
  const generateStatsConfig = createGenerateStatsConfig({
    db,
    storage,
    fetchFn,
    bindEffectBoundary,
    projectId,
    baseUrl,
    bucketName,
    verifyIdToken: authVerifiers.verifyStatsIdToken,
  });
  const generateStatsCore = createGenerateStatsCore(
    /** @type {Parameters<typeof createGenerateStatsCore>[0]} */ (
      /** @type {unknown} */ (generateStatsConfig)
    )
  );

  const processWriteContext = {
    db,
    fieldValue,
    randomUUID,
    random: createRandomSource,
  };
  const processNewStory = createProcessNewStoryHandler(
    /** @type {Parameters<typeof createProcessNewStoryHandler>[0]} */ (
      /** @type {unknown} */ (processWriteContext)
    )
  );
  const processNewPage = createProcessNewPageHandler(
    /** @type {Parameters<typeof createProcessNewPageHandler>[0]} */ (
      /** @type {unknown} */ (processWriteContext)
    )
  );
  const lookupHelpers = createLookupHelpers(db);
  const submitNewPageConfig = createSubmitNewPageConfig({
    verifyIdToken: authVerifiers.verifySubmitNewPageIdToken,
    db,
    findExistingOptionPath: lookupHelpers.findExistingOptionPath,
    findExistingPagePath: lookupHelpers.findExistingPagePath,
  });
  const submitNewPage = createHandleSubmit(
    /** @type {Parameters<typeof createHandleSubmit>[0]} */ (
      /** @type {unknown} */ (submitNewPageConfig)
    )
  );

  const submitNewStoryConfig = createSubmitNewStoryConfig({
    verifyIdToken: authVerifiers.verifySubmitNewStoryIdToken,
    db,
  });
  const submitNewStory = createSubmitNewStoryResponder(
    /** @type {Parameters<typeof createSubmitNewStoryResponder>[0]} */ (
      /** @type {unknown} */ (submitNewStoryConfig)
    )
  );
  const getAuthorUuid = (/** @type {SimulatorRequest} */ request) =>
    handleGetAuthorUuid(
      {
        db,
        verifyIdToken: authVerifiers.verifySimulatorIdToken,
        randomUUID,
      },
      request
    );
  const simulatorCreditDb =
    /** @type {Parameters<typeof createFetchCredit>[0]} */ (
      /** @type {unknown} */ (db)
    );
  const getApiKeyCreditV2 = createGetApiKeyCreditV2Handler({
    fetchCredit: createFetchCredit(simulatorCreditDb),
    fetchCreditEvents: createFetchCreditEvents(simulatorCreditDb),
    applyCreditEvent: createApplyCreditEvent(simulatorCreditDb),
    getUuid: extractUuid,
    logError: error => console.error(error),
  });
  const resolveApiKeyUuid = createResolveApiKeyUuid({
    findApiKeyUuidByCustomerId: async customerId => {
      const snap = await db
        .collection('payment-customers')
        .doc(customerId)
        .get();
      const apiKeyUuid = readRecord(snap.data()).apiKeyUuid;
      return resolvePaymentCustomerApiKeyUuid(apiKeyUuid);
    },
  });
  const paymentWebhook = createPaymentWebhookHandler({
    fetchCredit: createFetchCredit(simulatorCreditDb),
    applyCreditEvent: createApplyCreditEvent(simulatorCreditDb),
    resolveApiKeyUuid,
    isDuplicateEvent: async eventId => {
      const snap = await db.collection('payment-events').doc(eventId).get();
      return snap.exists;
    },
    markProcessedEvent: async (permission, event, uuid, status) => {
      void permission;
      await db
        .collection('payment-events')
        .doc(event.id)
        .set({
          apiKeyUuid: uuid,
          type: event.type,
          createdAt: resolvePaymentCreatedAt(event),
          status,
        });
    },
  });
  const searchHttp = createSearchHttpHandler({
    runnerCommitmentsRepository: createBrowserRunnerCommitmentsRepository(),
    serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
    runnerScheduleProvider: { getSchedule: async () => LOCAL_RUNNER_SCHEDULE },
    clock: () => new Date('2026-01-01T15:00:00Z'),
  });
  const objectMinuteRentalSearch = (/** @type {SimulatorRequest} */ request) =>
    runSearchHttp(searchHttp, request);
  const testUtils = createSimulatorTestUtils({
    snapshotHelpers,
    lookupHelpers,
    authVerifiers,
    fieldValue,
    db,
    randomUUID,
    logGenerateStatsError: generateStatsConfig.logError,
  });

  await seedStaticFixture(storage, bucketName);
  await createSeedFixture(db)();

  registerTriggerRegistrationsByEvent(
    triggerRegistry,
    createTriggerRegistrationsByEvent({
      processNewStory,
      processNewPage,
      renderContents,
      renderVariant,
      handleVariantWrite,
      bindEffectBoundary,
    })
  );
  return buildSimulatorApi({
    baseUrl,
    bucketName,
    projectId,
    publicDir,
    storageRoot,
    db,
    storage,
    fieldValue,
    submitNewStory,
    getApiKeyCreditV2,
    objectMinuteRentalSearch,
    generateStatsCore,
    renderContents,
    renderVariant,
    handleVariantWrite,
    getConfig: createGetSimulatorConfig(baseUrl, bucketName, projectId),
    getSeedManifest: createGetSeedManifest(bucketName),
    testUtils,
    verifyIdToken: authVerifiers.verifySimulatorIdToken,
    clear: createClear(storageRoot),
    dispatchCommittedWrites,
    routes: createRoutes({
      submitNewStory,
      submitNewPage,
      getApiKeyCreditV2,
      getAuthorUuid,
      paymentWebhook,
      bindEffectBoundary,
      db,
      fieldValue,
      renderContents,
      generateStatsCore,
      objectMinuteRentalSearch,
    }),
  });
}

/**
 * Create trigger snapshot helpers bound to the simulator database context.
 * @param {{ db: SimulatorDb | null }} dbContext Database context.
 * @returns {{ createSnapshot: (pathValue: string, data: unknown) => unknown, createSnapshots: (pathValue: string, before: unknown, after: unknown) => { before: unknown, after: unknown } }} Snapshot helpers.
 */
function createSnapshotHelpers(dbContext) {
  return {
    createSnapshot: (pathValue, data) =>
      createSnapshot(dbContext, pathValue, data),
    createSnapshots: (pathValue, before, after) =>
      createSnapshots(dbContext, pathValue, before, after),
  };
}

/**
 * Build before/after snapshots for a write event.
 * @param {{ db: SimulatorDb | null }} dbContext Database context.
 * @param {string} pathValue Document path.
 * @param {unknown} before Previous document value.
 * @param {unknown} after Next document value.
 * @returns {{ before: unknown, after: unknown }} Snapshot pair.
 */
function createSnapshots(dbContext, pathValue, before, after) {
  return {
    before: createSnapshot(dbContext, pathValue, before),
    after: createSnapshot(dbContext, pathValue, after),
  };
}

/**
 * Seed the static contents page without invoking Firestore render triggers.
 * @param {FakeStorage} storage Simulator storage.
 * @param {string} bucketName Static bucket name.
 * @returns {Promise<void>} Nothing.
 */
async function seedStaticFixture(storage, bucketName) {
  const bucket = storage.bucket(bucketName);
  await Promise.all([
    bucket
      .file('index.html')
      .save(
        `<!doctype html><html><body><h1>${DEFAULT_STORY_TITLE}</h1><h2>Contents</h2></body></html>`
      ),
    bucket
      .file('p/1a.html')
      .save(
        `<!doctype html><html><body><h1>${DEFAULT_STORY_TITLE}</h1></body></html>`
      ),
    bucket
      .file('pending/gcp-test-fixture-story.json')
      .save(JSON.stringify({ path: 'p/1a.html' })),
  ]);
}

/**
 * Build a snapshot-like object for a path and payload.
 * @param {{ db: SimulatorDb | null }} dbContext Database context.
 * @param {string} pathValue Document path.
 * @param {unknown} data Document payload.
 * @returns {unknown} Snapshot object.
 */
function createSnapshot(dbContext, pathValue, data) {
  const db = requireSimulatorDb(dbContext);

  if (data === undefined) {
    const ref = db.doc(pathValue);
    return {
      exists: false,
      id: ref.id,
      ref,
      data: () => undefined,
    };
  }

  return db.__resolveDocumentSnapshot(pathValue);
}

/**
 * Create a delete sentinel getter for write handlers.
 * @param {{ delete: () => unknown }} fieldValue Fake field value helper.
 * @returns {() => unknown} Delete sentinel getter.
 */
function createDeleteSentinelGetter(fieldValue) {
  return () => fieldValue.delete();
}

/**
 * Create simulator auth verifier functions.
 * @returns {{ verifyStatsIdToken: (token: string | undefined) => Promise<{ uid: string | null, token?: string }>, verifySubmitNewPageIdToken: (token: string | undefined) => Promise<{ uid: string | null, token?: string }>, verifySubmitNewStoryIdToken: (token: string | undefined) => Promise<{ uid: string | null, token?: string }>, verifySimulatorIdToken: (token: string | undefined) => Promise<{ uid: string | null, token?: string }> }} Auth verifiers.
 */
function createSimulatorAuthVerifiers() {
  return {
    verifyStatsIdToken: async token => createAuthResult(token, true),
    verifySubmitNewPageIdToken: async token => createAuthResult(token, false),
    verifySubmitNewStoryIdToken: async token => createAuthResult(token, false),
    verifySimulatorIdToken: async token => createAuthResult(token, true),
  };
}

/**
 * Create generate-stats dependencies for the simulator.
 * @param {GenerateStatsSimulatorOptions} options Config dependencies.
 * @returns {Record<string, unknown> & { logError: (permission: import('../../../../types/allow-effects').AllowEffects, logger: { error?: (...args: unknown[]) => void }, ...args: unknown[]) => void }} Generate stats config.
 */
function createGenerateStatsConfig(options) {
  return {
    db: options.db,
    auth: { verifyIdToken: options.verifyIdToken },
    storage: options.storage,
    fetchFn: options.fetchFn,
    sendHttpResponse: (
      /** @type {import('../../../../types/allow-effects').AllowEffects} */ _permission,
      /** @type {import('../../../../types/native-http').NativeHttpResponse} */ res,
      /** @type {{ status: number, body: unknown, method: 'send' | 'json' }} */ response
    ) => {
      const result = res.status(response.status);
      result[response.method](response.body);
    },
    logError: (
      /** @type {import('../../../../types/allow-effects').AllowEffects} */ _permission,
      /** @type {{ error?: (...args: unknown[]) => void }} */ logger,
      /** @type {unknown[]} */ ...args
    ) => logger.error?.(...args),
    logWarning: (
      /** @type {import('../../../../types/allow-effects').AllowEffects} */ _permission,
      /** @type {{ warn?: (...args: unknown[]) => void }} */ logger,
      /** @type {unknown[]} */ ...args
    ) => logger.warn?.(...args),
    effectFetchFn: (
      /** @type {import('../../../../types/allow-effects').AllowEffects} */ permission,
      /** @type {[string, object?]} */ ...args
    ) => options.fetchFn(permission, ...args),
    bindEffectBoundary: options.bindEffectBoundary,
    env: {
      GOOGLE_CLOUD_PROJECT: options.projectId,
      GCLOUD_PROJECT: options.projectId,
      DENDRITE_ENVIRONMENT: 't-local',
      PLAYWRIGHT_ORIGIN: options.baseUrl,
      STATIC_BUCKET_NAME: options.bucketName,
    },
    cryptoModule: { randomUUID },
    console,
  };
}

/**
 * Create lookup helpers that query the fake Firestore graph.
 * @param {SimulatorDb} db Simulator database.
 * @returns {{ findExistingPagePath: (pageNumber: number) => Promise<string | null>, findExistingOptionPath: (option: unknown) => Promise<string | null> }} Lookup helpers.
 */
function createLookupHelpers(db) {
  return {
    findExistingPagePath: pageNumber => findExistingPagePath(db, pageNumber),
    findExistingOptionPath: option => findExistingOptionPath(db, option),
  };
}

/**
 * Find a page document path for a page number.
 * @param {SimulatorDb} db Simulator database.
 * @param {number} pageNumber Page number to look up.
 * @returns {Promise<string | null>} Matching page path or null.
 */
async function findExistingPagePath(db, pageNumber) {
  const pageSnap = await db
    .collectionGroup('pages')
    .where('number', '==', pageNumber)
    .limit(1)
    .get();
  if (pageSnap.empty) {
    return null;
  }

  return pageSnap.docs[0].ref.path;
}

/**
 * Find an option document path for a submission option.
 * @param {SimulatorDb} db Simulator database.
 * @param {unknown} option Option descriptor.
 * @returns {Promise<string | null>} Matching option path or null.
 */
async function findExistingOptionPath(db, option) {
  const typed = parseOptionLookup(option);
  if (!typed) {
    return null;
  }

  const pagePath = await findExistingPagePath(db, typed.pageNumber);
  if (!pagePath) {
    return null;
  }

  const pageRef = db.doc(pagePath);
  const variantSnap = await pageRef
    .collection('variants')
    .where('name', '==', typed.variantName)
    .limit(1)
    .get();
  if (variantSnap.empty) {
    return null;
  }

  const optionSnap = await variantSnap.docs[0].ref
    .collection('options')
    .where('position', '==', typed.optionNumber)
    .limit(1)
    .get();
  if (optionSnap.empty) {
    return null;
  }

  return optionSnap.docs[0].ref.path;
}

/**
 * Create submit-new-page dependencies for the simulator.
 * @param {{ verifyIdToken: (token: string | undefined) => Promise<{uid: string | null, token?: string}>, db: SimulatorDb, findExistingOptionPath: (option: unknown) => Promise<string | null>, findExistingPagePath: (pageNumber: number) => Promise<string | null> }} options Dependencies.
 * @returns {object} Submit-new-page config.
 */
function createSubmitNewPageConfig(options) {
  const { verifyIdToken, db, findExistingOptionPath, findExistingPagePath } =
    options;
  return {
    verifyIdToken,
    randomUUID,
    saveSubmission: (
      /** @type {import('../../../../types/allow-effects').AllowEffects} */ permission,
      /** @type {string} */ id,
      /** @type {Record<string, unknown>} */ submission
    ) => db.collection('pageFormSubmissions').doc(id).set(submission),
    serverTimestamp: () => new Date(),
    parseIncomingOption,
    findExistingOption: (/** @type {unknown} */ option) =>
      findExistingOptionPath(option),
    findExistingPage: (/** @type {number} */ pageNumber) =>
      findExistingPagePath(pageNumber),
  };
}

/**
 * Create submit-new-story dependencies for the simulator.
 * @param {{ verifyIdToken: (token: string | undefined) => Promise<{uid: string | null, token?: string}>, db: SimulatorDb }} options Dependencies.
 * @returns {object} Submit-new-story config.
 */
function createSubmitNewStoryConfig(options) {
  const { verifyIdToken, db } = options;
  return {
    verifyIdToken,
    saveSubmission: (
      /** @type {import('../../../../types/allow-effects').AllowEffects} */ permission,
      /** @type {string} */ id,
      /** @type {Record<string, unknown>} */ submission
    ) => db.collection('storyFormSubmissions').doc(id).set(submission),
    randomUUID,
    getServerTimestamp: () => new Date(),
  };
}

/**
 * Create test utilities exposed by the simulator.
 * @param {SimulatorTestUtilsOptions} options Utility dependencies.
 * @returns {Record<string, unknown> & { logGenerateStatsError: (permission: import('../../../../types/allow-effects').AllowEffects, logger: { error?: (...args: unknown[]) => void }, ...args: unknown[]) => void }} Test utility bag.
 */
function createSimulatorTestUtils(options) {
  return {
    logGenerateStatsError: options.logGenerateStatsError,
    resolveTargetPageNumber: getTargetPageNumber,
    extractParams,
    matchesTrigger,
    parseOptionLookup,
    findExistingPagePath: options.lookupHelpers.findExistingPagePath,
    findExistingOptionPath: options.lookupHelpers.findExistingOptionPath,
    createSnapshot: options.snapshotHelpers.createSnapshot,
    createSnapshots: options.snapshotHelpers.createSnapshots,
    createDeleteSentinel: createDeleteSentinelGetter(options.fieldValue),
    markVariantDirty: (
      /** @type {SimulatorRequest} */ request,
      overrideDb = null
    ) => handleMarkVariantDirty({ db: overrideDb ?? options.db }, request),
    createLocalFetchStub,
    createRandomSource,
    generateStatsVerifyIdToken: options.authVerifiers.verifyStatsIdToken,
    submitNewPageVerifyIdToken:
      options.authVerifiers.verifySubmitNewPageIdToken,
    submitNewStoryVerifyIdToken:
      options.authVerifiers.verifySubmitNewStoryIdToken,
    requireSimulatorDb,
    readVerifiedUid,
    resolveAuthorUuidInSimulator: (/** @type {SimulatorRequest} */ request) =>
      resolveAuthorUuidInSimulator(
        {
          verifyIdToken: async () => ({ uid: null }),
          db: options.db,
          randomUUID: options.randomUUID,
        },
        request
      ),
    assignModerationJob: (
      /** @type {SimulatorRequest} */ request,
      overrideDb = null
    ) => handleAssignModerationJob({ db: overrideDb ?? options.db }, request),
    createDispatchCommittedWrites,
  };
}

/**
 * Create trigger registrations for simulator-backed cloud handlers.
 * @param {SimulatorTriggerHandlers} handlers Trigger handlers.
 * @returns {Record<string, Array<{ pathPattern: string, handler: (...args: any[]) => any }>>} Registrations by event.
 */
function createTriggerRegistrationsByEvent(handlers) {
  return {
    onCreate: [
      {
        pathPattern: 'storyFormSubmissions/{subId}',
        handler: handlers.processNewStory,
      },
      {
        pathPattern: 'pageFormSubmissions/{subId}',
        handler: handlers.processNewPage,
      },
      {
        pathPattern: 'stories/{storyId}',
        handler: handlers.renderContents,
      },
      {
        pathPattern: 'stories/{storyId}/pages/{pageId}/variants/{variantId}',
        handler: handlers.renderVariant,
      },
    ],
    onWrite: [
      {
        pathPattern: 'stories/{storyId}/pages/{pageId}/variants/{variantId}',
        handler: change =>
          handlers.bindEffectBoundary(permission =>
            handlers.handleVariantWrite(permission, change)
          ),
      },
    ],
  };
}

/**
 * Create a fixture seeding function.
 * @param {ReturnType<typeof createDb>} db Simulator database.
 * @returns {() => Promise<void>} Fixture seeder.
 */
function createSeedFixture(db) {
  return async () => seedFixture(db);
}

/**
 * Seed the simulator with the fixture story graph.
 * @param {ReturnType<typeof createDb>} db Simulator database.
 * @returns {Promise<void>} Nothing.
 */
async function seedFixture(db) {
  const storyRef = db.collection('stories').doc(STORY_ID);
  const firstPageRef = storyRef
    .collection('pages')
    .doc(String(FIRST_PAGE_NUMBER));
  const secondPageRef = storyRef
    .collection('pages')
    .doc(String(SECOND_PAGE_NUMBER));
  const firstVariantRef = firstPageRef
    .collection('variants')
    .doc(FIRST_VARIANT_NAME);
  const secondVariantRef = secondPageRef
    .collection('variants')
    .doc(SECOND_VARIANT_NAME);

  await db
    .batch()
    .set(storyRef, {
      title: DEFAULT_STORY_TITLE,
      rootPage: firstPageRef,
    })
    .set(firstPageRef, {
      number: FIRST_PAGE_NUMBER,
    })
    .set(secondPageRef, {
      number: SECOND_PAGE_NUMBER,
    })
    .set(firstVariantRef, {
      name: FIRST_VARIANT_NAME,
      content: DEFAULT_FIRST_CONTENT,
      authorName: 'Fixture Author',
      visibility: 1,
      dirty: true,
      rand: 0.2,
      moderatorReputationSum: 1,
      moderationRatingCount: 1,
    })
    .set(secondVariantRef, {
      name: SECOND_VARIANT_NAME,
      content: DEFAULT_SECOND_CONTENT,
      authorName: 'Fixture Author',
      visibility: 1,
      dirty: true,
      rand: 0.8,
      moderatorReputationSum: 0,
      moderationRatingCount: 0,
    })
    .set(firstVariantRef.collection('options').doc('continue'), {
      content: DEFAULT_OPTION_TEXT,
      position: 0,
      targetPage: secondPageRef,
    })
    .set(db.collection('storyStats').doc(STORY_ID), {
      variantCount: 2,
    })
    .set(db.collection('moderators').doc(ADMIN_UID), {
      variant: firstVariantRef.path,
      createdAt: new Date(),
    })
    .set(db.collection('payment-customers').doc('cus_e2e_mapping'), {
      apiKeyUuid: '33333333-3333-4333-8333-333333333333',
    })
    .commit();
}

/**
 * Test whether a path matches a trigger pattern.
 * @param {string} pathPattern Trigger pattern.
 * @param {string} pathValue Actual path.
 * @returns {boolean} Whether the pattern matches.
 */
function matchesTrigger(pathPattern, pathValue) {
  return Boolean(extractParams(pathPattern, pathValue));
}

/**
 * Extract trigger params from a matching path.
 * @param {string} pathPattern Trigger pattern.
 * @param {string} pathValue Actual path.
 * @returns {Record<string, string> | null} Trigger params or null.
 */
function extractParams(pathPattern, pathValue) {
  const patternSegments = split(pathPattern);
  const pathSegments = split(pathValue);
  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  /** @type {Record<string, string>} */
  const params = {};
  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];
    if (isParam(patternSegment)) {
      params[patternSegment.slice(1, -1)] = pathSegment;
      continue;
    }

    if (patternSegment !== pathSegment) {
      return null;
    }
  }

  return params;
}

/**
 * Split a path into trimmed segments.
 * @param {string} value Path string.
 * @returns {string[]} Path segments.
 */
function split(value) {
  return String(value).replace(/^\/+/, '').replace(/\/+$/, '').split('/');
}

/**
 * Check whether a segment is a trigger parameter.
 * @param {string} segment Path segment.
 * @returns {boolean} True when the segment is a parameter.
 */
function isParam(segment) {
  return segment.startsWith('{') && segment.endsWith('}');
}

/**
 * Create a simulator config getter.
 * @param {string} baseUrl Base URL.
 * @param {string} bucketName Bucket name.
 * @param {string} projectId Project id.
 * @returns {() => ReturnType<typeof createSimulatorConfig>} Config getter.
 */
function createGetSimulatorConfig(baseUrl, bucketName, projectId) {
  return () => createSimulatorConfig(baseUrl, bucketName, projectId);
}

/**
 * Create a seed manifest getter.
 * @param {string} bucketName Bucket name.
 * @returns {() => ReturnType<typeof createSeedManifest>} Manifest getter.
 */
function createGetSeedManifest(bucketName) {
  return () => createSeedManifest(bucketName);
}

/**
 * Build the simulator routes.
 * @param {{ submitNewStory: (...args: any[]) => any, submitNewPage: (...args: any[]) => any, getApiKeyCreditV2: (...args: any[]) => any, getAuthorUuid: (...args: any[]) => any, paymentWebhook: (...args: any[]) => any, bindEffectBoundary: import('../../../../types/allow-effects').AllowEffectsBoundary, objectMinuteRentalSearch: (request: SimulatorRequest) => Promise<{status: number, body: unknown}>, db: ReturnType<typeof createDb>, fieldValue: ReturnType<typeof createFakeFieldValue>, renderContents: (...args: any[]) => any, generateStatsCore: { generate: (...args: any[]) => any } }} deps Route dependencies.
 * @returns {Record<string, (...args: any[]) => Promise<{ status: number, body?: unknown }>>} Route map.
 */
function createRoutes(deps) {
  return {
    submitNewStory: (
      /** @type {import('../../../../types/allow-effects').AllowEffects} */ permission,
      /** @type {SimulatorRequest} */ request
    ) => handleSubmitNewStory(permission, deps, request),
    submitNewPage: (
      /** @type {import('../../../../types/allow-effects').AllowEffects} */ permission,
      /** @type {SimulatorRequest} */ request
    ) => handleSubmitNewPage(permission, deps, request),
    getApiKeyCreditV2: request => handleGetApiKeyCreditV2(deps, request),
    getAuthorUuid: request => deps.getAuthorUuid(request),
    paymentWebhook: request => handlePaymentWebhook(deps, request),
    getModerationVariant: request => handleGetModerationVariant(deps, request),
    assignModerationJob: request => handleAssignModerationJob(deps, request),
    submitModerationRating: request =>
      handleSubmitModerationRating(deps, request),
    triggerRenderContents: () => handleTriggerRenderContents(deps),
    markVariantDirty: request => handleMarkVariantDirty(deps, request),
    generateStats: () => handleGenerateStats(deps),
    objectMinuteRentalSearch: request => deps.objectMinuteRentalSearch(request),
  };
}

/**
 * Invoke the Express-shaped search handler using the simulator route contract.
 * @param {ReturnType<typeof createSearchHttpHandler>} handler Search handler.
 * @param {SimulatorRequest} request Simulator request.
 * @returns {Promise<{status: number, body: unknown}>} Route response.
 */
async function runSearchHttp(handler, request) {
  let status = 200;
  let body;
  const res = {
    json(/** @type {unknown} */ value) {
      body = value;
    },
    status(/** @type {number} */ code) {
      status = code;
      return res;
    },
  };
  await handler(request, res);
  return { status, body };
}

/**
 * Resolve a payment customer mapping value to a string or null.
 * @param {unknown} apiKeyUuid Candidate UUID.
 * @returns {string | null} Normalized UUID.
 */
export function resolvePaymentCustomerApiKeyUuid(apiKeyUuid) {
  if (typeof apiKeyUuid === 'string' && apiKeyUuid) {
    return apiKeyUuid;
  }

  return null;
}

/**
 * Resolve a payment event creation timestamp for stored processing metadata.
 * @param {{ created?: number }} event Payment event.
 * @returns {Date} Created-at timestamp.
 */
export function resolvePaymentCreatedAt(event) {
  if (typeof event.created === 'number' && Number.isFinite(event.created)) {
    return new Date(event.created * 1000);
  }

  return new Date(Date.now());
}

/**
 * Run the submit-new-story route handler.
 * @param {import('../../../../types/allow-effects').AllowEffects} permission Explicit command permission.
 * @param {{ submitNewStory: (...args: any[]) => any }} deps Route dependencies.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handleSubmitNewStory(permission, deps, request) {
  const response = await deps.submitNewStory(permission, request);
  return response;
}

/**
 * Run the submit-new-page route handler.
 * @param {import('../../../../types/allow-effects').AllowEffects} permission Explicit command permission.
 * @param {{ submitNewPage: (...args: any[]) => any }} deps Route dependencies.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handleSubmitNewPage(permission, deps, request) {
  return deps.submitNewPage(permission, request);
}

/**
 * Run the API key credit route handler.
 * @param {{ getApiKeyCreditV2: (...args: any[]) => any }} deps Route dependencies.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handleGetApiKeyCreditV2(deps, request) {
  return deps.getApiKeyCreditV2(request);
}

/**
 * Extract the bearer token from a request.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {string | null} Bearer token or null.
 */
function extractBearerToken(request) {
  const header = getAuthorizationHeader(request);
  if (typeof header !== 'string') {
    return null;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return match[1];
}

/**
 * Read the requested author uuid from the existing document data.
 * @param {Record<string, unknown> | undefined} data Document data.
 * @returns {string | null} Cached author uuid or null.
 */
function readAuthorUuid(data) {
  if (typeof data?.uuid === 'string' && data.uuid) {
    return data.uuid;
  }

  return null;
}

/**
 * Read unknown persisted data as a record.
 * @param {unknown} data Candidate document data.
 * @returns {Record<string, unknown>} Object data.
 */
function readRecord(data) {
  return data && typeof data === 'object'
    ? /** @type {Record<string, unknown>} */ (data)
    : {};
}

/**
 * Read a uid from a decoded token payload.
 * @param {{ uid?: string | null }} decoded Decoded token payload.
 * @returns {string | null} Verified uid or null.
 */
function readVerifiedUid(decoded) {
  return decoded.uid ?? null;
}

/**
 * Resolve or create the simulator author uuid.
 * @param {{ db: ReturnType<typeof createDb>, verifyIdToken: (token: string) => Promise<{ uid?: string | null }>, randomUUID: () => string }} deps Simulator dependencies.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function resolveAuthorUuidInSimulator(deps, request) {
  const bearer = extractBearerToken(request);
  if (!bearer) {
    return { status: 401, body: 'Invalid or expired token' };
  }

  const decoded = await deps.verifyIdToken(bearer);
  const uid = readVerifiedUid(decoded);
  if (!uid) return { status: 401, body: 'Invalid or expired token' };

  const authorRef = deps.db.collection('authors').doc(uid);
  const snap = await authorRef.get();
  const cachedUuid = readAuthorUuid(readRecord(snap.data()));
  if (cachedUuid) {
    return { status: 200, body: { uuid: cachedUuid } };
  }

  const uuid = deps.randomUUID();
  await authorRef.set({ uuid }, { merge: true });
  return { status: 200, body: { uuid } };
}

/**
 * Run the author uuid route handler.
 * @param {{ db: ReturnType<typeof createDb>, verifyIdToken: (token: string) => Promise<{ uid?: string | null }>, randomUUID: () => string }} deps Route dependencies.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handleGetAuthorUuid(deps, request) {
  return resolveAuthorUuidInSimulator(deps, request);
}

/**
 * Run the payment webhook route handler.
 * @param {{ paymentWebhook: (...args: any[]) => any, bindEffectBoundary: import('../../../../types/allow-effects').AllowEffectsBoundary }} deps Route dependencies.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handlePaymentWebhook(deps, request) {
  return deps.bindEffectBoundary(permission =>
    deps.paymentWebhook(permission, request)
  );
}

/**
 * Run the get-moderation-variant route handler.
 * @param {{ db: ReturnType<typeof createDb> }} deps Route dependencies.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handleGetModerationVariant(deps, request) {
  const uid = resolveUid(request);
  if (!uid) {
    return { status: 401, body: 'Invalid or expired token' };
  }

  const moderatorSnap = await deps.db.collection('moderators').doc(uid).get();
  const variantPath = readRecord(moderatorSnap.data()).variant;
  if (typeof variantPath !== 'string' || !variantPath) {
    return { status: 404, body: 'Variant not found' };
  }

  const variantSnap = await deps.db.doc(variantPath).get();
  if (!variantSnap.exists) {
    return { status: 404, body: 'Variant not found' };
  }

  return buildModerationVariantResponse(
    /** @type {SimulatorModerationVariantSnapshot} */ (
      /** @type {unknown} */ (variantSnap)
    )
  );
}

/**
 * Run the assign-moderation-job route handler.
 * @param {{ db: ReturnType<typeof createDb> }} deps Route dependencies.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handleAssignModerationJob(deps, request) {
  const uid = resolveUid(request);
  if (!uid) {
    return { status: 401, body: 'Invalid or expired token' };
  }

  const current = await deps.db.collection('moderators').doc(uid).get();
  const currentPathValue = readRecord(current.data()).variant;
  const currentPath =
    typeof currentPathValue === 'string' ? currentPathValue : undefined;

  const chosen = await pickNextModerationVariant(deps.db, currentPath);

  if (!chosen) {
    return { status: 404, body: 'Variant not found' };
  }

  await deps.db.collection('moderators').doc(uid).set(
    {
      variant: chosen.ref.path,
      createdAt: new Date(),
    },
    { merge: true }
  );

  return { status: 201, body: { ok: true } };
}

/**
 * Pick the next moderation variant using the same nested collection walk as the cloud core.
 * @param {ReturnType<typeof createDb>} db Firestore-like database.
 * @param {string | undefined} currentPath Current moderator assignment path.
 * @returns {Promise<{ ref: { path: string } } | null>} Selected variant snapshot.
 */
export async function pickNextModerationVariant(db, currentPath) {
  if (typeof db.collection !== 'function') {
    return pickNextModerationVariantFromCollectionGroup(db, currentPath);
  }

  const candidates = await collectModerationVariantCandidates(db, currentPath);
  return candidates[0]?.doc ?? null;
}

/**
 * Pick a moderation variant from the collection-group fallback path.
 * @param {ReturnType<typeof createDb>} db Firestore-like database.
 * @param {string | undefined} currentPath Current moderator assignment path.
 * @returns {Promise<{ ref: { path: string } } | null>} Selected variant snapshot.
 */
async function pickNextModerationVariantFromCollectionGroup(db, currentPath) {
  const candidates = await db
    .collectionGroup('variants')
    .where('moderatorReputationSum', '==', 0)
    .get();
  const fallbacks = await db
    .collectionGroup('variants')
    .where('moderatorReputationSum', '==', null)
    .get();
  const all = [...candidates.docs, ...fallbacks.docs];
  return all.find(doc => doc.ref.path !== currentPath) ?? null;
}

/**
 * Collect eligible moderation variants from the nested story/page tree.
 * @param {ReturnType<typeof createDb>} db Firestore-like database.
 * @param {string | undefined} currentPath Current moderator assignment path.
 * @returns {Promise<Array<{ doc: { ref: { path: string }, data?: () => unknown }, createdAt: number, rand: number, path: string }>>} Candidate variants.
 */
async function collectModerationVariantCandidates(db, currentPath) {
  const storiesSnap = await db.collection('stories').get();
  /** @type {ModerationCandidate[]} */
  const candidates = [];

  for (const storyDoc of storiesSnap.docs) {
    const pagesSnap = await storyDoc.ref.collection('pages').get();
    await collectPageVariantCandidates(pagesSnap.docs, currentPath, candidates);
  }

  candidates.sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return left.createdAt - right.createdAt;
    }
    if (left.rand !== right.rand) {
      return left.rand - right.rand;
    }
    return left.path.localeCompare(right.path);
  });

  return candidates;
}

/**
 * Add eligible variants from a page collection into the candidate list.
 * @param {Array<{ ref: { collection: (name: string) => { get: () => Promise<{ docs: Array<{ref: {path: string}, data?: () => unknown}> }> } } }>} pageDocs Page documents.
 * @param {string | undefined} currentPath Current moderator assignment path.
 * @param {ModerationCandidate[]} candidates Candidate list.
 * @returns {Promise<void>} Resolves after the page variants are scanned.
 */
async function collectPageVariantCandidates(pageDocs, currentPath, candidates) {
  for (const pageDoc of pageDocs) {
    const variantsSnap = await pageDoc.ref.collection('variants').get();
    for (const variantDoc of variantsSnap.docs) {
      const candidate = buildModerationVariantCandidate(
        variantDoc,
        currentPath
      );
      if (candidate) {
        candidates.push(candidate);
      }
    }
  }
}

/**
 * Build a sortable moderation variant candidate when the variant is eligible.
 * @param {{ ref: { path: string }, data?: () => unknown }} variantDoc Variant document.
 * @param {string | undefined} currentPath Current moderator assignment path.
 * @returns {{ doc: { ref: { path: string }, data?: () => unknown }, createdAt: number, rand: number, path: string } | null} Candidate or null.
 */
function buildModerationVariantCandidate(variantDoc, currentPath) {
  const data = readRecord(variantDoc.data?.());
  if (!isEligibleModerationVariant(data, variantDoc.ref.path, currentPath)) {
    return null;
  }

  return createModerationVariantCandidate(variantDoc, data);
}

/**
 * Check whether a variant is eligible for moderation selection.
 * @param {Record<string, unknown>} data Variant data.
 * @param {string} path Variant document path.
 * @param {string | undefined} currentPath Current moderator assignment path.
 * @returns {boolean} True when the variant is eligible.
 */
function isEligibleModerationVariant(data, path, currentPath) {
  const reputation = data.moderatorReputationSum;
  if (reputation !== 0 && reputation !== null) {
    return false;
  }

  if (path === currentPath) {
    return false;
  }

  return true;
}

/**
 * Create a sortable moderation candidate entry.
 * @param {{ ref: { path: string }, data?: () => unknown }} variantDoc Variant document.
 * @param {Record<string, unknown>} data Variant data.
 * @returns {{ doc: { ref: { path: string }, data?: () => unknown }, createdAt: number, rand: number, path: string }} Candidate entry.
 */
function createModerationVariantCandidate(variantDoc, data) {
  return {
    doc: variantDoc,
    createdAt:
      typeof data.createdAt === 'object' &&
      data.createdAt !== null &&
      'toMillis' in data.createdAt &&
      typeof data.createdAt.toMillis === 'function'
        ? data.createdAt.toMillis()
        : 0,
    rand: typeof data.rand === 'number' ? data.rand : 0,
    path: variantDoc.ref.path,
  };
}

/**
 * Run the submit-moderation-rating route handler.
 * @param {{ db: ReturnType<typeof createDb>, fieldValue: { delete: () => unknown } }} deps Route dependencies.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handleSubmitModerationRating(deps, request) {
  const uid = resolveUid(request);
  if (!uid) {
    return { status: 401, body: 'Invalid or expired token' };
  }

  const approval = parseApprovalFlag(
    request?.body && typeof request.body === 'object'
      ? /** @type {{isApproved?: unknown}} */ (request.body)
      : undefined
  );
  if (approval === null) {
    return { status: 400, body: 'Missing or invalid isApproved' };
  }

  const moderatorSnap = await deps.db.collection('moderators').doc(uid).get();
  const variantPath = readRecord(moderatorSnap.data()).variant;
  if (typeof variantPath !== 'string' || !variantPath) {
    return { status: 404, body: 'Variant not found' };
  }

  const variantRef = deps.db.doc(variantPath);
  const variantSnap = await variantRef.get();
  const { currentScore, currentCount } = resolveModerationTotals(
    readRecord(variantSnap.data())
  );
  let scoreDelta = -1;
  if (approval) {
    scoreDelta = 1;
  }
  await variantRef.update({
    moderatorReputationSum: currentScore + scoreDelta,
    moderationRatingCount: currentCount + 1,
  });

  await deps.db.collection('moderators').doc(uid).update({
    variant: deps.fieldValue.delete(),
  });

  return { status: 200, body: { ok: true } };
}

/**
 * Re-run content rendering for all known stories.
 * @param {{ db: ReturnType<typeof createDb>, renderContents: (...args: any[]) => any }} deps Route dependencies.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handleTriggerRenderContents(deps) {
  const storiesSnap = await deps.db.collection('stories').get();
  for (const storyDoc of storiesSnap.docs) {
    await deps.renderContents(storyDoc, { params: { storyId: storyDoc.id } });
  }
  return { status: 200, body: { ok: true } };
}

/**
 * Run the mark-variant-dirty route handler.
 * @param {{ db: ReturnType<typeof createDb> }} deps Route dependencies.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handleMarkVariantDirty(deps, request) {
  const body = readRecord(request?.body);
  const pageNumber = Number(body.pageNumber);
  const variantName = String(body.variantName || '');
  if (!Number.isInteger(pageNumber) || !variantName) {
    return { status: 400, body: 'Missing pageNumber or variantName' };
  }

  const pageSnap = await deps.db
    .collectionGroup('pages')
    .where('number', '==', pageNumber)
    .limit(1)
    .get();
  if (pageSnap.empty) {
    return { status: 404, body: 'Page not found' };
  }

  const variantSnap = await pageSnap.docs[0].ref
    .collection('variants')
    .where('name', '==', variantName)
    .limit(1)
    .get();
  if (variantSnap.empty) {
    return { status: 404, body: 'Variant not found' };
  }

  await variantSnap.docs[0].ref.update({ dirty: true });
  return { status: 200, body: { ok: true } };
}

/**
 * Run stats generation for the seeded fixture.
 * @param {{ generateStatsCore: { generate: (...args: any[]) => any } }} deps Route dependencies.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function handleGenerateStats(deps) {
  await deps.generateStatsCore.generate();
  return { status: 200, body: { ok: true } };
}

/**
 * Resolve the authenticated user id from a request.
 * @param {SimulatorRequest} request Incoming request object.
 * @returns {string | null} Authenticated user id or null.
 */
function resolveUid(request) {
  const header = getAuthorizationHeader(request);
  if (!header) {
    return null;
  }

  return ADMIN_UID;
}

/**
 * Create a local fetch stub for the simulator.
 * @returns {(input: string, init?: object) => Promise<{ ok: boolean, status: number, json: () => Promise<{ access_token: string }>, text: () => Promise<string> }>} Fetch stub.
 */
function createLocalFetchStub() {
  return async (input, init) => {
    void input;
    void init;
    return {
      ok: true,
      status: 200,
      json: async () => {
        const payload = {};
        Object.defineProperty(payload, 'access_token', {
          value: 'local-access-token',
          enumerable: true,
        });
        return payload;
      },
      text: async () => '',
    };
  };
}

/**
 * Create a local random source without calling Math.random directly.
 * @returns {() => number} Random number generator.
 */
function createRandomSource() {
  return () => {
    const sample = randomUUID().replace(/-/g, '').slice(0, 8);
    const value = Number.parseInt(sample, 16);
    return value / 0xffffffff;
  };
}

/**
 * Build a fake auth result from a token presence check.
 * @param {string | undefined} token Token value.
 * @param {boolean} includeToken Whether to include the token in the response.
 * @returns {{ uid: string | null, token?: string }} Auth result.
 */
function createAuthResult(token, includeToken) {
  if (!token) {
    return { uid: null };
  }

  if (includeToken) {
    return { uid: ADMIN_UID, token };
  }

  return { uid: ADMIN_UID };
}

/**
 * Load moderation options for the simulator response.
 * @param {{ collection: (name: string) => { get: () => Promise<{ docs: Array<{ data: () => { content?: string, position?: number, targetPage?: { path?: string } } }> }> } }} variantRef Variant reference.
 * @returns {Promise<Array<{ content: string | undefined, targetPageNumber: number | undefined }>>} Options.
 */
async function loadModerationOptions(variantRef) {
  const optionsSnap = await variantRef.collection('options').get();
  const getOptionPosition = (
    /** @type {{data: () => {position?: number}}} */ option
  ) => option.data().position ?? 0;
  return optionsSnap.docs
    .slice()
    .sort((left, right) => getOptionPosition(left) - getOptionPosition(right))
    .map(doc => ({
      content: doc.data().content,
      targetPageNumber: getTargetPageNumber(doc.data().targetPage),
    }));
}

/**
 * Check whether a trigger should receive a record.
 * @param {{ pathPattern: string, eventName: 'onCreate' | 'onWrite' }} trigger Trigger definition.
 * @param {string} pathValue Record path.
 * @param {boolean} isCreate Whether the record is a create event.
 * @param {boolean} isWrite Whether the record is a write event.
 * @returns {boolean} Whether the trigger should run.
 */
function shouldDispatchTrigger(trigger, pathValue, isCreate, isWrite) {
  if (!pathMatchesTrigger(trigger.pathPattern, pathValue)) {
    return false;
  }

  if (trigger.eventName === 'onCreate' && !isCreate) {
    return false;
  }

  if (trigger.eventName === 'onWrite' && !isWrite) {
    return false;
  }

  return true;
}

/**
 * Check whether a path matches a trigger pattern.
 * @param {string} pathPattern Trigger pattern.
 * @param {string} pathValue Actual path.
 * @returns {boolean} Whether the path matches.
 */
function pathMatchesTrigger(pathPattern, pathValue) {
  const patternSegments = String(pathPattern)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .split('/');
  const pathSegments = String(pathValue)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .split('/');
  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];
    if (patternSegment.startsWith('{') && patternSegment.endsWith('}')) {
      continue;
    }

    if (patternSegment !== pathSegment) {
      return false;
    }
  }

  return true;
}

/**
 * Dispatch a prepared snapshot pair to a trigger.
 * @param {{ eventName: 'onCreate' | 'onWrite', handler: (snapshot: unknown, context: { params: Record<string, string> }) => Promise<void> }} trigger Trigger definition.
 * @param {{ before: unknown, after: unknown }} snapshots Snapshot pair.
 * @param {{ params: Record<string, string> }} context Trigger context.
 * @returns {Promise<void>} Nothing.
 */
async function dispatchTrigger(trigger, snapshots, context) {
  if (trigger.eventName === 'onCreate') {
    await trigger.handler(snapshots.after, context);
    return;
  }

  await trigger.handler(
    {
      before: snapshots.before,
      after: snapshots.after,
    },
    context
  );
}

/**
 * Build the moderation-variant response.
 * @param {SimulatorModerationVariantSnapshot} variantSnap Variant snapshot.
 * @returns {Promise<{ status: number, body?: unknown }>} Route response.
 */
async function buildModerationVariantResponse(variantSnap) {
  const variantData = variantSnap.data();
  const pageRef = variantSnap.ref.parent.parent;
  const pageSnap = await pageRef.get();
  const storyRef = pageRef.parent.parent;
  const storySnap = await storyRef.get();
  const options = await loadModerationOptions(variantSnap.ref);

  return {
    status: 200,
    body: {
      title: storySnap.data()?.title ?? storySnap.id,
      author: variantData.authorName ?? variantData.author ?? '',
      content: variantData.content ?? '',
      options,
      pageNumber: pageSnap.data()?.number,
    },
  };
}

/**
 * Parse an option lookup input.
 * @param {unknown} option Option descriptor.
 * @returns {{ pageNumber: number, variantName: string, optionNumber: number } | null} Parsed option or null.
 */
function parseOptionLookup(option) {
  if (!option || typeof option !== 'object') {
    return null;
  }

  const typed =
    /** @type {{ pageNumber?: number, variantName?: string, optionNumber?: number }} */ (
      option
    );
  if (!Number.isInteger(typed.pageNumber)) {
    return null;
  }
  if (typeof typed.variantName !== 'string') {
    return null;
  }
  if (!Number.isInteger(typed.optionNumber)) {
    return null;
  }

  return {
    pageNumber: /** @type {number} */ (typed.pageNumber),
    variantName: typed.variantName,
    optionNumber: /** @type {number} */ (typed.optionNumber),
  };
}

/**
 * Parse moderation approval input.
 * @param {{ isApproved?: unknown } | undefined} body Request body.
 * @returns {boolean | null} Approval flag or null when invalid.
 */
function parseApprovalFlag(body) {
  const rawApproved = body?.isApproved;
  if (
    rawApproved !== true &&
    rawApproved !== false &&
    rawApproved !== 'true' &&
    rawApproved !== 'false'
  ) {
    return null;
  }

  return rawApproved === true || rawApproved === 'true';
}

/**
 * Resolve moderation score/count totals from variant data.
 * @param {{ moderatorReputationSum?: unknown, moderationRatingCount?: unknown } | undefined} data Variant data.
 * @returns {{ currentScore: number, currentCount: number }} Normalized totals.
 */
function resolveModerationTotals(data) {
  let currentScore = 0;
  if (typeof data?.moderatorReputationSum === 'number') {
    currentScore = data.moderatorReputationSum;
  }

  let currentCount = 0;
  if (typeof data?.moderationRatingCount === 'number') {
    currentCount = data.moderationRatingCount;
  }
  return {
    currentScore,
    currentCount,
  };
}

/**
 * Resolve a target page number from a page reference-like object.
 * @param {{ path?: string } | null | undefined} targetPage Target page reference.
 * @returns {number | undefined} Target page number when available.
 */
function getTargetPageNumber(targetPage) {
  if (!targetPage || typeof targetPage.path !== 'string') {
    return undefined;
  }

  const match = targetPage.path.match(/\/pages\/(\d+)$/);
  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}
// Stryker restore all
